import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import AuthServices from "@/modules/User/services/auth_services";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";

const router = Router();
const authServices = new AuthServices();

router.post("/login", asyncHandler(async (req, res) => {
  const result = await authServices.loginShop(req, res);
  res.json(result);
}));

router.post("/register", asyncHandler(async (req, res) => {
  const result = await authServices.registerShop(req, res);
  res.json(result);
}));

router.post("/password/reset", asyncHandler(async (req, res) => {
  const result = await authServices.resetPasswordShop(req, res);
  res.json(result);
}));

router.post("/password/change", requireAuth, asyncHandler(async (req, res) => {
  const result = await authServices.changePasswordShop(req, res);
  res.json(result);
}));

router.get("/validate-token", requireAuth, requireRole([2]), (req, res) => {
  const user = (req as any).user;
  res.json({
    ok: true,
    id: user.sub || user.id,
    email: user.email,
    name: user.name,
    is_active: user.is_active ?? true,
    role: user.role || 2,
    profileImage: user.profileImage || null,
    subjectType: user.subjectType || "user",
  });
});

export default router;