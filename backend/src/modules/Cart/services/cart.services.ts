import { prisma } from "@/config/prisma";
type MergeItem = {
  product_id: string;
  quantity: number;
  price?: number;
  options?: any;
};
function areOptionsEqual(a: any, b: any) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  try {
    const arrA = Array.isArray(a) ? a : JSON.parse(JSON.stringify(a));
    const arrB = Array.isArray(b) ? b : JSON.parse(JSON.stringify(b));
    if (!Array.isArray(arrA) || !Array.isArray(arrB))
      return JSON.stringify(a) === JSON.stringify(b);
    if (arrA.length !== arrB.length) return false;
    const sortedA = [...arrA].sort((x, y) =>
      (x.name || "").localeCompare(y.name || ""),
    );
    const sortedB = [...arrB].sort((x, y) =>
      (x.name || "").localeCompare(y.name || ""),
    );
    return JSON.stringify(sortedA) === JSON.stringify(sortedB);
  } catch {
    return false;
  }
}
export default class CartServices {
  async getOrCreateUserCart(userId: number) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true } } },
    });
    if (cart) return cart;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User with ID ${userId} not found. Cannot create cart.`);
    }
    return prisma.cart.create({
      data: { user: { connect: { id: userId } } },
      include: { items: { include: { product: true } } },
    });
  }
  async getCart(userId: number) {
    const cart = await this.getOrCreateUserCart(userId);
    const total = cart.items.reduce(
      (acc, it) => acc + Number(it.product.price) * Number(it.quantity),
      0,
    );
    return { ...cart, total };
  }
  async addItem(
    userId: number,
    productId: string,
    quantity: number = 1,
    options: any = [],
  ) {
    const cart = await this.getOrCreateUserCart(userId);
    const product = await prisma.products.findUnique({
      where: { id: productId },
    });
    if (!product || !product.is_active || product.state !== "active")
      return { ok: false, status: 400, error: "product_not_available" };
    const existingItems = await prisma.orderItems.findMany({
      where: { cartId: cart.id, productId },
    });
    const match = existingItems.find((item) =>
      areOptionsEqual(item.selected_options, options),
    );
    const currentQty = match ? Number(match.quantity) : 0;
    const requestedTotal = currentQty + quantity;
    if (Number(product.stock) < requestedTotal) {
      return { ok: false, status: 409, error: "insufficient_stock", available: Number(product.stock) };
    }
    if (match) {
      const updated = await prisma.orderItems.update({
        where: { id: match.id },
        data: { quantity: match.quantity + quantity },
      });
      const total = await this.recomputeTotal(cart.id);
      return { ok: true, item: updated, total };
    }
    const item = await prisma.orderItems.create({
      data: {
        cart: { connect: { id: cart.id } },
        product: { connect: { id: productId } },
        quantity,
        price_has_changed: false,
        selected_options: options ?? [],
      },
    });
    const total = await this.recomputeTotal(cart.id);
    return { ok: true, item, total };
  }
  async updateQuantity(
    userId: number,
    productId: string,
    quantity: number,
    options?: any,
  ) {
    const cart = await this.getOrCreateUserCart(userId);
    const existingItems = await prisma.orderItems.findMany({
      where: { cartId: cart.id, productId },
    });
    if (existingItems.length === 0)
      return { ok: false, status: 404, error: "item_not_found" };
    const target = Array.isArray(options)
      ? existingItems.find((item) =>
          areOptionsEqual(item.selected_options, options),
        ) || existingItems[0]
      : existingItems[0];
    if (quantity <= 0) {
      await prisma.orderItems.delete({ where: { id: target.id } });
    } else {
      await prisma.orderItems.update({
        where: { id: target.id },
        data: { quantity },
      });
    }
    const total = await this.recomputeTotal(cart.id);
    return { ok: true, total };
  }
  async removeItem(userId: number, productId: string, options?: any) {
    const cart = await this.getOrCreateUserCart(userId);
    const existingItems = await prisma.orderItems.findMany({
      where: { cartId: cart.id, productId },
    });
    if (existingItems.length === 0)
      return { ok: false, status: 404, error: "item_not_found" };
    const target = Array.isArray(options)
      ? existingItems.find((item) =>
          areOptionsEqual(item.selected_options, options),
        ) || existingItems[0]
      : existingItems[0];
    await prisma.orderItems.delete({ where: { id: target.id } });
    const total = await this.recomputeTotal(cart.id);
    return { ok: true, total };
  }
  async clearCart(userId: number) {
    const cart = await this.getOrCreateUserCart(userId);
    await prisma.orderItems.deleteMany({ where: { cartId: cart.id } });
    await prisma.cart.update({ where: { id: cart.id }, data: { total: 0 } });
    return { ok: true };
  }
  async merge(userId: number, items: MergeItem[]) {
    const cart = await this.getOrCreateUserCart(userId);
    for (const incoming of items) {
      const product = await prisma.products.findUnique({
        where: { id: incoming.product_id },
      });
      if (!product || !product.is_active || product.state !== "active") continue;
      if (Number(incoming.quantity) > 0 && Number(product.stock) < Number(incoming.quantity)) continue;
      const existingItems = await prisma.orderItems.findMany({
        where: { cartId: cart.id, productId: incoming.product_id },
      });
      const existing = existingItems.find((item) =>
        areOptionsEqual(item.selected_options, incoming.options),
      );
      const priceChanged =
        typeof incoming.price === "number" &&
        Number(incoming.price) !== Number(product.price);
      if (existing) {
        if (Number(incoming.quantity) <= 0) {
          await prisma.orderItems.delete({ where: { id: existing.id } });
        } else {
          await prisma.orderItems.update({
            where: { id: existing.id },
            data: {
              quantity: Number(incoming.quantity) || 1,
              price_has_changed: priceChanged || existing.price_has_changed,
            },
          });
        }
      } else if (Number(incoming.quantity) > 0) {
        await prisma.orderItems.create({
          data: {
            cart: { connect: { id: cart.id } },
            product: { connect: { id: incoming.product_id } },
            quantity: Number(incoming.quantity) || 1,
            price_has_changed: priceChanged,
            selected_options: incoming.options ?? [],
          },
        });
      }
    }
    const total = await this.recomputeTotal(cart.id);
    return { ok: true, total };
  }
  private async recomputeTotal(cartId: number) {
    const items = await prisma.orderItems.findMany({
      where: { cartId },
      include: { product: true },
    });
    const total = items.reduce(
      (acc, it) => acc + Number(it.product.price) * Number(it.quantity),
      0,
    );
    await prisma.cart.update({ where: { id: cartId }, data: { total } });
    return total;
  }
}
