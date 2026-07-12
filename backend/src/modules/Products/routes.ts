import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import {
  saveProduct,
  saveCategory,
  getAllProducts,
  updateProductController,
  changeCategoryStatus,
  changeProductStatus,
} from "./router.controller";
import {
  uploadMultipleImages,
  handleImageUploadError,
  uploadSingleImage,
  validateImageMagicBytes,
} from "../../middlewares/image.middleware";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import ProductServices from "./services/product.services";

const router = Router();
const product_service = ProductServices;

router.post(
  "/save-product",
  requireAuth,
  requireRole(["ADMIN"]),
  uploadMultipleImages("productImages", 1),
  handleImageUploadError,
  validateImageMagicBytes,
  saveProduct,
  asyncHandler(async (req, res) => {
    const result = await product_service.saveProduct(req, res);
    res.status(201).json({ ok: true, ...result });
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
  uploadMultipleImages("productImages", 1),
  handleImageUploadError,
  validateImageMagicBytes,
  updateProductController,
  asyncHandler(async (req, res) => {
    const result = await product_service.updateProduct(req, res);
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