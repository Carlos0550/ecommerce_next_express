import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import businessController from "./router.controller";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import {
  uploadSingleImage,
  handleImageUploadError,
  validateImageMagicBytes,
} from "@/middlewares/image.middleware";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    res.status(201).json(await businessController.createBusiness(req, res));
  }),
);

router.post(
  "/upload-image",
  requireAuth,
  requireRole(["ADMIN"]),
  uploadSingleImage("file"),
  handleImageUploadError,
  validateImageMagicBytes,
  asyncHandler(async (req, res) => {
    res.json(await businessController.uploadImage(req, res));
  }),
);

router.post(
  "/upload-banner-image",
  requireAuth,
  requireRole(["ADMIN"]),
  uploadSingleImage("file"),
  handleImageUploadError,
  validateImageMagicBytes,
  asyncHandler(async (req, res) => {
    res.json(await businessController.uploadBannerImage(req, res));
  }),
);

router.post(
  "/generate-description",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    res.json(await businessController.generateDescription(req, res));
  }),
);

router.put(
  "/:id",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    res.json(await businessController.updateBusiness(req, res));
  }),
);

router.get(
  "/",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    res.json(await businessController.getBusiness(req, res));
  }),
);

router.get(
  "/public",
  asyncHandler(async (req, res) => {
    res.json(await businessController.getBusiness(req, res));
  }),
);

router.get(
  "/public/bank-info",
  asyncHandler(async (req, res) => {
    res.json(await businessController.getBusiness(req, res));
  }),
);

router.get(
  "/theme",
  asyncHandler(async (req, res) => {
    res.json(await businessController.getActivePalette(req, res));
  }),
);

router.patch(
  "/palette",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    res.json(await businessController.setActivePalette(req, res));
  }),
);

export default router;