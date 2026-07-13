import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import AuthServices from "@/modules/User/services/auth_services";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";

const router = Router();
const authServices = new AuthServices();

router.post("/login", asyncHandler(async (req, res) => {
  const result = await authServices.loginAdmin(req, res);
  res.json(result);
}));

router.post(
  "/register",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const result = await authServices.registerAdmin(req, res);
    res.json(result);
  }),
);

router.post("/password/reset", asyncHandler(async (req, res) => {
  const result = await authServices.resetPasswordAdmin(req, res);
  res.json(result);
}));

router.post(
  "/password/change",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const result = await authServices.changePasswordAdmin(req, res);
    res.json(result);
  }),
);

router.get("/validate-token", requireAuth, requireRole(["ADMIN"]), (req, res) => {
  const user = (req as any).user;
  res.json({
    ok: true,
    id: user.sub || user.id,
    email: user.email,
    name: user.name,
    is_active: user.is_active ?? true,
    role: user.role || 1,
    profileImage: user.profileImage || null,
    is_clerk: !!user.is_clerk,
    subjectType: user.subjectType || "admin",
  });
});

export default router;