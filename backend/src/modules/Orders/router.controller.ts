import type { Request, Response, NextFunction } from "express";
export function ensureCreatePayload(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const payment = String(req.body?.payment_method || "").trim();
  const customer = req.body?.customer || {};
  if (items.length === 0)
    return res.status(400).json({ ok: false, error: "missing_items" });
  if (!payment)
    return res.status(400).json({ ok: false, error: "missing_payment_method" });
  const normalizedItems = items.map((it: any) => ({
    product_id: String(it.product_id),
    quantity: Number(it.quantity) || 1,
    options: it?.options || [],
  }));
  const normalizedCustomer = {
    name: String(customer?.name || ""),
    email: String(customer?.email || ""),
    phone: customer?.phone ? String(customer.phone) : undefined,
    street: customer?.street ? String(customer.street) : undefined,
    postal_code: customer?.postal_code
      ? String(customer.postal_code)
      : undefined,
    city: customer?.city ? String(customer.city) : undefined,
    province: customer?.province ? String(customer.province) : undefined,
    pickup: !!customer?.pickup,
  };
  (req as any).items = normalizedItems;
  (req as any).payment_method = payment;
  (req as any).customer = normalizedCustomer;
  next();
}
