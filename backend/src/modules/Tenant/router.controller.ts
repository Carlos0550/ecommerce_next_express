import { Request, Response } from 'express';
import TenantServices from './services/tenant.services';

class TenantController {
  /**
   * GET /api/tenant/:slug
   * Obtiene información pública de un tenant
   */
  async getPublicTenantInfo(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      
      if (!slug) {
        return res.status(400).json({ ok: false, error: 'slug_required' });
      }
      
      const tenant = await TenantServices.getPublicTenantInfo(slug);
      
      if (!tenant) {
        return res.status(404).json({ ok: false, error: 'tenant_not_found' });
      }
      
      return res.status(200).json({ ok: true, data: tenant });
    } catch (error) {
      console.error('getPublicTenantInfo error:', error);
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  }

  /**
   * GET /api/tenant/check-slug/:slug
   * Verifica si un slug está disponible
   */
  async checkSlugAvailability(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      
      if (!slug) {
        return res.status(400).json({ ok: false, error: 'slug_required' });
      }
      
      const normalized = TenantServices.normalizeSlug(slug);
      const available = await TenantServices.isSlugAvailable(slug);
      
      return res.status(200).json({ 
        ok: true, 
        data: { 
          slug: normalized,
          available 
        } 
      });
    } catch (error) {
      console.error('checkSlugAvailability error:', error);
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  }

  /**
   * POST /api/tenant/register
   * Registra un nuevo tenant con admin
   */
  async registerTenant(req: Request, res: Response) {
    try {
      const { email, password, name, storeName } = req.body;
      
      
      if (!email || !password || !name || !storeName) {
        return res.status(400).json({ 
          ok: false, 
          error: 'missing_fields',
          message: 'Se requieren: email, password, name, storeName'
        });
      }
      
      if (password.length < 6) {
        return res.status(400).json({
          ok: false,
          error: 'password_too_short',
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
      }
      
      if (storeName.trim().length < 2) {
        return res.status(400).json({
          ok: false,
          error: 'store_name_too_short',
          message: 'El nombre de la tienda debe tener al menos 2 caracteres'
        });
      }
      
      const result = await TenantServices.registerTenant({
        email,
        password,
        name,
        storeName: storeName.trim(),
      });
      
      return res.status(201).json({
        ok: true,
        data: {
          tenant: result.tenant,
          admin: result.admin,
          token: result.token,
          slugWasModified: result.slugWasModified,
        },
        message: result.slugWasModified 
          ? `Pragmatienda estará disponible en: ${result.tenant.slug}. Puedes cambiarlo desde configuración.`
          : 'Registro exitoso'
      });
    } catch (error) {
      console.error('registerTenant error:', error);
      
      if (error instanceof Error) {
        if (error.message === 'EMAIL_ALREADY_REGISTERED') {
          return res.status(400).json({
            ok: false,
            error: 'email_already_registered',
            message: 'Este email ya está registrado'
          });
        }
      }
      
      return res.status(500).json({ ok: false, error: 'registration_failed' });
    }
  }

  /**
   * PATCH /api/tenant/slug
   * Actualiza el slug del tenant (requiere autenticación)
   */
  async updateSlug(req: Request, res: Response) {
    try {
      const tenantId = (req as any).tenantId;
      const { slug } = req.body;
      
      if (!tenantId) {
        return res.status(401).json({ ok: false, error: 'unauthorized' });
      }
      
      if (!slug) {
        return res.status(400).json({ ok: false, error: 'slug_required' });
      }
      
      const result = await TenantServices.updateSlug(tenantId, slug);
      
      if (!result.success) {
        const messages: Record<string, string> = {
          'SLUG_TOO_SHORT': 'El slug debe tener al menos 3 caracteres',
          'SLUG_ALREADY_TAKEN': 'Este slug ya está en uso por otra tienda',
        };
        
        return res.status(400).json({
          ok: false,
          error: result.error,
          message: messages[result.error!] || 'Error al actualizar slug'
        });
      }
      
      return res.status(200).json({
        ok: true,
        data: { slug: result.slug },
        message: 'Slug actualizado correctamente'
      });
    } catch (error) {
      console.error('updateSlug error:', error);
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  }

  /**
   * GET /api/tenant/preview-slug/:storeName
   * Preview del slug que se generaría para un nombre de tienda
   */
  async previewSlug(req: Request, res: Response) {
    try {
      const { storeName } = req.params;
      
      if (!storeName) {
        return res.status(400).json({ ok: false, error: 'store_name_required' });
      }
      
      const slug = TenantServices.normalizeSlug(decodeURIComponent(storeName));
      const available = await TenantServices.isSlugAvailable(slug);
      
      return res.status(200).json({
        ok: true,
        data: {
          storeName: decodeURIComponent(storeName),
          slug,
          available
        }
      });
    } catch (error) {
      console.error('previewSlug error:', error);
      return res.status(500).json({ ok: false, error: 'internal_error' });
    }
  }
}

export default new TenantController();


