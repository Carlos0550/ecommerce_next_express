import { Request, Response, Router } from "express";
import businessController from "./router.controller";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
import {
  uploadSingleImage,
  handleImageUploadError,
  validateImageMagicBytes,
} from "@/middlewares/image.middleware";
const router = Router();
router.post("/", requireAuth, requireRole([1]), (req: Request, res: Response) =>
  businessController.createBusiness(req, res),
);
router.post(
  "/upload-image",
  requireAuth,
  requireRole([1]),
  uploadSingleImage("file"),
  handleImageUploadError,
  validateImageMagicBytes,
  (req: Request, res: Response) => businessController.uploadImage(req, res),
);
router.post(
  "/generate-description",
  requireAuth,
  requireRole([1]),
  (req: Request, res: Response) =>
    businessController.generateDescription(req, res),
);
router.put(
  "/:id",
  requireAuth,
  requireRole([1]),
  (req: Request, res: Response) => businessController.updateBusiness(req, res),
);
router.get("/", requireAuth, requireRole([1]), (req: Request, res: Response) =>
  businessController.getBusiness(req, res),
);
router.get("/public", (req: Request, res: Response) =>
  businessController.getBusiness(req, res),
);
router.get("/public/bank-info", (req: Request, res: Response) =>
  businessController.getBusiness(req, res),
);
router.get("/theme", (req: Request, res: Response) =>
  businessController.getActivePalette(req, res),
);
router.patch(
  "/palette",
  requireAuth,
  requireRole([1]),
  (req: Request, res: Response) =>
    businessController.setActivePalette(req, res),
);
export default router;
