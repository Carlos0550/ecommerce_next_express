import type { Request, Response } from "express";
import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  requireAuth,
  requireRole,
  attachAuthIfPresent,
  normalizeRole,
} from "@/middlewares/auth.middleware";
import {
  uploadSingleImage,
  handleImageUploadError,
  validateImageMagicBytes,
} from "@/middlewares/image.middleware";
import OrdersServices from "./services/orders.services";
import { ensureCreatePayload } from "./router.controller";
import { createSignedUrl } from "@/config/minio";
import { errors } from "@/utils/errors";

const router = Router();
const service = new OrdersServices();

router.post(
  "/create",
  attachAuthIfPresent,
  ensureCreatePayload,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const userId = user ? Number(user.sub || user.id) : undefined;
    const rs = await service.createOrder(
      userId,
      (req as any).items,
      (req as any).payment_method,
      (req as any).customer,
    );
    res.json(rs);
  }),
);

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const userId = Number(user.sub || user.id);
    const page = Number((req.query.page as string) || "1");
    const limit = Number((req.query.limit as string) || "10");
    const rs = await service.listUserOrders(userId, page, limit);
    res.json(rs);
  }),
);

router.get(
  "/admin",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req: Request, res: Response) => {
    const status = (req.query.status as string | undefined) || undefined;
    const q = (req.query.q as string | undefined) || undefined;
    const page = Number((req.query.page as string) || "1");
    const limit = Number((req.query.limit as string) || "20");
    const rs = await service.listAdminOrders({
      status: status as any,
      page,
      limit,
      q,
    });
    res.json(rs);
  }),
);

router.patch(
  "/:id/status",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req: Request, res: Response) => {
    const id = String((req.params as any)?.id || "");
    const status = String((req.body as any)?.status || "").toUpperCase();
    const allowed = [
      "PENDING",
      "PAID",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
    ];
    if (!id) throw errors.missingFields(["id"]);
    if (!allowed.includes(status)) throw errors.invalidStatus();
    const rs = await service.updateStatus(id, status as any);
    res.json(rs);
  }),
);

router.post(
  "/:id/receipt",
  attachAuthIfPresent,
  uploadSingleImage("file"),
  handleImageUploadError,
  validateImageMagicBytes,
  asyncHandler(async (req: Request, res: Response) => {
    const id = String((req.params as any)?.id || "");
    if (!id) throw errors.missingFields(["order_id"]);
    const order = await service.getOrderById(id);
    if (!order) throw errors.orderNotFound();
    const user = (req as any).user;
    const isAdmin = !!user && normalizeRole(user.role) === "ADMIN";
    if (!isAdmin) {
      if (user) {
        const userId = Number(user.sub || user.id);
        if (!order.userId || Number(order.userId) !== userId) {
          throw errors.forbidden();
        }
      } else if (order.userId) {
        throw errors.forbidden();
      }
    }
    if (String(order.payment_method).toUpperCase() !== "TRANSFERENCIA") {
      throw errors.invalidPaymentMethod();
    }
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw errors.missingFields(["file"]);
    const rs = await service.saveTransferReceipt(id, file);
    res.json(rs);
  }),
);

router.get(
  "/:id/receipt",
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const id = String((req.params as any)?.id || "");
    if (!id) throw errors.missingFields(["order_id"]);
    const user = (req as any).user;
    const isAdmin = !!user && normalizeRole(user.role) === "ADMIN";
    const order = await service.getOrderById(id);
    if (!order) throw errors.orderNotFound();
    if (!isAdmin) {
      const userId = Number(user.sub || user.id);
      if (!order.userId || Number(order.userId) !== userId) {
        throw errors.forbidden();
      }
    }
    if (!order.transfer_receipt_path) throw errors.receiptNotFound();
    const signed = await createSignedUrl(
      "comprobantes",
      order.transfer_receipt_path,
      3600,
    );
    if (!signed.url) throw errors.signedUrlFailed();
    res.json({ ok: true, url: signed.url });
  }),
);

export default router;