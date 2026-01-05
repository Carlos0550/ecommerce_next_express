import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '@/config/jwt';
import { redis } from '@/config/redis';

export type AuthUser = JwtPayload & {
  email?: string;
  name?: string;
  role?: number;
  profileImage?: string;
  subjectType?: 'admin' | 'user';
  tenantId?: string;
};

function getBearerToken(req: Request): string | null {
  const header = req.headers['authorization'] || req.headers['Authorization'] as string | undefined;
  if (!header) return null;
  const parts = header.split(' ');
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) return null;
  return token;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: 'missing_bearer_token' });
    }

    let payload: AuthUser;
    try {
      payload = verifyToken<AuthUser>(token);
    } catch (err) {
      return res.status(401).json({ ok: false, error: 'invalid_token' });
    }

    
    const sessionKey = `user:${token}`;
    const session = await redis.get(sessionKey);
    if (!session) {
      return res.status(401).json({ ok: false, error: 'session_expired' });
    }

    
    (req as any).user = payload;
    
    
    if (payload.tenantId) {
      (req as any).tenantId = payload.tenantId;
    }
    
    next();
  } catch (error) {
    console.error('auth_middleware_error', error);
    return res.status(500).json({ ok: false, error: 'auth_internal_error' });
  }
}

export function requireRole(roles: number[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) {
      return res.status(401).json({ ok: false, error: 'unauthenticated' });
    }
    const role = user.role ?? 2;
    if (!roles.includes(role)) {
      return res.status(403).json({ ok: false, error: 'forbidden' });
    }
    next();
  };
}

export async function attachAuthIfPresent(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    if (!token) return next();
    try {
      const payload = verifyToken<AuthUser>(token);
      const session = await redis.get(`user:${token}`);
      if (!session) return next();
      (req as any).user = payload;
      
      
      if (payload.tenantId) {
        (req as any).tenantId = payload.tenantId;
      }
    } catch {
      
    }
    return next();
  } catch {
    return next();
  }
}
