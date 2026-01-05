import { Request, Response, Router } from "express"
import businessController from "./router.controller"
import { requireAuth, requireRole } from "@/middlewares/auth.middleware"
import { uploadSingleImage, handleImageUploadError } from "@/middlewares/image.middleware"
import { resolveTenantFromSlug } from "@/middlewares/tenant.middleware"

const router = Router()

router.post("/", requireAuth, requireRole([1]), (req:Request, res: Response) => businessController.createBusiness(req, res))

router.post("/upload-image", requireAuth, requireRole([1]), uploadSingleImage("file"), handleImageUploadError, (req:Request, res: Response) => businessController.uploadImage(req, res))

router.post("/generate-description", requireAuth, requireRole([1]), (req:Request, res: Response) => businessController.generateDescription(req, res))

router.put("/:id", requireAuth, requireRole([1]), (req:Request, res: Response) => businessController.updateBusiness(req, res))

router.get("/", requireAuth, requireRole([1]), (req:Request, res: Response) => businessController.getBusiness(req, res))


router.get("/public", resolveTenantFromSlug, (req:Request, res: Response) => businessController.getBusinessPublic(req, res))


export default router
