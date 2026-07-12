import type { Request, Response } from "express";
import type { BusinessDataRequest } from "./schemas/business.schemas";
import businessServices from "./business.services";
import { generateBusinessDescription } from "@/config/openrouter";
import { uploadToBucket, getPublicUrlFor } from "@/config/minio";
import fs from "fs";
import { logger } from "@/utils/logger";
import { PALETTES, isValidPaletteName } from "@/templates/palettes";
import {
  BadRequestError,
  errors,
  NotFoundError,
  StorageError,
} from "@/utils/errors";

class BusinessController {
  uploadBannerImage = async (req: Request, _res: Response): Promise<unknown> => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw new BadRequestError("No se proporcionó ningún archivo", undefined, "missing_file");
    const buffer: Buffer = file.buffer ?? fs.readFileSync(file.path);
    const timestamp = Date.now();
    const uniqueName = `banner-${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const uploaded = await uploadToBucket(
      buffer,
      uniqueName,
      "business",
      "banner",
      file.mimetype,
    );
    if (!uploaded.path) throw new StorageError("Error al subir la imagen", "image_upload_failed");
    const publicUrl = getPublicUrlFor("business", uploaded.path);
    return { success: true, url: publicUrl };
  };

  uploadImage = async (req: Request, _res: Response): Promise<unknown> => {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw new BadRequestError("No se proporcionó ningún archivo", undefined, "missing_file");
    const fieldRaw =
      (req.query.field as string) || (req.body)?.field || "business_image";
    let field: "business_image" | "favicon" | "hero_image" = "business_image";
    if (fieldRaw === "favicon") field = "favicon";
    if (fieldRaw === "hero_image") field = "hero_image";
    const idParam = (req.query.id as string) || (req.body)?.id;
    const buffer: Buffer = file.buffer ?? fs.readFileSync(file.path);
    const timestamp = Date.now();
    const uniqueName = `business-${timestamp}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const uploaded = await uploadToBucket(
      buffer,
      uniqueName,
      "business",
      "images",
      file.mimetype,
    );
    if (!uploaded.path) throw new StorageError("Error al subir la imagen", "image_upload_failed");
    const publicUrl = getPublicUrlFor("business", uploaded.path);
    let id = idParam;
    if (!id) {
      const current = await businessServices.getBusiness();
      id = current?.id;
    }
    if (id) {
      await businessServices.updateImageField(id, field, publicUrl);
    }
    return { success: true, url: publicUrl, field, id };
  };

  generateDescription = async (req: Request, _res: Response): Promise<unknown> => {
    const { name, city, province, type, actualDescription } = req.body as {
      name?: string;
      city?: string;
      province?: string;
      type?: string;
      actualDescription?: string;
    };
    logger.debug("generateDescription_body", req.body);
    if (!name || !city) throw errors.missingFields(["name", "city"]);
    let finalType: string | undefined = type;
    if (!finalType) {
      const current = await businessServices.getBusiness();
      finalType = (current)?.type || undefined;
    }
    const userId = (req as Request & { user?: { sub?: string | number } }).user?.sub;
    const description = await generateBusinessDescription(
      name,
      city,
      province ?? "",
      finalType,
      actualDescription,
      { userId },
    );
    return { description };
  };

  createBusiness = async (req: Request, _res: Response): Promise<unknown> => {
    const payload = req.body as BusinessDataRequest;
    if (
      !payload.name ||
      !payload.email ||
      !payload.phone ||
      !payload.city ||
      !payload.state
    ) {
      throw errors.missingFields(["name", "email", "phone", "city", "state"]);
    }
    return businessServices.createBusiness(payload);
  };

  updateBusiness = async (req: Request, _res: Response): Promise<unknown> => {
    const { id } = req.params as { id: string };
    const payload = req.body as BusinessDataRequest;
    if (
      !payload.name ||
      !payload.email ||
      !payload.phone ||
      !payload.city ||
      !payload.state
    ) {
      throw errors.missingFields(["name", "email", "phone", "city", "state"]);
    }
    return businessServices.updateBusiness(id, payload);
  };

  getBusiness = async (_req: Request, _res: Response): Promise<unknown> => {
    const data = await businessServices.getBusiness();
    if (!data) throw new NotFoundError("Negocio no configurado", "business_not_configured");
    return data;
  };

  getActivePalette = async (_req: Request, _res: Response): Promise<unknown> => {
    const palette = await businessServices.getActivePalette();
    return { palette };
  };

  setActivePalette = async (req: Request, _res: Response): Promise<unknown> => {
    const { palette } = req.body as { palette?: string };
    if (!palette || !isValidPaletteName(palette)) {
      throw new BadRequestError(
        `Paleta inválida. Valores: ${Object.keys(PALETTES).join(" | ")}`,
        { allowed: Object.keys(PALETTES) },
        "invalid_palette",
      );
    }
    await businessServices.setActivePalette(palette);
    return { palette };
  };
}

export default new BusinessController();