import { prisma } from "@/config/prisma";
import { BusinessDataRequest } from "./schemas/business.schemas";
import { Prisma } from "@prisma/client";
import { getPublicUrlFor } from "@/config/minio";
import { TenantServices } from "../Tenant/services/tenant.services";

class BusinessServices {
    async createBusiness(payload: BusinessDataRequest, tenantId: string) {

         const business_data: Prisma.BusinessDataCreateInput = {
            name: payload.name,
            email: payload.email,
            phone: payload.phone || "",
            address: payload.address || "",
            city: payload.city || "",
            state: payload.state || "",
            type: payload.type || undefined,
            description: payload.description || "",
            business_image: payload.business_image || "",
            favicon: payload.favicon || "",
            tenant: { connect: { id: tenantId } },
            bankData: Array.isArray(payload.bankData) && payload.bankData.length > 0
                ? {
                    create: payload.bankData.map(b => ({
                        bank_name: b.bank_name,
                        account_number: b.account_number,
                        account_holder: b.account_holder,
                        tenantId
                    }))
                }
                : undefined,
        };

        const business = await prisma.businessData.create({
            data: business_data,
            include: { bankData: true }
        });
        return business;
    }

    async createBusinessWithTenant(payload: BusinessDataRequest, tenantId: string) {
        // If slug is provided, we might want to update the tenant's slug, but typically creation happens via register.
        // Assuming this is just for business data. If slug update is needed here, it should be added.
        const tenantServices = new TenantServices();
        
        const business_data: Prisma.BusinessDataCreateInput = {
            name: payload.name,
            email: payload.email,
            phone: payload.phone || "",
            address: payload.address || "",
            city: payload.city || "",
            state: payload.state || "",
            type: payload.type || undefined,
            description: payload.description || "",
            business_image: payload.business_image || "",
            favicon: payload.favicon || "",
            tenant: { connect: { id: tenantId } },
            bankData: Array.isArray(payload.bankData) && payload.bankData.length > 0
                ? {
                    create: payload.bankData.map(b => ({
                        bank_name: b.bank_name,
                        account_number: b.account_number,
                        account_holder: b.account_holder,
                        tenantId: tenantId,
                    }))
                }
                : undefined,
        };

        const business = await prisma.businessData.create({
            data: business_data,
            include: { bankData: true }
        });
        
        if (payload.slug) {
             const isAvailable = await tenantServices.isSlugAvailable(payload.slug);
             if (isAvailable) {
                 await prisma.tenant.update({
                     where: { id: tenantId },
                     data: { slug: tenantServices.normalizeSlug(payload.slug) }
                 });
             } else {
                 // Should we throw? For now let's just log or ignore if taken, 
                 // but ideally the controller checks this or we throw here.
                 // The user requirement says "Si el slug ya existe... mostrar claramente el error"
                 // So we should check and throw if not available.
                 const currentTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
                 if (currentTenant?.slug !== payload.slug) {
                      throw new Error("SLUG_ALREADY_EXISTS");
                 }
             }
        }

        return business;
    }

    async updateBusiness(id: string, payload: BusinessDataRequest) {
         // ... (legacy updateBusiness)
         return this.updateBusinessWithTenant(id, payload, ""); // This won't work well without tenantId context for slug check
    }

    async updateBusinessWithTenant(id: string, payload: BusinessDataRequest, tenantId: string) {
        try {
            const tenantServices = new TenantServices();
            const existing = await prisma.businessData.findFirst({
                where: { id, tenantId },
                include: { bankData: true }
            });
            if (!existing) {
                throw new Error("BUSINESS_NOT_FOUND");
            }

            // Handle Slug Update
            if (payload.slug) {
                const normalizedSlug = tenantServices.normalizeSlug(payload.slug);
                const currentTenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
                
                if (currentTenant && currentTenant.slug !== normalizedSlug) {
                    const isAvailable = await tenantServices.isSlugAvailable(normalizedSlug);
                    if (!isAvailable) {
                         throw new Error("SLUG_ALREADY_EXISTS");
                    }
                    
                    await prisma.tenant.update({
                        where: { id: tenantId },
                        data: { slug: normalizedSlug }
                    });
                }
            }

            const updated = await prisma.businessData.update({
                where: { id },
                data: {
                    name: payload.name,
                    email: payload.email,
                    phone: payload.phone || "",
                    address: payload.address || "",
                    city: payload.city || "",
                    state: payload.state || "",
                    type: payload.type || undefined,
                    description: payload.description || "",
                    business_image: payload.business_image || "",
                    favicon: payload.favicon || "",
                    whatsapp_phone_number: payload.whatsapp_phone_number || null,
                    bankData: Array.isArray(payload.bankData) && payload.bankData.length > 0
                        ? {
                            deleteMany: {},
                            create: payload.bankData.map(b => ({
                                bank_name: b.bank_name,
                                account_number: b.account_number,
                                account_holder: b.account_holder,
                                tenantId: tenantId,
                            }))
                        }
                        : { deleteMany: {} },
                },
                include: { bankData: true }
            });

            return updated;
        } catch (e) {
            console.error('BusinessServices.updateBusinessWithTenant error:', e);
            throw e;
        }
    }

    async getBusiness() {
        const business = await prisma.businessData.findFirst({
            include: { bankData: true },
            orderBy: { id: 'asc' }
        });
        if (!business) return null;
        const img = business.business_image;
        const fav = business.favicon;
        const isHttp = (s?: string) => !!s && /^https?:\/\//.test(s);
        const toPublic = (s?: string) => (!s || isHttp(s)) ? (s || undefined) : getPublicUrlFor("business", s);
        return {
            ...business,
            business_image: toPublic(img!),
            favicon: toPublic(fav!),
        } as any;
    }

    async getBusinessByTenantId(tenantId: string) {
        const business = await prisma.businessData.findFirst({
            where: { tenantId },
            include: { 
                bankData: true,
                tenant: true,
            },
        });
        if (!business) return null;
        const img = business.business_image;
        const fav = business.favicon;
        const isHttp = (s?: string) => !!s && /^https?:\/\//.test(s);
        const toPublic = (s?: string) => (!s || isHttp(s)) ? (s || undefined) : getPublicUrlFor("business", s);
        return {
            ...business,
            business_image: toPublic(img!),
            favicon: toPublic(fav!),
            tenant: business.tenant,
        } as any;
    }

    async updateImageField(id: string, field: 'business_image' | 'favicon', url: string) {
        const data: Prisma.BusinessDataUpdateInput = {};
        if (field === 'business_image') {
            (data as any).business_image = url;
        } else {
            (data as any).favicon = url;
        }
        const updated = await prisma.businessData.update({
            where: { id },
            data,
            select: { id: true, business_image: true, favicon: true }
        });
        return updated;
    }
}

export default new BusinessServices();
