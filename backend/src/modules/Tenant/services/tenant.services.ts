import { prisma } from '@/config/prisma';
import { hashPassword } from '@/config/bcrypt';
import { signToken } from '@/config/jwt';
import { redis } from '@/config/redis';
import { tenantPlan } from '@prisma/client';

export interface RegisterTenantInput {
  email: string;
  password: string;
  name: string;        
  storeName: string;   
}

export interface RegisterTenantResult {
  tenant: {
    id: string;
    slug: string;
    name: string;
    plan: tenantPlan;
  };
  admin: {
    id: number;
    email: string;
    name: string;
  };
  token: string;
  slugWasModified: boolean;
}

export class TenantServices {
  /**
   * Normaliza un nombre de tienda para convertirlo en slug
   * "Cinnamon Makeup" -> "cinnamon-makeup"
   */
  normalizeSlug(storeName: string): string {
    return storeName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') 
      .replace(/[^a-z0-9]+/g, '-')     
      .replace(/^-+|-+$/g, '');        
  }

  /**
   * Genera un slug único para el tenant
   * Intenta con el slug base, luego variantes, luego aleatorio
   */
  async generateUniqueSlug(storeName: string): Promise<string> {
    const baseSlug = this.normalizeSlug(storeName);
    
    
    const slug = baseSlug || 'tienda';
    
    
    const exists = await prisma.tenant.findUnique({ where: { slug } });
    if (!exists) return slug;
    
    
    for (let i = 1; i <= 100; i++) {
      const variant = `${slug}-${i}`;
      const variantExists = await prisma.tenant.findUnique({ where: { slug: variant } });
      if (!variantExists) return variant;
    }
    
    
    const random = Math.random().toString(36).substring(2, 8);
    return `${slug}-${random}`;
  }

  /**
   * Verifica si un slug está disponible
   */
  async isSlugAvailable(slug: string): Promise<boolean> {
    const normalized = this.normalizeSlug(slug);
    if (!normalized) return false;
    
    const exists = await prisma.tenant.findUnique({ 
      where: { slug: normalized },
      select: { id: true }
    });
    return !exists;
  }

  /**
   * Registra un nuevo tenant con su admin y datos de negocio
   */
  async registerTenant(data: RegisterTenantInput): Promise<RegisterTenantResult> {
    const { email, password, name, storeName } = data;
    
    
    const existingAdmin = await prisma.admin.findFirst({
      where: { email },
      select: { id: true }
    });
    
    if (existingAdmin) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }
    
    
    const slug = await this.generateUniqueSlug(storeName);
    const expectedSlug = this.normalizeSlug(storeName);
    const slugWasModified = slug !== expectedSlug;
    
    
    const hashedPassword = await hashPassword(password);
    
    
    const result = await prisma.$transaction(async (tx) => {
      
      const tenant = await tx.tenant.create({
        data: {
          name: storeName,
          slug: slug,
          plan: 'FREE',
          is_active: true,
        }
      });
      
      
      const admin = await tx.admin.create({
        data: {
          email: email,
          password: hashedPassword,
          name: name.trim().toLowerCase(),
          tenantId: tenant.id,
          role: 1,
          is_active: true,
        }
      });
      
      
      await tx.businessData.create({
        data: {
          name: storeName,
          email: email,
          phone: '',
          address: '',
          city: '',
          state: '',
          tenantId: tenant.id,
        }
      });
      
      return { tenant, admin };
    });
    
    
    const payload = {
      sub: result.admin.id.toString(),
      email: result.admin.email,
      name: result.admin.name,
      role: 1,
      subjectType: 'admin' as const,
      tenantId: result.tenant.id,
    };
    const token = signToken(payload);
    
    
    await redis.set(`user:${token}`, JSON.stringify(payload), 'EX', 60 * 60 * 24);
    
    return {
      tenant: {
        id: result.tenant.id,
        slug: result.tenant.slug,
        name: result.tenant.name,
        plan: result.tenant.plan,
      },
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        name: result.admin.name,
      },
      token,
      slugWasModified,
    };
  }

  /**
   * Obtiene información pública de un tenant por slug
   */
  async getPublicTenantInfo(slug: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug, is_active: true },
      select: {
        id: true,
        slug: true,
        name: true,
        business: {
          select: {
            name: true,
            description: true,
            business_image: true,
            favicon: true,
            phone: true,
            email: true,
            address: true,
            city: true,
            state: true,
            type: true,
          }
        },
        colors: {
          where: { use_for_shop: true, is_active: true },
          select: {
            id: true,
            name: true,
            colors: true,
          },
          take: 1,
        }
      }
    });
    
    if (!tenant) return null;
    
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      business: tenant.business,
      palette: tenant.colors[0] || null,
    };
  }

  /**
   * Actualiza el slug de un tenant
   */
  async updateSlug(tenantId: string, newSlug: string): Promise<{ success: boolean; slug?: string; error?: string }> {
    const normalized = this.normalizeSlug(newSlug);
    
    if (!normalized || normalized.length < 3) {
      return { success: false, error: 'SLUG_TOO_SHORT' };
    }
    
    
    const existing = await prisma.tenant.findUnique({ 
      where: { slug: normalized },
      select: { id: true }
    });
    
    if (existing && existing.id !== tenantId) {
      return { success: false, error: 'SLUG_ALREADY_TAKEN' };
    }
    
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { slug: normalized }
    });
    
    return { success: true, slug: normalized };
  }
}

export default new TenantServices();


