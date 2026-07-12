import type { Request, Response, NextFunction } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { errors } from "@/utils/errors";

export const ensureQuantity = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const q = Number((req.body?.quantity ?? req.params?.quantity ?? 1));
  (req as any).quantity = Math.max(1, isNaN(q) ? 1 : q);
  next();
});

export const ensureProductId = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const productId = String(req.body?.product_id || req.params?.product_id || "").trim();
  if (!productId) throw errors.missingFields(["product_id"]);
  (req as any).product_id = productId;
  next();
});

export const ensureMergeItems = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0) throw errors.missingFields(["items"]);
  (req as any).items = items.map((it: any) => ({
    product_id: String(it.product_id),
    quantity: Number(it.quantity) || 1,
    price: typeof it.price === "number" ? it.price : undefined,
    options: it.options || [],
  }));
  next();
});