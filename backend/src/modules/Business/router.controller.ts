import { Request, Response } from "express";
import { BusinessDataRequest } from "./schemas/business.schemas";
import businessServices from "./business.services";
import { generateBusinessDescription } from "@/config/groq";
import { uploadToBucket, getPublicUrlFor } from "@/config/minio";
import fs from "fs";
import { logger } from "@/utils/logger";

class BusinessController {
    async uploadImage(req: Request, res: Response) {
        try {
            const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
            
            if (!tenantId) {
                return res.status(400).json({ error: "tenant_required" });
            }
            
            const file = (req as any).file as Express.Multer.File | undefined;
            if (!file) {
                return res.status(400).json({ error: "No se proporcionó ningún archivo" });
            }
            const fieldRaw = (req.query.field as string) || (req.body as any)?.field || 'business_image';
            const field = fieldRaw === 'favicon' ? 'favicon' : 'business_image';
            const idParam = (req.query.id as string) || (req.body as any)?.id;
            const buffer: Buffer = file.buffer ?? fs.readFileSync(file.path);
            const timestamp = Date.now();
            const uniqueName = `business-${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
            
            const uploaded = await uploadToBucket(
                buffer,
                uniqueName,
                "business",
                "images",
                file.mimetype
            );

            if (!uploaded.path) {
                return res.status(500).json({ error: "Error al subir la imagen" });
            }

            let id = idParam;
            if (!id) {
                const current = await businessServices.getBusinessByTenantId(tenantId);
                id = current?.id;
            }
            const publicUrl = getPublicUrlFor("business", uploaded.path);
            if (id) {
                await businessServices.updateImageField(id, field as any, publicUrl);
            }
            return res.json({
                success: true,
                url: publicUrl,
                field,
                id
            });
        } catch (error) {
            console.error("uploadImage_error", error);
            return res.status(500).json({ error: "Error al procesar la imagen" });
        }
    }

    async generateDescription(req: Request, res: Response) {
        try {
            const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
            
            if (!tenantId) {
                return res.status(400).json({ error: "tenant_required" });
            }
            
            const { name, city, province, type, actualDescription } = req.body;
            logger.info("generateDescription_body", req.body);
            if (!name || !city) {
                return res.status(400).json({ error: "Nombre y ciudad son requeridos" });
            }
            let finalType: string | undefined = type;
            if (!finalType) {
                const current = await businessServices.getBusinessByTenantId(tenantId);
                finalType = (current as any)?.type || undefined;
            }
            const description = await generateBusinessDescription(name, city, province, finalType, actualDescription);
            return res.json({ description });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Error generando descripción" });
        }
    }

    async createBusiness(req: Request, res: Response) {
        const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ error: "tenant_required" });
        }
        
        const payload = req.body as BusinessDataRequest;

        if(!Array.isArray(payload.bankData) || payload.bankData.length === 0) {
            return res.status(400).json({ error: "Los datos bancarios no son válidos" });
        }

        if(!payload.name || !payload.email || !payload.phone || !payload.city || !payload.state) {
            return res.status(400).json({ error: "Todos los campos son requeridos: Nombre del negocio, email, teléfono, ciudad y estado/provincia" });
        }
        const business = await businessServices.createBusinessWithTenant(payload, tenantId);
        res.status(201).json(business);
    }

    async updateBusiness(req: Request, res: Response) {
        try {
            const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
            
            if (!tenantId) {
                return res.status(400).json({ error: "tenant_required" });
            }
            
            const { id } = req.params as { id: string };
            const payload = req.body as BusinessDataRequest;

            if(!payload.name || !payload.email || !payload.phone  || !payload.city || !payload.state) {
                return res.status(400).json({ error: "Todos los campos son requeridos: Nombre del negocio, email, teléfono, ciudad y estado/provincia" });
            }

            const business = await businessServices.updateBusinessWithTenant(id, payload, tenantId);
            return res.status(200).json(business);
        } catch (error) {
            console.error('updateBusiness_error', error);
            if (error instanceof Error && error.message === "BUSINESS_NOT_FOUND") {
                return res.status(404).json({ error: "Negocio no encontrado" });
            }
            return res.status(500).json({ error: "Error al actualizar los datos del negocio" });
        }
    }

    async getBusiness(req: Request, res: Response) {
        try {
            const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
            
            if (!tenantId) {
                return res.status(400).json({ error: "tenant_required" });
            }
            
            const data = await businessServices.getBusinessByTenantId(tenantId);
            if (!data) {
                return res.status(404).json({ error: "Negocio no configurado" });
            }
            return res.status(200).json(data);
        } catch {
            return res.status(500).json({ error: "Error al obtener la información del negocio" });
        }
    }

    async getBusinessPublic(req: Request, res: Response) {
        try {
            const tenantId = (req as any).tenantId;
            
            if (!tenantId) {
                return res.status(400).json({ error: "tenant_required" });
            }
            
            const data = await businessServices.getBusinessByTenantId(tenantId);
            if (!data) {
                return res.status(404).json({ error: "Negocio no configurado" });
            }
            return res.status(200).json(data);
        } catch {
            return res.status(500).json({ error: "Error al obtener la información del negocio" });
        }
    }
}

export default new BusinessController()
