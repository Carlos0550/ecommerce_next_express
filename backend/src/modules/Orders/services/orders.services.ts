import { prisma } from "@/config/prisma";
import { sendEmail } from "@/config/resend";
import { purchase_email_html } from "@/templates/purchase_email";
import salesServices from "@/modules/Sales/services/sales.services";
import BusinessServices from "@/modules/Business/business.services";
import { getActivePalette } from "@/utils/getActivePalette";
import { logger } from "@/utils/logger";
import { decrementStock } from "@/utils/stock";
import type { PaymentMethod, OrderStatus } from "@prisma/client";
import fs from "fs";
import { uploadToBucket } from "@/config/minio";
interface OrderItemInput { product_id: string; quantity: number; options?: any }
interface CustomerInput {
  name: string;
  email: string;
  phone?: string;
  street?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  pickup?: boolean;
}
export default class OrdersServices {
  async createOrder(
    userId: number | undefined,
    items: OrderItemInput[],
    paymentMethod: string,
    customer: CustomerInput,
  ) {
    const productIds = items.map((i) => String(i.product_id));
    const products = await prisma.products.findMany({
      where: { id: { in: productIds } },
    });
    const productsMap = new Map(products.map((p) => [p.id, p]));
    const snapshot = items
      .map((item) => {
        const product = productsMap.get(item.product_id);
        if (!product) return null;
        return {
          id: product.id,
          title: product.title,
          price: Number(product.price),
          quantity: Math.max(1, Number(item.quantity) || 1),
          options: item.options || [],
          stock: Number(product.stock),
        };
      })
      .filter((i) => i !== null) as {
      id: string;
      title: string;
      price: number;
      quantity: number;
      options: any;
      stock: number;
    }[];
    if (snapshot.length === 0) {
      return {
        ok: false,
        status: 400,
        error: "invalid_products",
        missing_product_ids: productIds,
      };
    }
    if (snapshot.length !== items.length) {
      const snapshotIds = new Set(snapshot.map((it) => it.id));
      const missing = productIds.filter((id) => !snapshotIds.has(id));
      return {
        ok: false,
        status: 400,
        error: "invalid_products",
        missing_product_ids: missing,
      };
    }
    const outOfStock = snapshot.filter((it) => it.stock < it.quantity);
    if (outOfStock.length > 0) {
      return {
        ok: false,
        status: 409,
        error: "insufficient_stock",
        out_of_stock: outOfStock.map((it) => ({
          product_id: it.id,
          title: it.title,
          available: it.stock,
          requested: it.quantity,
        })),
      };
    }
    const subtotal = snapshot.reduce(
      (acc, it) => acc + Number(it.price) * Number(it.quantity),
      0,
    );
    const total = subtotal;
    const paymentNormalized: PaymentMethod =
      String(paymentMethod).toUpperCase() === "EN_LOCAL"
        ? "EFECTIVO"
        : (String(paymentMethod).toUpperCase() as PaymentMethod);
    if (userId && Number.isInteger(userId)) {
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (!userExists) {
        userId = undefined;
      }
    }
    const orderData: any = {
      total,
      subtotal,
      payment_method: paymentNormalized,
      items: snapshot as any,
      buyer_email: customer.email || undefined,
      buyer_phone: customer.phone || undefined,
      buyer_name: customer.name || undefined,
      buyer_street: customer.street || undefined,
      buyer_city: customer.city || undefined,
      buyer_postal_code: customer.postal_code || undefined,
      buyer_province: customer.province || undefined,
    };
    if (userId && Number.isInteger(userId)) {
      orderData.user = { connect: { id: userId } };
    }
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.orders.create({ data: orderData });
      await decrementStock(
        tx,
        snapshot.map((it) => ({ id: it.id, quantity: it.quantity })),
      );
      if (userId && Number.isInteger(userId)) {
        await tx.user.update({
          where: { id: userId },
          data: {
            phone: customer.phone || undefined,
            shipping_street: customer.street || undefined,
            shipping_postal_code: customer.postal_code || undefined,
            shipping_city: customer.city || undefined,
            shipping_province: customer.province || undefined,
          },
        });
        const cart = await tx.cart.findUnique({
          where: { userId },
          select: { id: true },
        });
        if (cart?.id) {
          await tx.orderItems.deleteMany({ where: { cartId: cart.id } });
          await tx.cart.update({
            where: { id: cart.id },
            data: { total: 0 },
          });
        }
      }
      return created;
    });
    const parsed_payment_method = paymentNormalized;
    try {
      const saleId = (await salesServices.saveSale({
        payment_method: parsed_payment_method,
        source: "WEB",
        product_ids: productIds,
        user_sale: { user_id: userId?.toString() || undefined },
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          options: (i as any).options,
        })),
        skipStockDecrement: true,
      }));
      if (typeof saleId === "string") {
        await prisma.orders.update({
          where: { id: order.id },
          data: { saleId },
        });
      }
    } catch (err) {
      console.error("order_sale_link_failed", err);
    }
    setImmediate(() => {
      void (async () => {
        try {
          await this.notify(order.id, snapshot, total, paymentMethod, customer);
        } catch (err) {
          logger.error("order_notify_failed", { err });
        }
      })();
    });
    return { ok: true, order_id: order.id, total };
  }
  async getOrderById(orderId: string) {
    return prisma.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        payment_method: true,
        userId: true,
        transfer_receipt_path: true,
      },
    });
  }
  async saveTransferReceipt(orderId: string, file: Express.Multer.File) {
    try {
      const order = await prisma.orders.findUnique({ where: { id: orderId } });
      if (!order) return { ok: false, status: 404, error: "order_not_found" };
      if (String(order.payment_method).toUpperCase() !== "TRANSFERENCIA")
        return { ok: false, status: 400, error: "invalid_payment_method" };
      const buffer: Buffer = file.buffer ?? fs.readFileSync(file.path);
      const uniqueName = `receipt-${orderId}-${Date.now()}`;
      const up = await uploadToBucket(
        buffer,
        uniqueName,
        "comprobantes",
        "",
        file.mimetype,
      );
      if (!up.path) return { ok: false, status: 500, error: "upload_failed" };
      await prisma.orders.update({
        where: { id: orderId },
        data: { transfer_receipt_path: up.path },
      });
      return { ok: true, path: up.path };
    } catch (err) {
      console.error("saveTransferReceipt_error", err);
      return { ok: false, status: 500, error: "internal_error" };
    }
  }
  async listAdminOrders({
    status,
    page = 1,
    limit = 20,
    q,
  }: {
    status?: OrderStatus | "ALL";
    page?: number;
    limit?: number;
    q?: string;
  }) {
    const take = Math.max(1, Math.min(100, Number(limit) || 20));
    const skip = (Math.max(1, Number(page) || 1) - 1) * take;
    const where: any = {};
    if (status && status !== "ALL") where.status = status;
    if (q && q.trim()) {
      const term = q.trim();
      where.OR = [
        { id: { contains: term, mode: "insensitive" } },
        { buyer_email: { contains: term, mode: "insensitive" } },
        { buyer_name: { contains: term, mode: "insensitive" } },
        { saleId: { contains: term, mode: "insensitive" } },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.orders.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          sale: {
            select: {
              id: true,
              source: true,
              payment_method: true,
            },
          },
        },
      }),
      prisma.orders.count({ where }),
    ]);
    const totalPages = Math.ceil(total / take) || 1;
    return {
      ok: true,
      orders: items,
      pagination: {
        total,
        page: Math.max(1, Number(page) || 1),
        limit: take,
        totalPages,
        hasNextPage: (Number(page) || 1) < totalPages,
        hasPrevPage: (Number(page) || 1) > 1,
      },
    };
  }
  async updateStatus(id: string, status: OrderStatus) {
    const order = await prisma.orders.findUnique({ where: { id } });
    if (!order) return { ok: false, status: 404, error: "order_not_found" };
    const updated = await prisma.orders.update({
      where: { id },
      data: { status },
    });
    return { ok: true, order: updated };
  }
  async listUserOrders(userId: number, page = 1, limit = 10) {
    const take = Math.max(1, limit);
    const skip = (Math.max(1, page) - 1) * take;
    const [rows, total] = await Promise.all([
      prisma.orders.findMany({
        where: { userId },
        orderBy: { created_at: "desc" },
        skip,
        take,
        select: {
          id: true,
          items: true,
          total: true,
          subtotal: true,
          payment_method: true,
          status: true,
          transfer_receipt_path: true,
          created_at: true,
        },
      }),
      prisma.orders.count({ where: { userId } }),
    ]);
    const orders = rows.map((o) => ({
      ...o,
      createdAt: o.created_at,
    }));
    const totalPages = Math.ceil(total / take) || 1;
    return {
      ok: true,
      orders,
      page,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }
  private async notify(
    orderId: string,
    items: { title: string; price: number; quantity: number }[],
    total: number,
    paymentMethod: string,
    customer: CustomerInput,
  ) {
    const productRows = items.map((it) => ({
      title: `${it.title} x${it.quantity}`,
      price: Number(it.price) * Number(it.quantity),
    }));
    if (customer.email && customer.email.trim()) {
      const business = await BusinessServices.getBusiness();
      const palette = await getActivePalette();
      const buyerHtml = purchase_email_html({
        payment_method: paymentMethod,
        products: productRows,
        subtotal: total,
        finalTotal: total,
        saleId: orderId,
        saleDate: new Date(),
        buyerName: customer.name,
        buyerEmail: customer.email,
        business: business,
        palette: palette as any,
      });
      await sendEmail({
        to: customer.email,
        subject: `Confirmación de compra #${orderId}`,
        html: buyerHtml,
      });
    }
  }
}
