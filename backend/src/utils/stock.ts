import type { Prisma } from "@prisma/client";
import { ConflictError } from "@/utils/errors";

export interface StockItem {
  id: string;
  quantity: number;
}

type TxClient = Prisma.TransactionClient;

export async function decrementStock(
  tx: TxClient,
  items: StockItem[],
): Promise<void> {
  const counts = new Map<string, number>();
  for (const it of items) {
    const id = String(it.id);
    const qty = Math.max(1, Number(it.quantity) || 1);
    counts.set(id, (counts.get(id) ?? 0) + qty);
  }
  for (const [id, qty] of counts.entries()) {
    const result = await tx.products.updateMany({
      where: { id, stock: { gte: qty } },
      data: { stock: { decrement: qty } },
    });
    if (result.count !== 1) {
      throw new ConflictError("insufficient_stock", { product_id: id, requested: qty });
    }
    await tx.$executeRaw`UPDATE "Products"
      SET state = CASE WHEN stock = 0 THEN 'out_stock'::"ProductState" ELSE state END
      WHERE id = ${id}`;
  }
}
