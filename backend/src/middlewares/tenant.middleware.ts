import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/prisma';

/**
 * Extiende el request con información del tenant
 */
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSlug?: string;
    }
  }
}

/**
 * Resuelve el tenant desde múltiples fuentes:
 * 1. Header 'x-tenant-slug' (para shop público)
 * 2. Header 'x-tenant-id' (para admin autenticado)
 * 3. Usuario autenticado (si tiene tenantId en el JWT)
 * 
 * NO bloquea si no encuentra tenant, solo adjunta si lo encuentra.
 * Usar requireTenant() después si el tenant es obligatorio.
 */
export async function resolveTenant(req: Request, _res: Response, next: NextFunction) {
  try {
    
    const tenantSlug = req.headers['x-tenant-slug'] as string | undefined;
    if (tenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: tenantSlug, is_active: true },
        select: { id: true, slug: true }
      });
      if (tenant) {
        req.tenantId = tenant.id;
        req.tenantSlug = tenant.slug;
        return next();
      }
    }

    
    const tenantIdHeader = req.headers['x-tenant-id'] as string | undefined;
    if (tenantIdHeader) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantIdHeader, is_active: true },
        select: { id: true, slug: true }
      });
      if (tenant) {
        req.tenantId = tenant.id;
        req.tenantSlug = tenant.slug;
        return next();
      }
    }

    
    const user = (req as any).user;
    if (user?.tenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId, is_active: true },
        select: { id: true, slug: true }
      });
      if (tenant) {
        req.tenantId = tenant.id;
        req.tenantSlug = tenant.slug;
        return next();
      }
    }

    
    next();
  } catch (error) {
    console.error('tenant_middleware_error', error);
    next();
  }
}

/**
 * Requiere que el tenant esté presente en el request.
 * Usar DESPUÉS de resolveTenant() o requireAuth().
 */
export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(400).json({ 
      ok: false, 
      error: 'tenant_required',
      message: 'No se pudo identificar el tenant. Verifica el subdominio o tu sesión.'
    });
  }
  next();
}

/**
 * Resuelve el tenant SOLO desde el slug del header.
 * Útil para endpoints públicos del shop que no tienen autenticación.
 */
export async function resolveTenantFromSlug(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantSlug = req.headers['x-tenant-slug'] as string | undefined;
    
    if (!tenantSlug) {
      return res.status(400).json({
        ok: false,
        error: 'missing_tenant_slug',
        message: 'Se requiere el header x-tenant-slug'
      });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug, is_active: true },
      select: { id: true, slug: true }
    });

    if (!tenant) {
      return res.status(404).json({
        ok: false,
        error: 'tenant_not_found',
        message: 'No se encontró una tienda con ese identificador'
      });
    }

    req.tenantId = tenant.id;
    req.tenantSlug = tenant.slug;
    next();
  } catch (error) {
    console.error('resolve_tenant_from_slug_error', error);
    return res.status(500).json({ ok: false, error: 'tenant_resolution_error' });
  }
}

/**
 * Valida que el recurso pertenece al tenant del request.
 * Útil para validar antes de operaciones de lectura/escritura.
 */
export function validateResourceTenant(resourceTenantId: string | null | undefined, req: Request): boolean {
  if (!req.tenantId) return false;
  if (!resourceTenantId) return false;
  return resourceTenantId === req.tenantId;
}


