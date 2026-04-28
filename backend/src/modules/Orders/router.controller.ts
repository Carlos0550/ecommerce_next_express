import type { Request, Response, NextFunction } from "express";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const name = String(customer?.name || "").trim();
  const email = String(customer?.email || "").trim();
  const street = String(customer?.street || "").trim();
  const city = String(customer?.city || "").trim();
  const postal_code = String(customer?.postal_code || "").trim();
  if (
    name.length < 2 ||
    !EMAIL_RE.test(email) ||
    street.length < 3 ||
    city.length < 2 ||
    postal_code.length < 3
  ) {
    return res.status(400).json({ ok: false, error: "invalid_customer_data" });
  }
  const normalizedCustomer = {
    name,
    email,
    phone: customer?.phone ? String(customer.phone).trim() : undefined,
    street,
    postal_code,
    city,
    province: customer?.province ? String(customer.province).trim() : undefined,
    pickup: !!customer?.pickup,
  };
  (req as any).items = normalizedItems;
  (req as any).payment_method = payment;
  (req as any).customer = normalizedCustomer;
  next();
}
