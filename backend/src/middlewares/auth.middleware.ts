import type { Request, Response, NextFunction } from "express";
import type { JwtPayload } from "@/config/jwt";
import { verifyToken } from "@/config/jwt";
import { prisma } from "@/config/prisma";

export type AuthRole = "ADMIN" | "CUSTOMER";

export type AuthUser = JwtPayload & {
  email?: string;
  name?: string;
  role?: AuthRole | number;
  profileImage?: string;
  subjectType?: "admin" | "user";
  is_active?: boolean;
};

export function normalizeRole(role: AuthRole | number | undefined): AuthRole {
  if (role === "ADMIN" || role === 1) return "ADMIN";
  return "CUSTOMER";
}

function getBearerToken(req: Request): string | null {
  const header =
    req.headers.authorization ||
    (req.headers.Authorization as string | undefined);
  if (!header) return null;
  const parts = header.split(" ");
  if (parts.length !== 2) return null;
  const scheme = parts[0];
  const token = parts[1];
  if (!scheme || !token) return null;
  if (!/^Bearer$/i.test(scheme)) return null;
  return token;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ ok: false, error: "missing_bearer_token" });
      return;
    }
    let payload: AuthUser;
    try {
      payload = verifyToken<AuthUser>(token);
    } catch {
      res.status(401).json({ ok: false, error: "invalid_token" });
      return;
    }
    const userId = Number(payload.sub || payload.id);
    if (!Number.isFinite(userId)) {
      res.status(401).json({ ok: false, error: "invalid_token" });
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, is_active: true, role: true },
    });
    if (!user) {
      res.status(401).json({ ok: false, error: "user_not_found" });
      return;
    }
    if (!user.is_active) {
      res.status(403).json({ ok: false, error: "account_inactive" });
      return;
    }
    payload.is_active = true;
    (req as any).user = payload;
    next();
  } catch (error) {
    console.error("auth_middleware_error", error);
    res.status(500).json({ ok: false, error: "auth_internal_error" });
  }
}

export function requireRole(roles: (AuthRole | number)[]) {
  const allowed = new Set<AuthRole>(roles.map((r) => normalizeRole(r)));
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ ok: false, error: "unauthenticated" });
      return;
    }
    const role = normalizeRole(user.role);
    if (!allowed.has(role)) {
      res.status(403).json({ ok: false, error: "forbidden" });
      return;
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
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, is_active: true },
      });
      if (!user?.is_active) return next();
      payload.is_active = true;
      (req as any).user = payload;
    } catch {
      // token inválido o expirado — continuar sin auth
    }
    return next();
  } catch {
    return next();
  }
}
