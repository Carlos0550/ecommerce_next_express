import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "@/config/jwt";
import { prisma } from "@/config/prisma";
export type AuthUser = JwtPayload & {
  email?: string;
  name?: string;
  role?: number;
  profileImage?: string;
  subjectType?: "admin" | "user";
  is_active?: boolean;
};
function getBearerToken(req: Request): string | null {
  const header =
    req.headers["authorization"] ||
    (req.headers["Authorization"] as string | undefined);
  if (!header) return null;
  const parts = header.split(" ");
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;
  return token;
}
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: "missing_bearer_token" });
    }
    let payload: AuthUser;
    try {
      payload = verifyToken<AuthUser>(token);
    } catch (err) {
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }
    const userId = Number(payload.sub || payload.id);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }
    const isAdmin =
      payload.subjectType === "admin" || Number(payload.role || 2) === 1;
    if (isAdmin) {
      const rows: any[] =
        await prisma.$queryRaw`SELECT id, is_active FROM "Admin" WHERE id = ${userId} LIMIT 1`;
      const admin = rows[0];
      if (!admin) {
        return res.status(401).json({ ok: false, error: "user_not_found" });
      }
      if (!admin.is_active) {
        return res.status(403).json({ ok: false, error: "account_inactive" });
      }
      payload.is_active = true;
    } else {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, is_active: true },
      });
      if (!user) {
        return res.status(401).json({ ok: false, error: "user_not_found" });
      }
      if (!user.is_active) {
        return res.status(403).json({ ok: false, error: "account_inactive" });
      }
      payload.is_active = true;
    }
    (req as any).user = payload;
    next();
  } catch (error) {
    console.error("auth_middleware_error", error);
    return res.status(500).json({ ok: false, error: "auth_internal_error" });
  }
}
export function requireRole(roles: number[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) {
      return res.status(401).json({ ok: false, error: "unauthenticated" });
    }
    const role = user.role ?? 2;
    if (!roles.includes(role)) {
      return res.status(403).json({ ok: false, error: "forbidden" });
    }
    next();
  };
}
export async function attachAuthIfPresent(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const token = getBearerToken(req);
    if (!token) return next();
    try {
      const payload = verifyToken<AuthUser>(token);
      const userId = Number(payload.sub || payload.id);
      if (!Number.isFinite(userId)) return next();
      const isAdmin =
        payload.subjectType === "admin" || Number(payload.role || 2) === 1;
      if (isAdmin) {
        const rows: any[] =
          await prisma.$queryRaw`SELECT id, is_active FROM "Admin" WHERE id = ${userId} LIMIT 1`;
        const admin = rows[0];
        if (!admin?.is_active) return next();
      } else {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, is_active: true },
        });
        if (!user?.is_active) return next();
      }
      payload.is_active = true;
      (req as any).user = payload;
    } catch {
    }
    return next();
  } catch {
    return next();
  }
}
