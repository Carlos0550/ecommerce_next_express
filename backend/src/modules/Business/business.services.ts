import { prisma } from "@/config/prisma";
import { BusinessDataRequest } from "./schemas/business.schemas";
import { Prisma } from "@prisma/client";
import { getPublicUrlFor } from "@/config/minio";

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
        return business;
    }

    async updateBusiness(id: string, payload: BusinessDataRequest) {
        try {
            const existing = await prisma.businessData.findUnique({
                where: { id },
                include: { bankData: true }
            });
            if (!existing) {
                throw new Error("BUSINESS_NOT_FOUND");
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
                    bankData: Array.isArray(payload.bankData) && payload.bankData.length > 0
                        ? {
                            deleteMany: {},
                            create: payload.bankData.map(b => ({
                                bank_name: b.bank_name,
                                account_number: b.account_number,
                                account_holder: b.account_holder,
                                tenantId: existing.tenantId
                            }))
                        }
                        : { deleteMany: {} },
                },
                include: { bankData: true }
            });

            return updated;
        } catch (e) {
            console.error('BusinessServices.updateBusiness error:', e);
            throw e;
        }
    }

    async updateBusinessWithTenant(id: string, payload: BusinessDataRequest, tenantId: string) {
        try {
            const existing = await prisma.businessData.findFirst({
                where: { id, tenantId },
                include: { bankData: true }
            });
            if (!existing) {
                throw new Error("BUSINESS_NOT_FOUND");
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
            include: { bankData: true },
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
