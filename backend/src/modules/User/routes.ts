import { Router } from "express";
import { prisma } from "@/config/prisma";
import { login, createUser, CreateUserController } from "./routes.controller";
import AuthServices from "./services/auth_services";
import { requireAuth, requireRole } from "@/middlewares/auth.middleware";
const authServices = new AuthServices();
const router = Router();
router.post("/login", login, (req, res) => authServices.loginAdmin(req, res));
router.post("/register", createUser, (req, res) =>
  authServices.registerShop(req, res),
);
router.post(
  "/new",
  requireAuth,
  requireRole([1]),
  CreateUserController,
  authServices.newUser,
);
router.get("/auth/users", requireAuth, requireRole([1]), (req, res) =>
  authServices.getUsers(req, res),
);
router.put(
  "/auth/users/:id/disable",
  requireAuth,
  requireRole([1]),
  (req, res) => authServices.disableUser(req, res),
);
router.put(
  "/auth/users/:id/enable",
  requireAuth,
  requireRole([1]),
  (req, res) => authServices.enableUser(req, res),
);
router.delete("/auth/users/:id", requireAuth, requireRole([1]), (req, res) =>
  authServices.deleteUser(req, res),
);
router.get("/validate-token", requireAuth, async (req, res) => {
  const userClaim = (req as any).user;
  const is_admin = userClaim.subjectType === "admin";
  let userRecord: any;
  if (is_admin) {
    const rows: any[] =
      await prisma.$queryRaw`SELECT is_active FROM "Admin" WHERE id = ${Number(userClaim.sub || userClaim.id)} LIMIT 1`;
    userRecord = rows[0];
  } else {
    userRecord = await prisma.user.findUnique({
      where: { id: Number(userClaim.sub || userClaim.id) },
      select: { is_active: true },
    });
  }
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
});
export default router;
