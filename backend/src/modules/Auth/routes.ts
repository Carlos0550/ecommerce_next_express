import { Router } from "express";
import { requireAuth } from "@/middlewares/auth.middleware";
import type { AuthUser } from "@/middlewares/auth.middleware";
import type { Request, Response } from "express";

const router = Router();

router.get("/validate", requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as AuthUser;

  res.json({
    id: user.sub || (user as any).id,
    email: user.email,
    name: user.name,
    is_active: true,
    role: user.role || (user.subjectType === "admin" ? 1 : 2),
    profileImage: user.profileImage || null,
    subjectType: user.subjectType || (user.role === 1 ? "admin" : "user"),
  });
});

export default router;
