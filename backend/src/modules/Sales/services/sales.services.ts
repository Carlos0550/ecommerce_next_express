import { prisma } from "@/config/prisma";
import type { SaleRequest } from "./schemas/sales.schemas";
import { sendEmail } from "@/config/resend";
import { sale_email_html } from "@/templates/sale_email";
import dayjs, { DEFAULT_TZ, nowTz } from "@/config/dayjs";
import BusinessServices from "@/modules/Business/business.services";
import { getActivePalette } from "@/utils/getActivePalette";
import { logger } from "@/utils/logger";
import { decrementStock } from "@/utils/stock";
class SalesServices {
  async saveSale(request: SaleRequest) {
    const { payment_method, source, product_ids, user_sale, items } = request;
    const { user_id } = user_sale || {};
    try {
      const isManual = !!request.loadedManually;
      const manualItems = Array.isArray(request.manualProducts)
        ? request.manualProducts
        : [];
      let product_data: {
        id: string;
        title: string;
        price: number;
        quantity: number;
        options?: any;
      }[] = [];
      let subtotal = 0;
      if (!isManual) {
        const incoming =
          Array.isArray(items) && items.length > 0
            ? items.map((it) => ({
                id: String(it.product_id),
                quantity: Math.max(1, Number(it.quantity) || 1),
                options: (it as any).options,
              }))
            : Array.from(product_ids || []).map((id) => ({
                id: String(id),
                quantity: 1,
                options: [],
              }));
        const uniqueIds = Array.from(new Set(incoming.map((i) => i.id)));
        const found = (await prisma.products.findMany({
          where: { id: { in: uniqueIds } },
        })) as any;
        const byId = new Map(found.map((p: any) => [p.id, p]));
        product_data = incoming.map((i) => {
          const p = byId.get(i.id);
          if (!p) throw new Error(`Product not found: ${i.id}`);
          return {
            id: (p as any).id,
            title: `${(p as any).title}`,
            price: Number((p as any).price) * i.quantity,
            quantity: i.quantity,
            options: i.options,
          };
        });
        subtotal = product_data.reduce(
          (acc, product) => acc + Number(product.price),
          0,
        );
      } else {
        subtotal = manualItems.reduce(
          (acc, item) => acc + Number(item.quantity) * Number(item.price),
          0,
        );
        product_data = manualItems.map((mi) => ({
          id: "",
          title: mi.title,
          price: Number(mi.quantity) * Number(mi.price),
          quantity: Number(mi.quantity),
          options: (mi as any).options,
        }));
      }
      const parsedUserId = user_id !== undefined ? Number(user_id) : undefined;
      const primaryPaymentMethod =
        (request.payment_methods?.[0]?.method) ||
        payment_method;
      const paymentBreakdown = Array.isArray(request.payment_methods)
        ? request.payment_methods
        : [];
      const taxPercent = Number(request.tax) || 0;
      const taxAmount = subtotal * (taxPercent / 100);
      const finalTotal = subtotal + taxAmount;
      const now = nowTz();
      const saleDateStr = (request as any)?.sale_date as string | undefined;
      const createdAtOverride = saleDateStr
        ? dayjs
            .tz(saleDateStr, "YYYY-MM-DD", DEFAULT_TZ)
            .hour(now.hour())
            .minute(now.minute())
            .second(now.second())
            .millisecond(now.millisecond())
            .toDate()
        : now.toDate();
      let userToConnect = undefined;
      if (parsedUserId && Number.isInteger(parsedUserId)) {
        const userExists = await prisma.user.findUnique({
          where: { id: parsedUserId },
        });
        if (userExists) {
          userToConnect = { connect: { id: parsedUserId } };
        }
      }
      const shouldDecrementStock = !isManual && !request.skipStockDecrement;
      const stockCounts = new Map<string, number>();
      if (shouldDecrementStock) {
        if (Array.isArray(items) && items.length > 0) {
          items.forEach((i) =>
            stockCounts.set(
              String(i.product_id),
              (stockCounts.get(String(i.product_id)) || 0) +
                Math.max(1, Number(i.quantity) || 1),
            ),
          );
        } else {
          (product_ids || []).forEach((id) =>
            stockCounts.set(String(id), (stockCounts.get(String(id)) || 0) + 1),
          );
        }
      }
      const sale = await prisma.$transaction(async (tx) => {
        const created = await tx.sales.create({
          data: {
            payment_method: primaryPaymentMethod,
            source,
            user: userToConnect,
            total: Number(finalTotal),
            tax: taxPercent,
            ...(createdAtOverride ? { created_at: createdAtOverride } : {}),
            products: !isManual
              ? {
                  connect: Array.from(
                    new Set(product_data.map((p) => p.id).filter(Boolean)),
                  ).map((id) => ({ id })),
                }
              : undefined,
            manualProducts: isManual ? (manualItems as any) : undefined,
            loadedManually: isManual,
            paymentMethods: paymentBreakdown as any,
            items: product_data as any,
          },
        });
        if (shouldDecrementStock && stockCounts.size > 0) {
          await decrementStock(
            tx,
            Array.from(stockCounts.entries()).map(([id, quantity]) => ({ id, quantity })),
          );
        }
        return created;
      });
      setImmediate(() => {
        void (async () => {
        try {
          const user = parsedUserId
            ? await prisma.user.findUnique({ where: { id: parsedUserId } })
            : null;
          const business = await BusinessServices.getBusiness();
          const palette = await getActivePalette();
          const html = sale_email_html({
            source,
            payment_method: primaryPaymentMethod,
            products: product_data.map((p) => {
              const optionsStr = Array.isArray(p.options)
                ? p.options
                    .map((o: any) => `${o.name}: ${o.value || o.values}`)
                    .join(", ")
                : "";
              const title = `${p.title} x${p.quantity}${optionsStr ? ` (${optionsStr})` : ""}`;
              return { title, price: Number(p.price) };
            }),
            subtotal,
            taxPercent,
            finalTotal,
            saleId: (sale as any)?.id ?? undefined,
            saleDate:
              (createdAtOverride) ||
              ((sale as any)?.created_at as Date) ||
              new Date(),
            buyerName: user?.name ?? undefined,
            buyerEmail: user?.email ?? undefined,
            business: business,
            palette: palette as any,
          });
          const admins: any[] = await prisma.user.findMany({
            where: { role: "ADMIN", is_active: true },
            select: { email: true },
          });
          const adminEmails = admins
            .map((u: { email: string }) => u.email)
            .filter((e: string): e is string => !!e);
          const configuredRecipient = process.env.SALES_EMAIL_TO;
          const toRecipients =
            adminEmails.length > 0
              ? adminEmails
              : configuredRecipient
                ? configuredRecipient
                : process.env.RESEND_FROM || "";
          if (
            Array.isArray(toRecipients)
              ? toRecipients.length > 0
              : !!toRecipients
          ) {
            await sendEmail({
              to: toRecipients as any,
              subject: "Nueva venta realizada",
              text: `Nueva venta realizada - ${product_data.length} productos - Total: ${finalTotal}`,
              html,
            });
          } else {
            console.warn("No recipient configured for sale email");
          }
        } catch (err) {
          logger.error("Error sending sale email", { err });
        }
        })();
      });
      return (sale as any)?.id || true;
    } catch (error) {
      const error_msg = error instanceof Error ? error.message : String(error);
      logger.error("sales_service_error", { error });
      return {
        success: false,
        message: error_msg,
      };
    }
  }
  async updateSale(id: string, request: SaleRequest) {
    try {
      const existing = await prisma.sales.findUnique({
        where: { id },
        include: { products: true, user: true },
      });
      if (!existing) return { success: false, message: "sale_not_found" };
      const isManual = !!request.loadedManually;
      const manualItems = Array.isArray(request.manualProducts)
        ? request.manualProducts
        : [];
      let subtotal = 0;
      let connectProductIds: string[] = [];
      if (!isManual) {
        const incoming =
          Array.isArray(request.items) && request.items.length > 0
            ? request.items.map((it) => ({
                id: String(it.product_id),
                quantity: Math.max(1, Number(it.quantity) || 1),
              }))
            : Array.from(request.product_ids || []).map((id) => ({
                id: String(id),
                quantity: 1,
              }));
        const uniqueIds = Array.from(new Set(incoming.map((i) => i.id)));
        const found = (await prisma.products.findMany({
          where: { id: { in: uniqueIds } },
        })) as any;
        const byId = new Map(found.map((p: any) => [p.id, p]));
        subtotal = incoming.reduce((acc, i) => {
          const p = byId.get(i.id);
          if (!p) return acc;
          return acc + Number((p as any).price) * i.quantity;
        }, 0);
        connectProductIds = uniqueIds;
      } else {
        subtotal = manualItems.reduce(
          (acc, item) => acc + Number(item.quantity) * Number(item.price),
          0,
        );
      }
      const taxPercent = Number(request.tax) || 0;
      const taxAmount = subtotal * (taxPercent / 100);
      const finalTotal = subtotal + taxAmount;
      const primaryPaymentMethod =
        (request.payment_methods?.[0]?.method) ||
        request.payment_method ||
        (existing.payment_method as any);
      const paymentBreakdown = Array.isArray(request.payment_methods)
        ? request.payment_methods
        : [];
      const now = nowTz();
      const saleDateStr = (request as any)?.sale_date as string | undefined;
      const createdAtOverride = saleDateStr
        ? dayjs
            .tz(saleDateStr, "YYYY-MM-DD", DEFAULT_TZ)
            .hour(now.hour())
            .minute(now.minute())
            .second(now.second())
            .millisecond(now.millisecond())
            .toDate()
        : now.toDate();
      const updated = await prisma.sales.update({
        where: { id },
        data: {
          payment_method: primaryPaymentMethod as any,
          source: request.source || (existing.source as any),
          tax: taxPercent,
          total: Number(finalTotal),
          ...(createdAtOverride ? { created_at: createdAtOverride } : {}),
          loadedManually: isManual,
          manualProducts: isManual ? (manualItems as any) : undefined,
          paymentMethods: paymentBreakdown as any,
          products: !isManual
            ? { set: connectProductIds.map((pid) => ({ id: pid })) }
            : { set: [] },
        },
        include: { products: true, user: true },
      });
      return { success: true, sale: updated };
    } catch (error) {
      const error_msg = error instanceof Error ? error.message : String(error);
      logger.error("sales_service_error", { error });
      return { success: false, message: error_msg };
    }
  }
  async deleteSale(id: string) {
    try {
      const existing = await prisma.sales.findUnique({ where: { id } });
      if (!existing) return { success: false, message: "sale_not_found" };
      await prisma.orders.updateMany({ where: { saleId: id }, data: { saleId: null } });
      await prisma.sales.delete({ where: { id } });
      return { success: true };
    } catch (error) {
      const error_msg = error instanceof Error ? error.message : String(error);
      logger.error("sales_service_error", { error });
      return { success: false, message: error_msg };
    }
  }
  async getSales({
    page = 1,
    per_page = 5,
    start_date,
    end_date,
    pending = false,
  }: {
    page?: number;
    per_page?: number;
    start_date?: string;
    end_date?: string;
    pending?: boolean;
  }) {
    try {
      const take = Math.max(1, Number(per_page) || 5);
      const currentPage = Math.max(1, Number(page) || 1);
      const skip = (currentPage - 1) * take;
      const defaultEnd = nowTz();
      const defaultStart = defaultEnd.startOf("day");
      const parseDateTz = (value?: string, endOfDay = false) => {
        if (!value) return undefined;
        const parsed = dayjs.tz(value, "YYYY-MM-DD", DEFAULT_TZ);
        if (!parsed.isValid()) return undefined;
        return endOfDay ? parsed.endOf("day") : parsed.startOf("day");
      };
      const start = parseDateTz(start_date) || defaultStart;
      const end = parseDateTz(end_date, true) || defaultEnd.endOf("day");
      const where: any = {
        created_at: {
          gte: start.toDate(),
          lte: end.toDate(),
        },
      };
      if (pending) {
        where.source = "WEB" as any;
      }
      const [total, sales, totalSalesByDate] = await Promise.all([
        prisma.sales.count({ where }),
        prisma.sales.findMany({
          skip,
          take,
          where,
          include: {
            products: true,
            user: true,
            orders: true,
          },
          orderBy: { created_at: "desc" },
        }),
        prisma.sales.aggregate({
          where,
          _sum: {
            total: true,
          },
        }),
      ]);
      const totalPages = Math.ceil(total / take) || 1;
      const pagination = {
        total,
        page: currentPage,
        limit: take,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
        start_date: start.format("YYYY-MM-DD"),
        end_date: end.format("YYYY-MM-DD"),
      };
      const parsed_totalSalesByDate = totalSalesByDate._sum.total || 0;
      return { sales, pagination, totalSalesByDate: parsed_totalSalesByDate };
    } catch (error) {
      const error_msg = error instanceof Error ? error.message : String(error);
      logger.error("sales_service_error", { error });
      return {
        success: false,
        message: error_msg,
      };
    }
  }
  async getSalesAnalytics({
    start_date,
    end_date,
  }: {
    start_date?: string;
    end_date?: string;
  }) {
    try {
      const defaultEnd = nowTz();
      const defaultStart = defaultEnd.subtract(30, "day");
      const parseDate = (value?: string, endOfDay = false) => {
        if (!value) return undefined;
        const parsed = dayjs.tz(value, "YYYY-MM-DD", DEFAULT_TZ);
        if (!parsed.isValid()) return undefined;
        return endOfDay ? parsed.endOf("day") : parsed.startOf("day");
      };
      const start = parseDate(start_date) || defaultStart.startOf("day");
      const end = parseDate(end_date, true) || defaultEnd.endOf("day");
      const rangeDays = end.diff(start, "day") + 1;
      const prevEnd = start.subtract(1, "day").endOf("day");
      const prevStart = prevEnd.subtract(rangeDays - 1, "day").startOf("day");
      const [currentSales, previousSales, allCategories] = await Promise.all([
        prisma.sales.findMany({
          where: {
            created_at: {
              gte: start.toDate(),
              lte: end.toDate(),
            },
          },
          select: {
            id: true,
            total: true,
            tax: true,
            payment_method: true,
            source: true,
            created_at: true,
            items: true,
            manualProducts: true,
            loadedManually: true,
            products: {
              select: {
                id: true,
                title: true,
                categoryId: true,
                category: {
                  select: {
                    id: true,
                    title: true,
                  },
                },
              },
            },
          },
          orderBy: [{ created_at: "asc" } as any],
        }),
        prisma.sales.findMany({
          where: {
            created_at: {
              gte: prevStart.toDate(),
              lte: prevEnd.toDate(),
            },
          },
          select: { id: true, total: true, tax: true, items: true },
        }),
        prisma.categories.findMany({
          where: { status: "active" },
          select: { id: true, title: true },
        }),
      ]);
      const salesCount = currentSales.length;
      const revenueTotal = currentSales.reduce(
        (acc: number, s) => acc + Number(s.total || 0),
        0,
      );
      const avgOrderValue = salesCount > 0 ? revenueTotal / salesCount : 0;
      let totalUnitsSold = 0;
      let totalTaxCollected = 0;
      const productSalesMap: Record<
        string,
        {
          product_id: string;
          title: string;
          quantity_sold: number;
          revenue: number;
        }
      > = {};
      const categoryMap: Record<
        string,
        { category_id: string; name: string; count: number; revenue: number }
      > = {};
      const hourMap: Record<
        number,
        { hour: number; count: number; revenue: number }
      > = {};
      for (let h = 0; h < 24; h++) {
        hourMap[h] = { hour: h, count: 0, revenue: 0 };
      }
      allCategories.forEach((cat) => {
        categoryMap[cat.id] = {
          category_id: cat.id,
          name: cat.title,
          count: 0,
          revenue: 0,
        };
      });
      categoryMap.sin_categoria = {
        category_id: "sin_categoria",
        name: "Sin categoría",
        count: 0,
        revenue: 0,
      };
      currentSales.forEach((sale) => {
        const taxPercent = Number(sale.tax) || 0;
        const saleTotal = Number(sale.total) || 0;
        if (taxPercent > 0) {
          const taxAmount = saleTotal - saleTotal / (1 + taxPercent / 100);
          totalTaxCollected += taxAmount;
        }
        const hour = dayjs.tz(sale.created_at).hour();
        const bucket = hourMap[hour];
        if (bucket) {
          bucket.count += 1;
          bucket.revenue += saleTotal;
        }
        const items = (sale.items as any[]) || [];
        items.forEach((item: any) => {
          const qty = Number(item.quantity) || 1;
          totalUnitsSold += qty;
          const productId = item.id || "manual";
          const title = item.title || "Producto";
          const itemRevenue = Number(item.price) || 0;
          if (!productSalesMap[productId]) {
            productSalesMap[productId] = {
              product_id: productId,
              title,
              quantity_sold: 0,
              revenue: 0,
            };
          }
          productSalesMap[productId].quantity_sold += qty;
          productSalesMap[productId].revenue += itemRevenue;
        });
        sale.products.forEach((prod) => {
          const catId = prod.categoryId || "sin_categoria";
          if (categoryMap[catId]) {
            categoryMap[catId].count += 1;
          }
        });
        if (sale.loadedManually) {
          const unc = categoryMap.sin_categoria;
          if (unc) unc.count += items.length;
        }
      });
      Object.keys(categoryMap).forEach((catId) => {
        const catSales = currentSales.filter(
          (s) =>
            s.products.some(
              (p) => (p.categoryId || "sin_categoria") === catId,
            ) ||
            (catId === "sin_categoria" && s.loadedManually),
        );
        const cat = categoryMap[catId];
        if (cat) {
          cat.revenue = catSales.reduce(
            (acc, s) => acc + Number(s.total || 0),
            0,
          );
        }
      });
      const prevCount = previousSales.length;
      const prevRevenue = previousSales.reduce(
        (acc: number, s) => acc + Number(s.total || 0),
        0,
      );
      let prevUnitsSold = 0;
      previousSales.forEach((sale) => {
        const items = (sale.items as any[]) || [];
        items.forEach((item: any) => {
          prevUnitsSold += Number(item.quantity) || 1;
        });
      });
      const growthPercentRevenue =
        prevRevenue > 0
          ? ((revenueTotal - prevRevenue) / prevRevenue) * 100
          : revenueTotal > 0
            ? 100
            : 0;
      const growthPercentCount =
        prevCount > 0
          ? ((salesCount - prevCount) / prevCount) * 100
          : salesCount > 0
            ? 100
            : 0;
      const growthPercentUnits =
        prevUnitsSold > 0
          ? ((totalUnitsSold - prevUnitsSold) / prevUnitsSold) * 100
          : totalUnitsSold > 0
            ? 100
            : 0;
      const byDayMap: Record<
        string,
        { date: string; count: number; revenue: number }
      > = {};
      for (let i = 0; i < rangeDays; i++) {
        const d = start.add(i, "day");
        const key = d.format("YYYY-MM-DD");
        byDayMap[key] = { date: key, count: 0, revenue: 0 };
      }
      currentSales.forEach((s) => {
        const key = dayjs.tz(s.created_at).format("YYYY-MM-DD");
        if (!byDayMap[key]) {
          byDayMap[key] = { date: key, count: 0, revenue: 0 };
        }
        byDayMap[key].count += 1;
        byDayMap[key].revenue += Number(s.total || 0);
      });
      const timeseriesByDay = Object.values(byDayMap);
      const daysWithSales = timeseriesByDay.filter((d) => d.count > 0);
      let bestDay = { date: "", revenue: 0, count: 0 };
      let worstDay = { date: "", revenue: Infinity, count: 0 };
      if (daysWithSales.length > 0) {
        daysWithSales.forEach((d) => {
          if (d.revenue > bestDay.revenue) {
            bestDay = { date: d.date, revenue: d.revenue, count: d.count };
          }
          if (d.revenue < worstDay.revenue) {
            worstDay = { date: d.date, revenue: d.revenue, count: d.count };
          }
        });
      } else {
        worstDay = { date: "", revenue: 0, count: 0 };
      }
      const methodMap: Record<
        string,
        { method: string; count: number; revenue: number }
      > = {};
      const sourceMap: Record<
        string,
        { source: string; count: number; revenue: number }
      > = {};
      currentSales.forEach((s) => {
        const mKey = String(s.payment_method);
        const sKey = String(s.source);
        if (!methodMap[mKey])
          methodMap[mKey] = { method: mKey, count: 0, revenue: 0 };
        if (!sourceMap[sKey])
          sourceMap[sKey] = { source: sKey, count: 0, revenue: 0 };
        methodMap[mKey].count += 1;
        methodMap[mKey].revenue += Number(s.total || 0);
        sourceMap[sKey].count += 1;
        sourceMap[sKey].revenue += Number(s.total || 0);
      });
      const topProducts = Object.values(productSalesMap)
        .sort((a, b) => b.quantity_sold - a.quantity_sold)
        .slice(0, 5);
      const byCategory = Object.values(categoryMap)
        .filter((c) => c.count > 0 || c.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue);
      const byHour = Object.values(hourMap);
      return {
        range: {
          start_date: start.format("YYYY-MM-DD"),
          end_date: end.format("YYYY-MM-DD"),
          days: rangeDays,
        },
        totals: {
          sales_count: salesCount,
          revenue_total: revenueTotal,
          avg_order_value: avgOrderValue,
          total_units_sold: totalUnitsSold,
          total_tax_collected: totalTaxCollected,
          best_day: bestDay,
          worst_day: worstDay,
        },
        previous: {
          sales_count: prevCount,
          revenue_total: prevRevenue,
          total_units_sold: prevUnitsSold,
        },
        growth: {
          revenue_percent: growthPercentRevenue,
          count_percent: growthPercentCount,
          units_percent: growthPercentUnits,
        },
        timeseries: {
          by_day: timeseriesByDay,
        },
        breakdowns: {
          payment_methods: Object.values(methodMap),
          sources: Object.values(sourceMap),
          by_category: byCategory,
          by_hour: byHour,
        },
        top_products: topProducts,
      };
    } catch (error) {
      const error_msg = error instanceof Error ? error.message : String(error);
      logger.error("sales_service_error", { error });
      return {
        success: false,
        message: error_msg,
      };
    }
  }
}
export default new SalesServices();
