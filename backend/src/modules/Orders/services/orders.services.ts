import { prisma } from "@/config/prisma"
import { sendEmail } from "@/config/resend"
import { purchase_email_html } from "@/templates/purchase_email"
import salesServices from "@/modules/Sales/services/sales.services"
import BusinessServices from "@/modules/Business/business.services"
import PaletteServices from "@/modules/Palettes/services/palette.services"
import { PaymentMethod } from "@prisma/client"
import fs from 'fs'
import { uploadToBucket } from '@/config/minio'

type OrderItemInput = { product_id: string; quantity: number; options?: any }
type CustomerInput = { name: string; email: string; phone?: string; street?: string; postal_code?: string; city?: string; province?: string; pickup?: boolean }

export default class OrdersServices {
  async createOrder(userId: number | undefined, items: OrderItemInput[], paymentMethod: string, customer: CustomerInput) {
    const productIds = items.map(i => String(i.product_id))
    const products = await prisma.products.findMany({ where: { id: { in: productIds } } })
    const productsMap = new Map(products.map(p => [p.id, p]))

    const snapshot = items.map(item => {
      const product = productsMap.get(item.product_id)
      if (!product) return null
      return {
        id: product.id,
        title: product.title,
        price: Number(product.price),
        quantity: Math.max(1, Number(item.quantity) || 1),
        options: item.options || []
      }
    }).filter(i => i !== null) as { id: string, title: string, price: number, quantity: number, options: any }[]

    const subtotal = snapshot.reduce((acc, it) => acc + Number(it.price) * Number(it.quantity), 0)
    
    const discount = 0
    
    const total = Math.max(0, subtotal - discount)

    const paymentNormalized: PaymentMethod = (String(paymentMethod).toUpperCase() === 'EN_LOCAL') ? 'EFECTIVO' : (String(paymentMethod).toUpperCase() as PaymentMethod)
    
    
    const orderData: any = {
      total,
      subtotal,
      discount: discount > 0 ? discount : undefined,
      payment_method: paymentNormalized,
      items: snapshot as any,
      buyer_email: customer.email || undefined,
      buyer_phone: customer.phone || undefined,
      buyer_name: customer.name || undefined,
    }

    let tenantId: string | undefined;

    
    if (userId && Number.isInteger(userId)) {
      orderData.user = { connect: { id: userId } }
      
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } })
      if (user) {
        tenantId = user.tenantId;
        orderData.tenant = { connect: { id: user.tenantId } }
      }
    } else {
       
       
       if (products.length > 0) {
         tenantId = products[0].tenantId;
         orderData.tenant = { connect: { id: products[0].tenantId } }
       }
    }

    const order = await prisma.orders.create({
      data: orderData
    })


    
    

    if (userId && Number.isInteger(userId)) {
      await prisma.user.update({ where: { id: userId }, data: {
        phone: customer.phone || undefined,
        shipping_street: customer.street || undefined,
        shipping_postal_code: customer.postal_code || undefined,
        shipping_city: customer.city || undefined,
        shipping_province: customer.province || undefined,
      } })
      const cart = await prisma.cart.findUnique({ where: { userId }, select: { id: true } })
      if (cart?.id) {
        await prisma.orderItems.deleteMany({ where: { cartId: cart.id } })
        await prisma.cart.update({ where: { id: cart.id }, data: { total: 0 } })
      }
    }

    const parsed_payment_method = paymentNormalized
    try {
      if (tenantId) {
        const saleId = await salesServices.saveSale({
          payment_method: parsed_payment_method,
          source: "WEB",
          product_ids: productIds,
          user_sale:{ user_id: userId?.toString() || undefined },
          items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity, options: (i as any).options }))
        }, tenantId) as any;
        if (typeof saleId === 'string') {
          await prisma.orders.update({ where: { id: order.id }, data: { saleId } });
        }
      }
    } catch (err) {
      console.error('order_sale_link_failed', err)
    }
    setImmediate(async () => {
      if (tenantId) {
        await this.notify(order.id, snapshot, total, paymentMethod, customer)
      }
      try {
        for (const it of snapshot) {
          await prisma.$executeRaw`UPDATE "Products" 
            SET stock = GREATEST(stock - ${it.quantity}, 0),
                state = CASE WHEN GREATEST(stock - ${it.quantity}, 0) = 0 THEN 'out_stock'::"ProductState" ELSE state END
            WHERE id = ${it.id}`;
        }
      } catch (err) {
        console.error('order_stock_decrement_failed', err)
      }
    })
    return { ok: true, order_id: order.id, total }
  }

  async getOrderById(orderId: string) {
    return prisma.orders.findUnique({ where: { id: orderId }, select: { id: true, payment_method: true, userId: true, transfer_receipt_path: true } })
  }

  async saveTransferReceipt(orderId: string, file: Express.Multer.File) {
    try {
      const order = await prisma.orders.findUnique({ where: { id: orderId } });
      if (!order) return { ok: false, status: 404, error: 'order_not_found' };
      if (String(order.payment_method).toUpperCase() !== 'TRANSFERENCIA') return { ok: false, status: 400, error: 'invalid_payment_method' };
      const buffer: Buffer = file.buffer ?? fs.readFileSync(file.path);
      const uniqueName = `receipt-${orderId}-${Date.now()}`;
      const up = await uploadToBucket(buffer, uniqueName, 'comprobantes', '', file.mimetype);
      if (!up.path) return { ok: false, status: 500, error: 'upload_failed' };
      await prisma.orders.update({ where: { id: orderId }, data: { transfer_receipt_path: up.path } });
      return { ok: true, path: up.path };
    } catch (err) {
      console.error('saveTransferReceipt_error', err);
      return { ok: false, status: 500, error: 'internal_error' };
    }
  }

  async listUserOrders(userId: number, page: number = 1, limit: number = 10) {
    const skip = (Math.max(1, page) - 1) * Math.max(1, limit);
    const [items, total] = await Promise.all([
      prisma.orders.findMany({
        where: { userId },
        orderBy: { created_at: 'desc' },
        skip,
        take: Math.max(1, limit),
        select: {
          id: true,
          items: true,
          total: true,
          payment_method: true,
          created_at: true,
        },
      }),
      prisma.orders.count({ where: { userId } }),
    ]);
    const totalPages = Math.ceil(total / Math.max(1, limit)) || 1;
    return { ok: true, items, page, total, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 };
  }
  private async notify(orderId: string, items: { title: string; price: number; quantity: number }[], total: number, paymentMethod: string, customer: CustomerInput) {
    const productRows = items.map(it => ({ title: `${it.title} x${it.quantity}`, price: Number(it.price) * Number(it.quantity) }))
    if (customer.email && customer.email.trim()) {
      const business = await BusinessServices.getBusiness();
      const palette = await PaletteServices.getActiveFor("shop");
      const buyerHtml = purchase_email_html({
        payment_method: paymentMethod,
        products: productRows,
        subtotal: total,
        finalTotal: total,
        saleId: orderId,
        saleDate: new Date(),
        buyerName: customer.name,
        buyerEmail: customer.email,
        business: business as any,
        palette: palette as any,
      })
      await sendEmail({ to: customer.email, subject: `Confirmación de compra #${orderId}`, html: buyerHtml })
    }
  }
}
