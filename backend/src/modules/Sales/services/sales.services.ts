import { prisma } from "@/config/prisma";
import { SaleRequest, SalesSummaryRequest } from "./schemas/sales.schemas";
import { sendEmail } from "@/config/resend";
import { sale_email_html } from "@/templates/sale_email";
import { order_ready_email_html } from "@/templates/order_ready_email";
import { order_declined_email_html } from "@/templates/order_declined_email";
import dayjs, { DEFAULT_TZ, nowTz } from "@/config/dayjs";
import BusinessServices from "@/modules/Business/business.services";
import PaletteServices from "@/modules/Palettes/services/palette.services";


class SalesServices {
    async saveSale(request: SaleRequest, tenantId: string) {
        const { payment_method, source, product_ids, user_sale, items } = request;
        const { user_id } = user_sale || {};

        try {
            const isManual = !!request.loadedManually;
            const manualItems = Array.isArray(request.manualProducts) ? request.manualProducts : [];
            let product_data: { id: string; title: string; price: number; quantity: number; options?: any }[] = [];
            let subtotal = 0;

            if (!isManual) {
                const incoming = Array.isArray(items) && items.length > 0
                    ? items.map(it => ({ id: String(it.product_id), quantity: Math.max(1, Number(it.quantity) || 1), options: (it as any).options }))
                    : Array.from(product_ids || []).map(id => ({ id: String(id), quantity: 1, options: [] }));
                const uniqueIds = Array.from(new Set(incoming.map(i => i.id)));
                const found = await prisma.products.findMany({ where: { id: { in: uniqueIds } } }) as any;
                const byId = new Map(found.map((p: any) => [p.id, p]));
                product_data = incoming.map((i) => {
                    const p = byId.get(i.id);
                    if (!p) throw new Error(`Product not found: ${i.id}`);
                    return { 
                        id: (p as any).id, 
                        title: `${(p as any).title}`, 
                        price: Number((p as any).price) * i.quantity,
                        quantity: i.quantity,
                        options: i.options 
                    };
                });
                subtotal = product_data.reduce((acc, product) => acc + Number(product.price), 0);
            } else {
                subtotal = manualItems.reduce((acc, item) => acc + Number(item.quantity) * Number(item.price), 0);
                product_data = manualItems.map(mi => ({ 
                    id: '', 
                    title: mi.title, 
                    price: Number(mi.quantity) * Number(mi.price),
                    quantity: Number(mi.quantity),
                    options: (mi as any).options
                }));
            }

            const parsedUserId = user_id !== undefined ? Number(user_id) : undefined;

            const primaryPaymentMethod = (request.payment_methods && request.payment_methods[0]?.method) || payment_method;
            const paymentBreakdown = Array.isArray(request.payment_methods) ? request.payment_methods : [];
            const taxPercent = Number(request.tax) || 0;
            const taxAmount = subtotal * (taxPercent / 100);
            const finalTotal = subtotal + taxAmount;

            const saleDateStr = (request as any)?.sale_date as string | undefined;
            const parsedSaleDate = saleDateStr && dayjs.tz(saleDateStr, 'YYYY-MM-DD', DEFAULT_TZ);
            const createdAtOverride = parsedSaleDate && parsedSaleDate.isValid() ? parsedSaleDate.startOf('day').toDate() : undefined;

            const sale = await prisma.sales.create({
                data: {
                    payment_method: primaryPaymentMethod,
                    source,
                    user: user_id ? { connect: { id: parsedUserId } } : undefined,
                    total: Number(finalTotal),
                    ...(parsedUserId && Number.isInteger(parsedUserId)
                        ? { user: { connect: { id: parsedUserId } } }
                        : {}),
                    tax: taxPercent,
                    ...(createdAtOverride ? { created_at: createdAtOverride } : {}),
                    products: !isManual ? { connect: Array.from(new Set(product_data.map(p => p.id).filter(Boolean))).map(id => ({ id })) } : undefined,
                    manualProducts: isManual ? manualItems as any : undefined,
                    loadedManually: isManual,
                    paymentMethods: paymentBreakdown as any,
                    items: product_data as any,
                    tenant: { connect: { id: tenantId } }
                }
            })

            setImmediate(async () => {
                try {
                    const user = parsedUserId ? await prisma.user.findUnique({ where: { id: parsedUserId } }) : null;
                    console.log(user)
                    const business = await BusinessServices.getBusinessByTenantId(tenantId);
                    const palette = await PaletteServices.getActiveForByTenantId("shop", tenantId);
                    const html = sale_email_html({
                        source,
                        payment_method: primaryPaymentMethod,
                        products: product_data.map(p => {
                            const optionsStr = Array.isArray(p.options) 
                                ? p.options.map((o: any) => `${o.name}: ${o.value || o.values}`).join(', ') 
                                : '';
                            const title = `${p.title} x${p.quantity}${optionsStr ? ` (${optionsStr})` : ''}`;
                            return { title, price: Number(p.price) }
                        }),
                        subtotal,
                        taxPercent,
                        finalTotal,
                        saleId: (sale as any)?.id ?? undefined,
                        saleDate: (createdAtOverride as Date) || ((sale as any)?.created_at as Date) || new Date(),
                        buyerName: user?.name ?? undefined,
                        buyerEmail: user?.email ?? undefined,
                        business: business as any,
                        palette: palette as any,
                    });
                    const admins: any[] = await prisma.admin.findMany({ where: { is_active: true } })
                    
                    const adminEmails = admins.map((u: { email: string }) => u.email).filter((e: string): e is string => !!e);
                    const configuredRecipient = process.env.SALES_EMAIL_TO;
                    const toRecipients = adminEmails.length > 0
                        ? adminEmails
                        : (configuredRecipient ? configuredRecipient : (process.env.RESEND_FROM || ''));
                    if (Array.isArray(toRecipients) ? toRecipients.length > 0 : !!toRecipients) {
                        await sendEmail({
                            to: toRecipients as any,
                            subject: 'Nueva venta realizada',
                            text: `Nueva venta realizada - ${product_data.length} productos - Total: ${finalTotal}`,
                            html,
                        });
                    } else {
                        console.warn('No recipient configured for sale email');
                    }
                    if (!isManual) {
                        const counts = new Map<string, number>();
                        if (Array.isArray(items) && items.length > 0) {
                            items.forEach(i => counts.set(String(i.product_id), (counts.get(String(i.product_id)) || 0) + Math.max(1, Number(i.quantity) || 1)));
                        } else {
                            (product_ids || []).forEach(id => counts.set(String(id), (counts.get(String(id)) || 0) + 1));
                        }
                        for (const [id, qty] of counts.entries()) {
                            await prisma.$executeRaw`UPDATE "Products"
                              SET stock = GREATEST(stock - ${qty}, 0),
                                  state = CASE WHEN GREATEST(stock - ${qty}, 0) = 0 THEN 'out_stock'::"ProductState" ELSE state END
                              WHERE id = ${id}`;
                        }
                    }
                } catch (err) {
                    console.error('Error sending sale email', err);
                }
            })
            return (sale as any)?.id || true
        } catch (error) {
            const error_msg = error instanceof Error ? error.message : String(error);
            console.log(error);
            return {
                success: false,
                message: error_msg
            }
        }
    }

    async updateSale(id: string, request: SaleRequest) {
        try {
            const existing = await prisma.sales.findUnique({ where: { id }, include: { products: true, user: true } });
            if (!existing) return { success: false, message: 'sale_not_found' };

            const isManual = !!request.loadedManually;
            const manualItems = Array.isArray(request.manualProducts) ? request.manualProducts : [];
            let subtotal = 0;
            let connectProductIds: string[] = [];

            if (!isManual) {
                const incoming = Array.isArray(request.items) && request.items.length > 0
                    ? request.items.map(it => ({ id: String(it.product_id), quantity: Math.max(1, Number(it.quantity) || 1) }))
                    : Array.from(request.product_ids || []).map(id => ({ id: String(id), quantity: 1 }));
                const uniqueIds = Array.from(new Set(incoming.map(i => i.id)));
                const found = await prisma.products.findMany({ where: { id: { in: uniqueIds } } }) as any;
                const byId = new Map(found.map((p: any) => [p.id, p]));
                subtotal = incoming.reduce((acc, i) => {
                    const p = byId.get(i.id);
                    if (!p) return acc;
                    return acc + Number((p as any).price) * i.quantity;
                }, 0);
                connectProductIds = uniqueIds;
            } else {
                subtotal = manualItems.reduce((acc, item) => acc + Number(item.quantity) * Number(item.price), 0);
            }

            const taxPercent = Number(request.tax) || 0;
            const taxAmount = subtotal * (taxPercent / 100);
            const finalTotal = subtotal + taxAmount;

            const primaryPaymentMethod = (request.payment_methods && request.payment_methods[0]?.method) || request.payment_method || existing.payment_method as any;
            const paymentBreakdown = Array.isArray(request.payment_methods) ? request.payment_methods : [];

            const saleDateStr = (request as any)?.sale_date as string | undefined;
            const parsedSaleDate = saleDateStr && dayjs.tz(saleDateStr, 'YYYY-MM-DD', DEFAULT_TZ);
            const createdAtOverride = parsedSaleDate && parsedSaleDate.isValid() ? parsedSaleDate.startOf('day').toDate() : undefined;

            const updated = await prisma.sales.update({
                where: { id },
                data: {
                    payment_method: primaryPaymentMethod as any,
                    source: request.source || existing.source as any,
                    tax: taxPercent,
                    total: Number(finalTotal),
                    ...(createdAtOverride ? { created_at: createdAtOverride } : {}),
                    loadedManually: isManual,
                    manualProducts: isManual ? manualItems as any : undefined,
                    paymentMethods: paymentBreakdown as any,
                    products: !isManual ? { set: connectProductIds.map(pid => ({ id: pid })) } : { set: [] },
                },
                include: { products: true, user: true }
            });

            return { success: true, sale: updated };
        } catch (error) {
            const error_msg = error instanceof Error ? error.message : String(error);
            console.log(error);
            return { success: false, message: error_msg };
        }
    }

    async deleteSale(id: string) {
        try {
            const existing = await prisma.sales.findUnique({ where: { id } });
            if (!existing) return { success: false, message: 'sale_not_found' };
            await prisma.sales.delete({ where: { id } });
            return { success: true };
        } catch (error) {
            const error_msg = error instanceof Error ? error.message : String(error);
            console.log(error);
            return { success: false, message: error_msg };
        }
    }

    async getSales({ page = 1, per_page = 5, start_date, end_date }: { page?: number, per_page?: number, start_date?: string, end_date?: string }) {
        try {
            const take = Math.max(1, Number(per_page) || 5);
            const currentPage = Math.max(1, Number(page) || 1);
            const skip = (currentPage - 1) * take;
            const defaultEnd = nowTz();
            const defaultStart = defaultEnd.startOf('day');

            const parseDateTz = (value?: string, endOfDay: boolean = false) => {
                if (!value) return undefined;
                const parsed = dayjs.tz(value, 'YYYY-MM-DD', DEFAULT_TZ);
                if (!parsed.isValid()) return undefined;
                return endOfDay ? parsed.endOf('day') : parsed.startOf('day');
            };

            const start = parseDateTz(start_date) || defaultStart;
            const end = parseDateTz(end_date, true) || defaultEnd.endOf('day');

            const where: any = {
                created_at: {
                    gte: start.toDate(),
                    lte: end.toDate(),
                },
            };
            const pending = (global as any)?.__pendingFilter || false;
            if (pending) {
                where.source = 'WEB' as any;
                where.processed = false;
            }

            const [total, sales,totalSalesByDate] = await Promise.all([
                await prisma.sales.count({ where }),
                await prisma.sales.findMany({
                    skip,
                    take,
                    where,
                    include: {
                        products: true,
                        user: true,
                        orders: true
                    },
                    orderBy: [{ created_at: 'desc' } as any]
                }),

                await prisma.sales.aggregate({
                    where:{
                        ...where,
                        declined: false
                    },
                    _sum: {
                        total: true
                    }
                })
            ])
            if (Array.isArray(sales) && sales.length > 0) {
                console.log("Sales", (sales[0] as any)?.orders)
            }
            const totalPages = Math.ceil(total / take) || 1;
            const pagination = {
                total,
                page: currentPage,
                limit: take,
                totalPages,
                hasNextPage: currentPage < totalPages,
                hasPrevPage: currentPage > 1,
                start_date: start.format('YYYY-MM-DD'),
                end_date: end.format('YYYY-MM-DD'),
                
            };
            const parsed_totalSalesByDate = totalSalesByDate._sum.total || 0;
            return { sales, pagination, totalSalesByDate: parsed_totalSalesByDate };
        } catch (error) {
            const error_msg = error instanceof Error ? error.message : String(error);
            console.log(error);
            return {
                success: false,
                message: error_msg
            }
        }
    }

    async getSalesAnalytics({ start_date, end_date }: { start_date?: string, end_date?: string }) {
        try {
            const defaultEnd = nowTz();
            const defaultStart = defaultEnd.subtract(30, 'day');

            const parseDate = (value?: string, endOfDay: boolean = false) => {
                if (!value) return undefined;
                const parsed = dayjs.tz(value, 'YYYY-MM-DD', DEFAULT_TZ);
                if (!parsed.isValid()) return undefined;
                return endOfDay ? parsed.endOf('day') : parsed.startOf('day');
            };

            const start = parseDate(start_date) || defaultStart.startOf('day');
            const end = parseDate(end_date, true) || defaultEnd.endOf('day');

            const rangeDays = end.diff(start, 'day') + 1;
            const prevEnd = start.subtract(1, 'day').endOf('day');
            const prevStart = prevEnd.subtract(rangeDays - 1, 'day').startOf('day');

            const [currentSales, previousSales] = await Promise.all([
                prisma.sales.findMany({
                    where: {
                        created_at: {
                            gte: start.toDate(),
                            lte: end.toDate(),
                        }
                    },
                    select: {
                        id: true,
                        total: true,
                        payment_method: true,
                        source: true,
                        created_at: true,
                    },
                    orderBy: [{ created_at: 'asc' } as any]
                }),
                prisma.sales.findMany({
                    where: {
                        created_at: {
                            gte: prevStart.toDate(),
                            lte: prevEnd.toDate(),
                        }
                    },
                    select: { id: true, total: true },
                }),
            ]);

            const salesCount = currentSales.length;
            const revenueTotal = currentSales.reduce((acc: number, s: { total: number | null }) => acc + Number(s.total || 0), 0);
            const avgOrderValue = salesCount > 0 ? revenueTotal / salesCount : 0;

            const prevCount = previousSales.length;
            const prevRevenue = previousSales.reduce((acc: number, s: { total: number | null }) => acc + Number(s.total || 0), 0);

            const growthPercentRevenue = prevRevenue > 0 ? ((revenueTotal - prevRevenue) / prevRevenue) * 100 : (revenueTotal > 0 ? 100 : 0);
            const growthPercentCount = prevCount > 0 ? ((salesCount - prevCount) / prevCount) * 100 : (salesCount > 0 ? 100 : 0);

            const byDayMap: Record<string, { date: string; count: number; revenue: number }> = {};
            for (let i = 0; i < rangeDays; i++) {
                const d = start.add(i, 'day');
                const key = d.format('YYYY-MM-DD');
                byDayMap[key] = { date: key, count: 0, revenue: 0 };
            }
            currentSales.forEach((s) => {
                const key = dayjs.tz(s.created_at).format('YYYY-MM-DD');
                if (!byDayMap[key]) {
                    byDayMap[key] = { date: key, count: 0, revenue: 0 };
                }
                byDayMap[key].count += 1;
                byDayMap[key].revenue += Number(s.total || 0);
            });
            const timeseriesByDay = Object.values(byDayMap);

            const methodMap: Record<string, { method: string; count: number; revenue: number }> = {};
            const sourceMap: Record<string, { source: string; count: number; revenue: number }> = {};
            currentSales.forEach((s) => {
                const mKey = String(s.payment_method);
                const sKey = String(s.source);
                if (!methodMap[mKey]) methodMap[mKey] = { method: mKey, count: 0, revenue: 0 };
                if (!sourceMap[sKey]) sourceMap[sKey] = { source: sKey, count: 0, revenue: 0 };
                methodMap[mKey].count += 1;
                methodMap[mKey].revenue += Number(s.total || 0);
                sourceMap[sKey].count += 1;
                sourceMap[sKey].revenue += Number(s.total || 0);
            });

            return {
                range: {
                    start_date: start.format('YYYY-MM-DD'),
                    end_date: end.format('YYYY-MM-DD'),
                    days: rangeDays,
                },
                totals: {
                    sales_count: salesCount,
                    revenue_total: revenueTotal,
                    avg_order_value: avgOrderValue,
                },
                previous: {
                    sales_count: prevCount,
                    revenue_total: prevRevenue,
                },
                growth: {
                    revenue_percent: growthPercentRevenue,
                    count_percent: growthPercentCount,
                },
                timeseries: {
                    by_day: timeseriesByDay,
                },
                breakdowns: {
                    payment_methods: Object.values(methodMap),
                    sources: Object.values(sourceMap),
                },
            };
        } catch (error) {
            const error_msg = error instanceof Error ? error.message : String(error);
            console.log(error);
            return {
                success: false,
                message: error_msg
            };
        }
    }

    async markProcessed(id: string) {
        try {
            const sale = await prisma.sales.findUnique({ where: { id }, include: { user: true, orders:true } });
            if (!sale) return { success: false, message: 'sale_not_found' };
            if ((sale as any).processed) return { success: true };
            await prisma.sales.update({ where: { id }, data: { processed: true } });
            const buyer_email = sale.orders[0].buyer_email || sale.user?.email;
            const buyerName = sale.orders[0].buyer_name || sale.user?.name || undefined;
            console.log("buyer_email", buyer_email);
            if (buyer_email) {
                const business = await BusinessServices.getBusiness();
                const palette = await PaletteServices.getActiveFor("shop");
                const html = order_ready_email_html({ saleId: sale.id, buyerName, payment_method: String(sale.payment_method), business: business as any, palette: palette as any });
                await sendEmail({ to: buyer_email, subject: `Tu orden #${sale.id} está lista`, html });
                return { success: true };
            }
            return { success: false, message: 'email_not_found' };
        } catch (error) {
            const error_msg = error instanceof Error ? error.message : String(error);
            console.log(error);
            return { success: false, message: error_msg };
        }
    }

    async decline(id: string, reason: string) {
        try {
            const sale = await prisma.sales.findUnique({ where: { id }, include: { user: true, orders:true } });
            if (!sale) return { success: false, message: 'sale_not_found' };
            await prisma.sales.update({ where: { id }, data: { declined: true, decline_reason: reason, processed: false } });
            const buyer_email = sale.orders[0].buyer_email || sale.user?.email;
            const buyerName = sale.orders[0].buyer_name || sale.user?.name || undefined;
            if (buyer_email) {
                const business = await BusinessServices.getBusiness();
                const palette = await PaletteServices.getActiveFor("shop");
                const html = order_declined_email_html({ saleId: sale.id, buyerName, reason, business: business as any, palette: palette as any });
                await sendEmail({ to: buyer_email, subject: `Tu orden #${sale.id} fue declinada`, html });
            }
            return { success: true };
        } catch (error) {
            const error_msg = error instanceof Error ? error.message : String(error);
            console.log(error);
            return { success: false, message: error_msg };
        }
    }
}
export default new SalesServices();
