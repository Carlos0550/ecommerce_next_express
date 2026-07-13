import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { prisma } from "@/config/prisma";
import { login, createUser, CreateUserController } from "./routes.controller";
import AuthServices from "./services/auth_services";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";

const authServices = new AuthServices();
const router = Router();

router.post("/login", login, asyncHandler(async (req, res) => {
  const result = await authServices.loginAdmin(req, res);
  res.json(result);
}));

router.post("/register", createUser, asyncHandler(async (req, res) => {
  const result = await authServices.registerShop(req, res);
  res.json(result);
}));

router.post(
  "/new",
  requireAuth,
  requireRole(["ADMIN"]),
  CreateUserController,
  asyncHandler(async (req, res) => {
    const result = await authServices.newUser(req, res);
    res.json(result);
  }),
);

router.get("/auth/users", requireAuth, requireRole(["ADMIN"]), asyncHandler(async (req, res) => {
  const result = await authServices.getUsers(req, res);
  res.json(result);
}));

router.put(
  "/auth/users/:id/disable",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const result = await authServices.disableUser(req, res);
    res.json(result);
  }),
);

router.put(
  "/auth/users/:id/enable",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const result = await authServices.enableUser(req, res);
    res.json(result);
  }),
);

router.delete(
  "/auth/users/:id",
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const result = await authServices.deleteUser(req, res);
    res.json(result);
  }),
);

router.get("/validate-token", requireAuth, asyncHandler(async (req, res) => {
  const userClaim = (req as any).user;
  const userRecord = await prisma.user.findUnique({
    where: { id: Number(userClaim.sub || userClaim.id) },
    select: { is_active: true },
  });
  res.json({
    ok: true,
    id: userClaim.sub || userClaim.id,
    email: userClaim.email,
    name: userClaim.name,
    is_active: !!userRecord?.is_active,
    role: userClaim.role,
    profileImage: userClaim.profileImage || null,
    subjectType: userClaim.subjectType,
  });
}));

export default router;