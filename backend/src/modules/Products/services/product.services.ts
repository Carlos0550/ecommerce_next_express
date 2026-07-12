import type { Request, Response } from "express";
import { uploadImage, deleteImage } from "@/config/minio";
import fs from "fs";
import { prisma } from "@/config/prisma";
import { CategoryStatus, ProductState } from "@prisma/client";
import type {
  UpdateCategoryStatusSchema,
  UpdateProductRequest,
  UpdateProductStatusSchema,
} from "./product.zod";
import { analyzeProductImages } from "@/config/openrouter";
import { logger } from "@/utils/logger";
import {
  AppError,
  BadRequestError,
  ConflictError,
  errors,
  NotFoundError,
  StorageError,
} from "@/utils/errors";

class ProductServices {
  async enhanceProductContent(req: Request, _res: Response) {
    const { product_id } = req.params as { product_id: string };
    const { additionalContext, imageUrls: bodyImageUrls } = req.body as {
      additionalContext?: string;
      imageUrls?: unknown;
    };
    const userId = (req as any).user?.sub;
    const product = await prisma.products.findUnique({
      where: { id: product_id },
    });
    if (!product) throw errors.productNotFound();
    const providedUrls: string[] = Array.isArray(bodyImageUrls)
      ? (bodyImageUrls).filter((u) => typeof u === "string" && u.length > 0)
      : [];
    const existingUrls: string[] = Array.isArray(product.images)
      ? (product.images as any[]).filter((u) => typeof u === "string" && u.length > 0)
      : [];
    const imageUrls: string[] =
      providedUrls.length > 0 ? providedUrls : existingUrls;
    if (!imageUrls.length) {
      throw new BadRequestError(
        "El producto no tiene imágenes para analizar",
        undefined,
        "no_images",
      );
    }
    const context = [
      additionalContext || "",
      product.title ? `Título actual: ${product.title}` : "",
      product.description ? `Descripción actual: ${product.description}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const ai = await analyzeProductImages(
      imageUrls,
      context || undefined,
      undefined,
      { userId },
    );
    return {
      proposal: {
        title: ai.title,
        description: ai.description,
        options: ai.options || [],
      },
    };
  }

  async saveProduct(req: Request, _res: Response) {
    const { title, price, stock, category_id } = req.body;
    const productImages = req.files;
    const uploadedPaths: string[] = [];
    const imageUrls: string[] = [];
    const rollbackImages = async () => {
      await Promise.all(
        uploadedPaths.map((p) =>
          deleteImage(p).catch((err) =>
            logger.warn("product_image_rollback_failed", { err, path: p }),
          ),
        ),
      );
    };
    if (productImages && Array.isArray(productImages)) {
      for (const image of productImages as any[]) {
        const fileName = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const buffer: Buffer = image.buffer ?? fs.readFileSync(image.path);
        const result = await uploadImage(
          buffer,
          fileName,
          "products",
          image.mimetype,
        );
        if (!result.url) {
          await rollbackImages();
          throw errors.imageUploadFailed();
        }
        uploadedPaths.push(`products/${fileName}`);
        imageUrls.push(result.url);
      }
    }
    const finalTitle = String(title).trim();
    const finalPrice = parseFloat(String(price));
    const parsedStock = parseInt(String(stock), 10);
    const finalStock =
      Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : 0;
    let finalDescription = "";
    let finalOptions: { name: string; values: string[] }[] = [];
    if (imageUrls.length > 0) {
      try {
        const aiResult = await analyzeProductImages(
          imageUrls,
          `Título del producto: ${finalTitle}`,
          undefined,
          { userId: (req as any).user?.sub },
        );
        finalDescription = aiResult.description || "";
        finalOptions = Array.isArray(aiResult.options) ? aiResult.options : [];
      } catch (error) {
        logger.warn("ai_description_failed", {
          err: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const productState: ProductState =
      finalStock > 0 ? ProductState.active : ProductState.out_stock;
    try {
      const product = await prisma.products.create({
        data: {
          title: finalTitle,
          description: finalDescription,
          price: finalPrice,
          tags: [],
          ...(category_id ? { category: { connect: { id: category_id } } } : {}),
          images: imageUrls,
          state: productState,
          stock: finalStock,
          options: finalOptions,
        },
      });
      return { product };
    } catch (error) {
      await rollbackImages();
      throw error;
    }
  }

  async saveCategory(req: Request, _res: Response) {
    const { title } = req.body as { title?: string };
    if (!title) throw errors.missingFields(["title"]);
    const image = req.file;
    const normalized_title = title.trim().toLowerCase();
    const category_exists = await prisma.categories.findFirst({
      where: { title: normalized_title },
    });
    if (category_exists) throw errors.categoryAlreadyExists();
    let image_url = "";
    if (image) {
      const fileName = `category-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const buffer: Buffer =
        (image as any).buffer ?? fs.readFileSync((image as any).path);
      const result = await uploadImage(
        buffer,
        fileName,
        "categories",
        image.mimetype,
      );
      if (result.url) image_url = result.url;
      else logger.warn("category_image_upload_failed", { fileName });
    }
    await prisma.categories.create({
      data: { title: normalized_title, image: image_url },
    });
    return { ok: true };
  }

  async getAllCategories(_req: Request, _res: Response) {
    const categories = await prisma.categories.findMany({
      orderBy: { created_at: "asc" },
      include: { products: true },
    });
    const status_to_number: Record<CategoryStatus, number> = {
      [CategoryStatus.active]: 1,
      [CategoryStatus.inactive]: 2,
      [CategoryStatus.deleted]: 3,
    };
    const categories_with_status = categories.map((c) => ({
      ...c,
      status: status_to_number[c.status],
    }));
    return { categories: categories_with_status };
  }

  async getAllProducts(req: Request, _res: Response) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;
    const title = req.query.title as string;
    const categoryId = req.query.categoryId as string;
    const state = req.query.state as ProductState;
    const sortBy = req.query.sortBy as string;
    const sortOrder = req.query.sortOrder as "asc" | "desc";
    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
          ? false
          : undefined;
    const where: Record<string, unknown> = {};
    if (title) where.title = { contains: title, mode: "insensitive" };
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.is_active = isActive;
    if (state) where.state = state;
    const [totalProducts, products] = await Promise.all([
      prisma.products.count({ where: where as any }),
      prisma.products.findMany({
        where: where as any,
        skip,
        take: limit,
        include: { category: true },
        orderBy: sortBy ? [{ [sortBy]: (sortOrder || "asc") }] : [{ created_at: "desc" }],
      }),
    ]);
    const totalPages = Math.ceil(totalProducts / limit);
    return {
      products,
      pagination: {
        total: totalProducts,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  extractPathFromPublicUrl = (url: string): string | null => {
    try {
      const u = new URL(url);
      const match = /\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)/.exec(u.pathname);
      if (!match) return null;
      const bucket = match[1];
      const path = match[2];
      if (!path) return null;
      const envBucket = process.env.SUPABASE_BUCKET || "images";
      if (bucket !== envBucket) {
        logger.warn("bucket_mismatch", { bucket, envBucket });
      }
      return path;
    } catch {
      return typeof url === "string" && url.length > 0 ? url : null;
    }
  };

  async deleteProduct(req: Request, _res: Response) {
    const raw = req.params.product_id;
    const product_id = typeof raw === "string" ? raw : raw?.[0];
    const product_info = await prisma.products.findFirst({
      where: { id: product_id },
    });
    if (!product_info) throw errors.productNotFound();
    if (product_info.state === ProductState.deleted) {
      throw errors.alreadyDeleted("producto");
    }
    await prisma.products.update({
      where: { id: product_id },
      data: { state: ProductState.deleted, deleted_at: new Date() },
    });
    return { ok: true };
  }

  async updateProduct(req: Request, _res: Response) {
    const { title, price, stock, category_id, state, description } =
      req.body as UpdateProductRequest & { description?: string };
    const rawExisting = (req.body).existingImageUrls ?? (req.body).existing_image_urls;
    const rawDeleted = (req.body).deletedImageUrls ?? (req.body).deleted_image_urls;
    const normalizedExisting: string[] = Array.isArray(rawExisting)
      ? rawExisting
      : typeof rawExisting === "string" && rawExisting.trim().length
        ? JSON.parse(rawExisting)
        : [];
    const normalizedDeleted: string[] = Array.isArray(rawDeleted)
      ? rawDeleted
      : typeof rawDeleted === "string" && rawDeleted.trim().length
        ? JSON.parse(rawDeleted)
        : [];
    const rawProductId = req.params.product_id;
    const product_id =
      typeof rawProductId === "string" ? rawProductId : rawProductId?.[0];
    const productImages = req.files;
    const newImageUrls: string[] = [];
    const existentProduct = await prisma.products.findFirst({
      where: { id: product_id },
    });
    if (!existentProduct) throw errors.productNotFound();
    if (normalizedDeleted.length > 0) {
      const imagePaths = normalizedDeleted
        .map((img: string) => this.extractPathFromPublicUrl(img))
        .filter((p: string | null): p is string => p !== null);
      if (imagePaths.length > 0) {
        const results = await Promise.all(
          imagePaths.map((p: string) => deleteImage(p)),
        );
        const failed = results.filter((r) => !r.success).length;
        if (failed > 0) {
          logger.warn("product_image_delete_partial", {
            failed,
            total: imagePaths.length,
          });
        }
      }
    }
    const newImagePaths: string[] = [];
    const rollbackNewImages = async () => {
      await Promise.all(
        newImagePaths.map((p) =>
          deleteImage(p).catch((err) =>
            logger.warn("product_image_rollback_failed", { err, path: p }),
          ),
        ),
      );
    };
    if (productImages && Array.isArray(productImages)) {
      for (const image of productImages as any[]) {
        const fileName = `product-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const buffer: Buffer = image.buffer ?? fs.readFileSync(image.path);
        const result = await uploadImage(
          buffer,
          fileName,
          "products",
          image.mimetype,
        );
        if (!result.url) {
          await rollbackNewImages();
          throw errors.imageUploadFailed();
        }
        newImagePaths.push(`products/${fileName}`);
        newImageUrls.push(result.url);
      }
    }
    const updatedImages = [...normalizedExisting, ...newImageUrls];
    const finalTitle = String(title).trim();
    const finalPrice = parseFloat(String(price));
    const parsedStock = parseInt(String(stock), 10);
    const finalStock =
      Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : 0;
    const userDescription =
      typeof description === "string" ? description.trim() : undefined;
    let finalDescription: string | undefined = userDescription;
    let finalOptions: { name: string; values: string[] }[] | undefined =
      undefined;
    const shouldAutoGenerate =
      newImageUrls.length > 0 &&
      updatedImages.length > 0 &&
      !userDescription &&
      !(existentProduct.description && existentProduct.description.trim());
    if (shouldAutoGenerate) {
      try {
        const aiResult = await analyzeProductImages(
          updatedImages,
          `Título del producto: ${finalTitle}`,
          undefined,
          { userId: (req as any).user?.sub },
        );
        finalDescription = aiResult.description || "";
        finalOptions = Array.isArray(aiResult.options) ? aiResult.options : [];
      } catch (error) {
        logger.warn("ai_description_failed", {
          err: error instanceof Error ? error.message : String(error),
        });
      }
    }
    const resolvedState: ProductState = state
      ? (state as ProductState)
      : finalStock > 0
        ? ProductState.active
        : ProductState.out_stock;
    try {
      await prisma.products.update({
        where: { id: product_id },
        data: {
          title: finalTitle,
          price: finalPrice,
          stock: finalStock,
          tags: [],
          ...(category_id
            ? { category: { connect: { id: category_id } } }
            : { category: { disconnect: true } }),
          images: updatedImages,
          state: resolvedState,
          ...(finalDescription !== undefined ? { description: finalDescription } : {}),
          ...(finalOptions !== undefined ? { options: finalOptions } : {}),
        },
      });
    } catch (error) {
      await rollbackNewImages();
      throw error;
    }
    return { images: updatedImages };
  }

  async productChangeStatus(req: Request, _res: Response) {
    const { product_id, state } = req.params as unknown as UpdateProductStatusSchema;
    const product = await prisma.products.findUnique({
      where: { id: product_id },
    });
    if (!product) throw errors.productNotFound();
    await prisma.products.update({
      where: { id: product_id },
      data: { state: state as ProductState },
    });
    return { ok: true };
  }

  async updateStock(req: Request, _res: Response) {
    const { product_id, quantity } = req.params as { product_id: string; quantity: string };
    const q = parseInt(quantity, 10);
    if (!Number.isFinite(q) || q < 0) {
      throw new BadRequestError("Cantidad de stock inválida", undefined, "invalid_stock");
    }
    const product = await prisma.products.findUnique({
      where: { id: product_id },
    });
    if (!product) throw errors.productNotFound();
    const nextState: ProductState =
      q > 0 ? ProductState.active : ProductState.out_stock;
    await prisma.products.update({
      where: { id: product_id },
      data: { stock: q, state: nextState },
    });
    return { stock: q, state: nextState };
  }

  async updateCategory(req: Request, _res: Response) {
    const rawCatId = req.params.category_id;
    const category_id = typeof rawCatId === "string" ? rawCatId : rawCatId?.[0];
    const { title } = req.body as { title?: string };
    const image = req.file;
    if (!title) throw errors.missingFields(["title"]);
    const existingCategory = await prisma.categories.findUnique({
      where: { id: category_id },
    });
    if (!existingCategory) throw errors.categoryNotFound();
    const normalized_title = title.toLowerCase().trim();
    const existingCategoryWithTitle = await prisma.categories.findFirst({
      where: { title: normalized_title, id: { not: category_id } },
    });
    if (existingCategoryWithTitle) throw errors.categoryTitleTaken();
    let image_url = existingCategory.image;
    if (image) {
      if (existingCategory.image) {
        const imagePath = this.extractPathFromPublicUrl(existingCategory.image);
        if (imagePath) await deleteImage(imagePath);
      }
      const fileName = `category-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const buffer: Buffer =
        (image as any).buffer ?? fs.readFileSync((image as any).path);
      const result = await uploadImage(
        buffer,
        fileName,
        "categories",
        image.mimetype,
      );
      if (result.url) image_url = result.url;
      else throw errors.imageUploadFailed();
    }
    await prisma.categories.update({
      where: { id: category_id },
      data: { title: normalized_title, image: image_url },
    });
    return { ok: true };
  }

  async categoryChangeStatus(req: Request, _res: Response) {
    const { category_id, status } = req.params as unknown as UpdateCategoryStatusSchema;
    const statusNumber = parseInt(status);
    const status_map: Record<number, CategoryStatus> = {
      1: CategoryStatus.active,
      2: CategoryStatus.inactive,
      3: CategoryStatus.deleted,
    };
    if (!status_map[statusNumber] || isNaN(statusNumber)) {
      throw new BadRequestError(
        "Estado de categoría inválido. Debe ser activo(1), inactivo(2) o eliminado(3)",
        undefined,
        "invalid_category_status",
      );
    }
    const nextStatus = status_map[statusNumber];
    await prisma.categories.update({
      where: { id: category_id },
      data: {
        status: nextStatus,
        deleted_at: nextStatus === CategoryStatus.deleted ? new Date() : null,
      },
    });
    return { ok: true };
  }

  async getPublicCategories(_req: Request, _res: Response) {
    const categories = await prisma.categories.findMany({
      where: { status: CategoryStatus.active },
    });
    return { categories };
  }

  async getPublicProducts(req: Request, _res: Response) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
    const title = (req.query.title as string) || undefined;
    const categoryId = (req.query.categoryId as string) || undefined;
    const sortBy = (req.query.sortBy as string) || undefined;
    const sortOrder = (req.query.sortOrder as "asc" | "desc") || "asc";
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {
      is_active: true,
      state: "active",
      stock: { gt: 0 },
    };
    if (title) {
      const trimmed = title.trim();
      if (trimmed.length > 0) {
        const titleConditions: { contains: string; mode: "insensitive" }[] = [
          { contains: trimmed, mode: "insensitive" },
        ];
        if (trimmed.length > 2) {
          titleConditions.push({ contains: trimmed.slice(0, -1), mode: "insensitive" });
        }
        where.OR = titleConditions.map((c) => ({ title: c }));
      }
    }
    if (categoryId) where.categoryId = categoryId;
    const [totalProducts, dbProducts] = await Promise.all([
      prisma.products.count({ where: where as any }),
      prisma.products.findMany({
        where: where as any,
        skip,
        take: limit,
        include: { category: true },
        orderBy: sortBy ? [{ [sortBy]: sortOrder }] : [{ created_at: "desc" }],
      }),
    ]);
    const totalPages = Math.ceil(totalProducts / limit) || 1;
    return {
      products: dbProducts,
      pagination: {
        total: totalProducts,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getPublicProductById(req: Request, _res: Response) {
    const { id } = req.params as { id: string };
    if (!id) throw errors.missingFields(["id"]);
    const product = await prisma.products.findUnique({
      where: { id },
      include: { category: true },
    });
    if (
      product?.is_active !== true ||
      product.state !== ProductState.active ||
      (product.stock ?? 0) <= 0
    ) {
      throw errors.productNotFound();
    }
    return { product };
  }
}

export default new ProductServices();
export const _unused = { AppError, ConflictError, NotFoundError, StorageError };