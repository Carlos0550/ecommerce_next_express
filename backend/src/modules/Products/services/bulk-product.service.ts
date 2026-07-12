import type { Request, Response } from "express";
import { uploadImage, deleteImage } from "@/config/minio";
import fs from "fs";
import { prisma } from "@/config/prisma";
import { ProductState } from "@prisma/client";
import { analyzeProductImages } from "@/config/openrouter";
import { logger } from "@/utils/logger";
import { BadRequestError, errors } from "@/utils/errors";

export interface BulkSlotInput {
  title?: unknown;
  price?: unknown;
  category_id?: unknown;
  description?: unknown;
}

export interface BulkSlotResult {
  index: number;
  status: "ok" | "error";
  productId?: string;
  message?: string;
}

export interface BulkSavePayload {
  slots: BulkSlotInput[];
}

function asString(v: unknown): string | undefined {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim().length > 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export async function bulkSaveProducts(req: Request, _res: Response) {
  const raw = req.body?.slots;
  let slots: BulkSlotInput[] = [];
  if (Array.isArray(raw)) {
    slots = raw;
  } else if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) slots = parsed;
    } catch {
      throw new BadRequestError("slots debe ser JSON válido", undefined, "invalid_slots");
    }
  }
  if (slots.length === 0) {
    throw new BadRequestError("No se recibieron productos para crear", undefined, "empty_slots");
  }
  const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
  if (files.length !== slots.length) {
    throw new BadRequestError(
      `La cantidad de imágenes (${files.length}) no coincide con la cantidad de productos (${slots.length})`,
      undefined,
      "files_mismatch",
    );
  }

  const userId = (req as any).user?.sub;

  const results: BulkSlotResult[] = [];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i] ?? {};
    const file = files[i];
    if (!file) {
      results.push({
        index: i,
        status: "error",
        message: "Imagen faltante",
      });
      continue;
    }

    const title = asString(slot.title);
    const price = asNumber(slot.price);
    const category_id = asString(slot.category_id);
    const description = asString(slot.description);

    if (!title) {
      results.push({
        index: i,
        status: "error",
        message: "Título requerido",
      });
      continue;
    }
    if (price === undefined || price < 0) {
      results.push({
        index: i,
        status: "error",
        message: "Precio inválido",
      });
      continue;
    }

    let imageUrls: string[] = [];
    const uploadedPaths: string[] = [];
    try {
      const fileName = `product-${Date.now()}-${i}-${Math.round(Math.random() * 1e9)}`;
      const buffer: Buffer =
        (file as any).buffer ?? fs.readFileSync((file as any).path);
      const result = await uploadImage(
        buffer,
        fileName,
        "products",
        file.mimetype,
      );
      if (!result.url) throw errors.imageUploadFailed();
      uploadedPaths.push(`products/${fileName}`);
      imageUrls = [result.url];

      let finalDescription = description ?? "";
      let finalOptions: { name: string; values: string[] }[] = [];
      try {
        const ai = await analyzeProductImages(
          imageUrls,
          `Título del producto: ${title}`,
          undefined,
          { userId },
        );
        if (!description) finalDescription = ai.description || "";
        finalOptions = Array.isArray(ai.options) ? ai.options : [];
      } catch (err) {
        logger.warn("bulk_ai_failed", {
          index: i,
          msg: err instanceof Error ? err.message : String(err),
        });
      }

      const stock = 1;
      const productState: ProductState = ProductState.active;

      const product = await prisma.products.create({
        data: {
          title,
          description: finalDescription,
          price,
          tags: [],
          ...(category_id ? { category: { connect: { id: category_id } } } : {}),
          images: imageUrls,
          state: productState,
          stock,
          options: finalOptions,
        },
      });

      results.push({
        index: i,
        status: "ok",
        productId: product.id,
      });
    } catch (err) {
      await Promise.all(
        uploadedPaths.map((p) =>
          deleteImage(p).catch((rollbackErr) =>
            logger.warn("bulk_image_rollback_failed", {
              index: i,
              err: rollbackErr,
              path: p,
            }),
          ),
        ),
      );
      results.push({
        index: i,
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo crear el producto",
      });
    }
  }

  const created = results.filter((r) => r.status === "ok").length;
  const failed = results.length - created;

  return {
    ok: failed === 0,
    created,
    failed,
    results,
  };
}