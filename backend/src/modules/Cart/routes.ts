import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware";
import CartServices from "./services/cart.services";
import {
  ensureMergeItems,
  ensureProductId,
  ensureQuantity,
} from "./router.controller";
const router = Router();
const service = new CartServices();
router.use(requireAuth, (req, res, next) => {
  const user = (req as any).user;
  if (user.subjectType === "admin" && req.method !== "GET") {
    return res.status(403).json({
      ok: false,
      error: "admins_no_cart",
      message: "Los administradores no pueden realizar acciones de carrito.",
    });
  }
  next();
});
router.get("/", async (req, res) => {
  const user = (req as any).user;
  if (user.subjectType === "admin") {
    return res.json({
      ok: true,
      cart: { items: [], total: 0, is_admin: true },
    });
  }
  const cart = await service.getCart(Number(user.sub || user.id));
  res.json({ ok: true, cart });
});
router.post("/items", ensureProductId, ensureQuantity, async (req, res) => {
  const user = (req as any).user;
  const options = (req.body).options || [];
  const rs = await service.addItem(
    Number(user.sub || user.id),
    (req as any).product_id,
    (req as any).quantity,
    options,
  );
  if (!rs.ok) return res.status(rs.status || 400).json(rs);
  res.json({ ok: true, item: rs.item, total: rs.total });
});
router.patch(
  "/items/:product_id",
  ensureProductId,
  ensureQuantity,
  async (req, res) => {
    const user = (req as any).user;
    const options = (req.body)?.options;
    const rs = await service.updateQuantity(
      Number(user.sub || user.id),
      (req as any).product_id,
      (req as any).quantity,
      options,
    );
    if (!rs.ok) return res.status(rs.status || 400).json(rs);
    res.json({ ok: true, total: rs.total });
  },
);
router.delete("/items/:product_id", ensureProductId, async (req, res) => {
  const user = (req as any).user;
  const options = (req.body)?.options;
  const rs = await service.removeItem(
    Number(user.sub || user.id),
    (req as any).product_id,
    options,
  );
  if (!rs.ok) return res.status(rs.status || 400).json(rs);
  res.json({ ok: true, total: rs.total });
});
router.delete("/", async (req, res) => {
  const user = (req as any).user;
  const rs = await service.clearCart(Number(user.sub || user.id));
  res.json(rs);
});
router.post("/merge", ensureMergeItems, async (req, res) => {
  const user = (req as any).user;
  const rs = await service.merge(
    Number(user.sub || user.id),
    (req as any).items,
  );
  res.json(rs);
});
export default router;
