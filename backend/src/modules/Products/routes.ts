import { Router } from "express";
import fs from "fs";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import {
  handleImageUploadError,
  uploadBulkImages,
  uploadSingleImage,
  uploadTempImages,
  validateImageMagicBytes,
} from "../../middlewares/image.middleware";
import {
  deleteDraft,
  getDraft,
  listUserDrafts,
  readTempFile,
} from "./services/draft.service";
import {
  persistProductDraft,
  persistUpdateProductDraft,
} from "./draft.middleware";
import ProductServices from "./services/product.services";
import { bulkSaveProducts } from "./services/bulk-product.service";
import {
  saveProduct,
  saveCategory,
  getAllProducts,
  updateProductController,
  changeCategoryStatus,
  changeProductStatus,
} from "./router.controller";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/utils/errors";

const router = Router();
const product_service = ProductServices;

router.get(
  "/drafts",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const userId = String((req as any).user?.sub || "");
    const drafts = await listUserDrafts(userId);
    const safe = drafts.map((d) => ({
      tempId: d.tempId,
      title: d.title,
      category_id: d.category_id,
      sku: d.sku,
      createdAt: d.createdAt,
      imageUrl: `/api/products/draft/${d.tempId}/image`,
    }));
    res.json({ ok: true, drafts: safe });
  }),
);

router.get(
  "/draft/:tempId",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const userId = String((req as any).user?.sub || "");
    const { tempId } = req.params as { tempId: string };
    const draft = await getDraft(tempId);
    if (!draft) throw new NotFoundError("Borrador no encontrado o expirado", "draft_not_found");
    if (draft.userId !== userId) throw new ForbiddenError("No podés acceder a este borrador");
    res.json({ ok: true, draft });
  }),
);

router.get(
  "/draft/:tempId/image",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const userId = String((req as any).user?.sub || "");
    const { tempId } = req.params as { tempId: string };
    if (tempId.includes("..") || tempId.includes("/")) {
      throw new BadRequestError("tempId inválido", undefined, "invalid_temp_id");
    }
    const draft = await getDraft(tempId);
    if (!draft) throw new NotFoundError("Borrador no encontrado o expirado", "draft_not_found");
    if (draft.userId !== userId) throw new ForbiddenError("No podés acceder a este borrador");
    const buf = await readTempFile(draft.imagePath);
    if (!buf) {
      res.status(410).json({ ok: false, error: "draft_image_gone" });
      return;
    }
    res.setHeader("Content-Type", draft.imageMime || "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=60");
    res.send(buf);
  }),
);

router.delete(
  "/draft/:tempId",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const userId = String((req as any).user?.sub || "");
    const { tempId } = req.params as { tempId: string };
    const draft = await getDraft(tempId);
    if (draft && draft.userId === userId) {
      await deleteDraft(tempId, userId);
    }
    res.json({ ok: true });
  }),
);

router.post(
  "/save-product",
  requireAuth,
  requireRole(["ADMIN"]),
  uploadTempImages("productImages", 1),
  handleImageUploadError,
  validateImageMagicBytes,
  persistProductDraft,
  saveProduct,
  asyncHandler(async (req, res) => {
    const result = await product_service.saveProduct(req, res);
    const { cleanupDraftAfterSuccess } = await import("./draft.middleware");
    await cleanupDraftAfterSuccess(req).catch(() => undefined);
    res.status(201).json({ ok: true, ...result });
  }),
);

router.post(
  "/bulk",
  requireAuth,
  requireRole(["ADMIN"]),
  uploadBulkImages("productImages", 100),
  handleImageUploadError,
  validateImageMagicBytes,
  asyncHandler(async (req, res) => {
    const result = await bulkSaveProducts(req, res);
    if (Array.isArray(req.files)) {
      await Promise.all(
        (req.files as Express.Multer.File[]).map((f) =>
          f.path ? fs.promises.unlink(f.path).catch(() => undefined) : Promise.resolve(),
        ),
      );
    }
    const { ok: _ignored, ...payload } = result;
    res.status(result.ok ? 201 : 207).json({ ok: true, ...payload });
  }),
);

router.post(
  "/categories",
  requireAuth,
  requireRole(["ADMIN"]),
  uploadSingleImage("image"),
  validateImageMagicBytes,
  saveCategory,
  asyncHandler(async (req, res) => {
    await product_service.saveCategory(req, res);
    res.status(201).json({ ok: true });
  }),
);

router.put(
  "/categories/:category_id",
  requireAuth,
  requireRole(["ADMIN"]),
  uploadSingleImage("image"),
  validateImageMagicBytes,
  asyncHandler(async (req, res) => {
    await product_service.updateCategory(req, res);
    res.json({ ok: true });
  }),
);

router.get(
  "/categories",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    res.json({ ok: true, ...(await product_service.getAllCategories(req, res)) });
  }),
);

router.get(
  "/",
  requireAuth,
  requireRole(["ADMIN"]),
  getAllProducts,
  asyncHandler(async (req, res) => {
    res.json({ ok: true, ...(await product_service.getAllProducts(req, res)) });
  }),
);

router.delete(
  "/:product_id",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    await product_service.deleteProduct(req, res);
    res.json({ ok: true });
  }),
);

router.put(
  "/:product_id",
  requireAuth,
  requireRole(["ADMIN"]),
  uploadTempImages("productImages", 1),
  handleImageUploadError,
  validateImageMagicBytes,
  persistUpdateProductDraft,
  updateProductController,
  asyncHandler(async (req, res) => {
    const result = await product_service.updateProduct(req, res);
    const { cleanupDraftAfterSuccess } = await import("./draft.middleware");
    await cleanupDraftAfterSuccess(req).catch(() => undefined);
    res.json({ ok: true, ...result });
  }),
);

router.patch(
  "/categories/status/:category_id/:status",
  requireAuth,
  requireRole(["ADMIN"]),
  changeCategoryStatus,
  asyncHandler(async (req, res) => {
    await product_service.categoryChangeStatus(req, res);
    res.json({ ok: true });
  }),
);

router.patch(
  "/status/:product_id/:state",
  requireAuth,
  requireRole(["ADMIN"]),
  changeProductStatus,
  asyncHandler(async (req, res) => {
    await product_service.productChangeStatus(req, res);
    res.json({ ok: true });
  }),
);

router.patch(
  "/stock/:product_id/:quantity",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const result = await product_service.updateStock(req, res);
    res.json({ ok: true, ...result });
  }),
);

router.post(
  "/ai/enhance/:product_id",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const result = await product_service.enhanceProductContent(req, res);
    res.json({ ok: true, ...result });
  }),
);

router.get(
  "/public",
  asyncHandler(async (req, res) => {
    res.json({ ok: true, ...(await product_service.getPublicProducts(req, res)) });
  }),
);

router.get(
  "/public/categories",
  asyncHandler(async (req, res) => {
    res.json({ ok: true, ...(await product_service.getPublicCategories(req, res)) });
  }),
);

router.get(
  "/public/:id",
  asyncHandler(async (req, res) => {
    res.json({ ok: true, ...(await product_service.getPublicProductById(req, res)) });
  }),
);

export default router;