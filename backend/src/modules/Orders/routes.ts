import type { Request, Response } from "express";
import { Router } from "express";
import {
  requireAuth,
  requireRole,
  attachAuthIfPresent,
} from "@/middlewares/auth.middleware";
import {
  uploadSingleImage,
  handleImageUploadError,
  validateImageMagicBytes,
} from "@/middlewares/image.middleware";
import OrdersServices from "./services/orders.services";
import { ensureCreatePayload } from "./router.controller";
const router = Router();
const service = new OrdersServices();
router.post(
  "/create",
  attachAuthIfPresent,
  ensureCreatePayload,
  async (req: Request, res: Response) => {
    const user = (req as any).user;
    const userId = user ? Number(user.sub || user.id) : undefined;
    const rs = await service.createOrder(
      userId,
      (req as any).items,
      (req as any).payment_method,
      (req as any).customer,
    );
    if (rs && typeof rs === "object" && "ok" in rs && rs.ok === false) {
      const status = (rs as any).status || 400;
      return res.status(status).json(rs);
    }
    res.json(rs);
  },
);
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = Number(user.sub || user.id);
  const page = Number((req.query.page as string) || "1");
  const limit = Number((req.query.limit as string) || "10");
  const rs = await service.listUserOrders(userId, page, limit);
  res.json(rs);
});
router.get(
  "/admin",
  requireAuth,
  requireRole(["ADMIN"]),
  async (req: Request, res: Response) => {
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
  },
);
router.patch(
  "/:id/status",
  requireAuth,
  requireRole(["ADMIN"]),
  async (req: Request, res: Response) => {
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
    if (!id) return res.status(400).json({ ok: false, error: "missing_id" });
    if (!allowed.includes(status))
      return res.status(400).json({ ok: false, error: "invalid_status" });
    const rs = await service.updateStatus(id, status as any);
    if (!rs.ok)
      return res.status((rs as any).status || 400).json(rs);
    res.json(rs);
  },
);
router.post(
  "/:id/receipt",
  requireAuth,
  uploadSingleImage("file"),
  handleImageUploadError,
  validateImageMagicBytes,
  async (req: Request, res: Response) => {
    try {
      const id = String((req.params as any)?.id || "");
      if (!id)
        return res.status(400).json({ ok: false, error: "missing_order_id" });
      const order = await service.getOrderById(id);
      if (!order)
        return res.status(404).json({ ok: false, error: "order_not_found" });
      const user = (req as any).user;
      const isAdmin = Number(user.role || 2) === 1;
      if (!isAdmin) {
        const userId = Number(user.sub || user.id);
        if (!order.userId || Number(order.userId) !== userId) {
          return res.status(403).json({ ok: false, error: "forbidden" });
        }
      }
      if (String(order.payment_method).toUpperCase() !== "TRANSFERENCIA") {
        return res
          .status(400)
          .json({ ok: false, error: "invalid_payment_method" });
      }
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file)
        return res.status(400).json({ ok: false, error: "missing_file" });
      const rs = await service.saveTransferReceipt(id, file);
      if (!rs.ok) return res.status(rs.status || 400).json(rs);
      res.json(rs);
    } catch (err) {
      res.status(500).json({ ok: false, error: "receipt_upload_failed" });
    }
  },
);
router.get("/:id/receipt", requireAuth, async (req: Request, res: Response) => {
  try {
    const id = String((req.params as any)?.id || "");
    if (!id)
      return res.status(400).json({ ok: false, error: "missing_order_id" });
    const user = (req as any).user;
    const isAdmin = Number(user.role || 2) === 1;
    if (!isAdmin)
      return res.status(403).json({ ok: false, error: "forbidden" });
    const order = await service.getOrderById(id);
    if (!order?.transfer_receipt_path)
      return res.status(404).json({ ok: false, error: "receipt_not_found" });
    const { createSignedUrl } = await import("@/config/minio");
    const signed = await createSignedUrl(
      "comprobantes",
      order.transfer_receipt_path,
      3600,
    );
    if (!signed.url)
      return res.status(500).json({ ok: false, error: "signed_url_failed" });
    res.json({ ok: true, url: signed.url });
  } catch (err) {
    res.status(500).json({ ok: false, error: "receipt_fetch_failed" });
  }
});
export default router;
