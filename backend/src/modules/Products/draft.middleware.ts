import type { NextFunction, Request, Response } from "express";
import path from "path";
import {
  saveDraft,
  deleteDraft,
  deleteTempFile,
  ProductDraft,
  TEMP_UPLOADS_DIR,
} from "./services/draft.service";

const textField = (v: unknown): string | undefined => {
  if (typeof v !== "string") return undefined;
  return v;
};

async function persistFromReq(
  req: Request,
  productIdFromParams?: string,
): Promise<string | null> {
  const userId = String((req as any).user?.sub || "");
  if (!userId) return null;
  const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
  const image = files[0];
  if (!image) return null;
  const tempId = path.parse(image.filename).name;
  const body = req.body as Record<string, unknown>;
  const existingImageUrlsRaw =
    (body.existingImageUrls as string | undefined) ??
    (body.existing_image_urls as string | undefined);
  const deletedImageUrlsRaw =
    (body.deletedImageUrls as string | undefined) ??
    (body.deleted_image_urls as string | undefined);
  const draft: ProductDraft = {
    tempId,
    userId,
    title: textField(body.title) ?? "",
    description: textField(body.description),
    price: (body.price as string | number | undefined) ?? "",
    stock: (body.stock as string | number | undefined) ?? "",
    category_id: textField(body.category_id),
    sku: textField(body.sku),
    imagePath: image.path,
    imageMime: image.mimetype || "application/octet-stream",
    createdAt: Date.now(),
    ...(existingImageUrlsRaw ? { existingImageUrls: existingImageUrlsRaw } : {}),
    ...(deletedImageUrlsRaw ? { deletedImageUrls: deletedImageUrlsRaw } : {}),
    ...(productIdFromParams ? { productId: productIdFromParams } : {}),
  };
  await saveDraft(draft);
  return tempId;
}

export const persistProductDraft = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await persistFromReq(req);
    next();
  } catch (err) {
    next();
  }
};

export const persistUpdateProductDraft = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const raw = req.params.product_id;
    const productId = typeof raw === "string" ? raw : raw?.[0];
    await persistFromReq(req, productId);
    next();
  } catch (err) {
    next();
  }
};

export async function cleanupDraftAfterSuccess(req: Request): Promise<void> {
  const userId = String((req as any).user?.sub || "");
  const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
  const image = files[0];
  if (!image) return;
  const tempId = path.parse(image.filename).name;
  await deleteDraft(tempId, userId);
  if (image.path && image.path.startsWith(TEMP_UPLOADS_DIR)) {
    await deleteTempFile(image.path);
  }
}
