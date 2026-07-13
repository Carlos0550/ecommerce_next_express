import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireAuth } from "@/middlewares/auth.middleware";
import { errors } from "@/utils/errors";
import CartServices from "./services/cart.services";
import {
  ensureMergeItems,
  ensureProductId,
  ensureQuantity,
} from "./router.controller";

const router = Router();
const service = new CartServices();

router.use(
  requireAuth,
  asyncHandler(async (req, _res, next) => {
    const user = (req as any).user;
    if (user.subjectType === "admin" && req.method !== "GET") {
      throw errors.forbidden("Los administradores no pueden realizar acciones de carrito");
    }
    next();
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    if (user.subjectType === "admin") {
      res.json({ ok: true, cart: { items: [], total: 0, is_admin: true } });
      return;
    }
    const cart = await service.getCart(Number(user.sub || user.id));
    res.json({ ok: true, cart });
  }),
);

router.post(
  "/items",
  ensureProductId,
  ensureQuantity,
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const options = (req.body).options || [];
    const rs = await service.addItem(
      Number(user.sub || user.id),
      (req as any).product_id,
      (req as any).quantity,
      options,
    );
    res.json({ ok: true, ...rs });
  }),
);

router.patch(
  "/items/:product_id",
  ensureProductId,
  ensureQuantity,
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const options = (req.body)?.options;
    const rs = await service.updateQuantity(
      Number(user.sub || user.id),
      (req as any).product_id,
      (req as any).quantity,
      options,
    );
    res.json({ ok: true, ...rs });
  }),
);

router.delete(
  "/items/:product_id",
  ensureProductId,
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const options = (req.body)?.options;
    const rs = await service.removeItem(
      Number(user.sub || user.id),
      (req as any).product_id,
      options,
    );
    res.json({ ok: true, ...rs });
  }),
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const rs = await service.clearCart(Number(user.sub || user.id));
    res.json(rs);
  }),
);

router.post(
  "/merge",
  ensureMergeItems,
  asyncHandler(async (req, res) => {
    const user = (req as any).user;
    const rs = await service.merge(
      Number(user.sub || user.id),
      (req as any).items,
    );
    res.json(rs);
  }),
);

export default router;