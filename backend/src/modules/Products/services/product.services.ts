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
import { analyzeProductImages } from "@/config/groq";
import { logger } from "@/utils/logger";
import { AppError } from "@/utils/errors";
class ProductServices {
  async enhanceProductContent(req: Request, res: Response) {
    try {
      const { product_id } = req.params as unknown as { product_id: string };
      const { additionalContext, imageUrls: bodyImageUrls } = req.body as {
        additionalContext?: string;
        imageUrls?: unknown;
      };
      const product = await prisma.products.findUnique({
        where: { id: product_id },
      });
      if (!product) {
        return res
          .status(404)
          .json({ ok: false, error: "Producto no encontrado" });
      }
      const providedUrls: string[] = Array.isArray(bodyImageUrls)
        ? (bodyImageUrls).filter(
            (u) => typeof u === "string" && u.length > 0,
          )
        : [];
      const existingUrls: string[] = Array.isArray(product.images)
        ? (product.images as any[]).filter(
            (u) => typeof u === "string" && u.length > 0,
          )
        : [];
      const imageUrls: string[] =
        providedUrls.length > 0 ? providedUrls : existingUrls;
      if (!imageUrls.length) {
        return res.status(400).json({
          ok: false,
          error: "El producto no tiene imágenes para analizar",
        });
      }
      const context = [
        additionalContext || "",
        product.title ? `Título actual: ${product.title}` : "",
        product.description ? `Descripción actual: ${product.description}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      const ai = await analyzeProductImages(imageUrls, context || undefined);
      return res.status(200).json({
        ok: true,
        proposal: {
          title: ai.title,
          description: ai.description,
          options: ai.options || [],
        },
      });
    } catch (error) {
      console.error("enhanceProductContent error:", error);
      return res
        .status(500)
        .json({ ok: false, error: "Error al mejorar el contenido con IA" });
    }
  }
  async saveProduct(req: Request, res: Response) {
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
          throw new AppError("image_upload_failed", {
            status: 500,
            code: "image_upload_failed",
          });
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
        );
        finalDescription = aiResult.description || "";
        finalOptions = Array.isArray(aiResult.options) ? aiResult.options : [];
      } catch (error) {
        logger.warn("ai_description_failed", { error });
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
      return res.status(201).json({
        ok: true,
        message: "Producto creado exitosamente",
        product,
      });
    } catch (error) {
      await rollbackImages();
      throw error;
    }
  }
  async saveCategory(req: Request, res: Response) {
    const { title } = req.body;
    const image = req.file;
    const normalized_title = title.trim().toLowerCase();
    try {
      const category_exists = await prisma.categories.findFirst({
        where: {
          title: normalized_title,
        },
      });
      if (category_exists) {
        return res.status(409).json({
          ok: false,
          error: "Esta categoría ya existe.",
        });
      }
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
        if (result.url) {
          image_url = result.url;
        } else {
          console.error("Error subiendo imagen", result.error);
        }
      }
      await prisma.categories.create({
        data: {
          title: normalized_title,
          image: image_url,
        },
      });
      return res.status(201).json({
        ok: true,
        message: "Categoría creada exitosamente",
      });
    } catch (error) {
      console.error("Error al guardar categoría", error);
      return res.status(500).json({
        ok: false,
        error: "Error al guardar categoría",
      });
    }
  }
  async getAllCategories(_req: Request, res: Response) {
    try {
      const categories = await prisma.categories.findMany({
        orderBy: {
          created_at: "asc",
        },
        include: {
          products: true,
        },
      });
      if (categories.length === 0) {
        return res.status(404).json({
          ok: false,
          error: "No se encontraron categorías.",
        });
      }
      const status_to_number: Record<CategoryStatus, number> = {
        [CategoryStatus.active]: 1,
        [CategoryStatus.inactive]: 2,
        [CategoryStatus.deleted]: 3,
      };
      const categories_with_status = categories.map(
        (c: { status: CategoryStatus }) => {
          return {
            ...c,
            status: status_to_number[c.status],
          };
        },
      );
      return res.status(200).json({
        ok: true,
        categories: categories_with_status,
      });
    } catch (error) {
      console.error("Error al obtener categorías", error);
      return res.status(500).json({
        ok: false,
        error: "Error al obtener categorías",
      });
    }
  }
  async getAllProducts(req: Request, res: Response) {
    try {
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
      const where: any = {};
      if (title) {
        where.title = {
          contains: title,
          mode: "insensitive",
        };
      }
      if (categoryId) {
        where.categoryId = categoryId;
      }
      if (isActive !== undefined) {
        where.is_active = isActive;
      }
      if (state) {
        where.state = state;
      }
      const [totalProducts, products] = await Promise.all([
        prisma.products.count({ where }),
        prisma.products.findMany({
          where,
          skip,
          take: limit,
          include: {
            category: true,
          },
          orderBy: sortBy
            ? [{ [sortBy]: (sortOrder || "asc") }]
            : [{ created_at: "desc" }],
        }),
      ]);
      const totalPages = Math.ceil(totalProducts / limit);
      return res.status(200).json({
        ok: true,
        data: {
          products,
          pagination: {
            total: totalProducts,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Error al obtener productos:", error);
      return res.status(500).json({
        ok: false,
        error: "Error al obtener los productos",
      });
    }
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
        console.warn(
          `Bucket en URL (${bucket}) difiere del configurado (${envBucket}). Intentando eliminar por path relativo.`,
        );
      }
      return path;
    } catch {
      return typeof url === "string" && url.length > 0 ? url : null;
    }
  };
  async deleteProduct(req: Request, res: Response) {
    try {
      const { product_id } = req.params;
      const product_info = await prisma.products.findFirst({
        where: { id: product_id },
      });
      if (!product_info) {
        return res.status(404).json({
          ok: false,
          error: "Producto no encontrado",
        });
      }
      if (product_info.state === ProductState.deleted) {
        return res.status(400).json({
          ok: false,
          error: "Producto ya eliminado",
          message: "El producto ha sido eliminado previamente.",
        });
      }
      await prisma.products.update({
        where: { id: product_id },
        data: {
          state: ProductState.deleted,
          deleted_at: new Date(),
        },
      });
      return res.status(200).json({
        ok: true,
        message: "Producto eliminado exitosamente",
      });
    } catch (error) {
      console.error("Error al eliminar producto:", error);
      return res.status(500).json({
        ok: false,
        error: "Error al eliminar el producto",
      });
    }
  }
  async updateProduct(req: Request, res: Response) {
    try {
      const { title, price, stock, category_id, state } =
        req.body as UpdateProductRequest;
      const rawExisting =
        (req.body).existingImageUrls ??
        (req.body).existing_image_urls;
      const rawDeleted =
        (req.body).deletedImageUrls ??
        (req.body).deleted_image_urls;
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
      const { product_id } = req.params;
      const productImages = req.files;
      const newImageUrls: string[] = [];
      const existentProduct = await prisma.products.findFirst({
        where: { id: product_id },
      });
      if (!existentProduct) {
        return res.status(404).json({
          ok: false,
          error: "Producto no encontrado",
        });
      }
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
            console.warn(
              `No se pudieron eliminar ${failed} imágenes de Supabase.`,
            );
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
            throw new AppError("image_upload_failed", {
              status: 500,
              code: "image_upload_failed",
            });
          }
          newImagePaths.push(`products/${fileName}`);
          newImageUrls.push(result.url);
        }
      }
      const updatedImages = [...normalizedExisting, ...newImageUrls];
      const imagesChanged =
        newImageUrls.length > 0 || normalizedDeleted.length > 0;
      const finalTitle = String(title).trim();
      const finalPrice = parseFloat(String(price));
      const parsedStock = parseInt(String(stock), 10);
      const finalStock =
        Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : 0;
      let finalDescription: string | undefined = undefined;
      let finalOptions: { name: string; values: string[] }[] | undefined =
        undefined;
      if (imagesChanged && updatedImages.length > 0) {
        try {
          const aiResult = await analyzeProductImages(
            updatedImages,
            `Título del producto: ${finalTitle}`,
          );
          finalDescription = aiResult.description || "";
          finalOptions = Array.isArray(aiResult.options)
            ? aiResult.options
            : [];
        } catch (error) {
          logger.warn("ai_description_failed", { error });
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
            ...(finalDescription !== undefined
              ? { description: finalDescription }
              : {}),
            ...(finalOptions !== undefined ? { options: finalOptions } : {}),
          },
        });
      } catch (error) {
        await rollbackNewImages();
        throw error;
      }
      return res.status(200).json({
        ok: true,
        message: "Producto actualizado exitosamente",
        images: updatedImages,
      });
    } catch (error) {
      console.error("Error al actualizar producto:", error);
      return res.status(500).json({
        ok: false,
        error: "Error al actualizar el producto",
      });
    }
  }
  async productChangeStatus(req: Request, res: Response) {
    try {
      const { product_id, state } =
        req.params as unknown as UpdateProductStatusSchema;
      const product = await prisma.products.findUnique({
        where: { id: product_id },
      });
      if (!product) {
        return res.status(404).json({
          ok: false,
          error: "Producto no encontrado",
        });
      }
      await prisma.products.update({
        where: { id: product_id },
        data: { state: state as ProductState },
      });
      return res.status(200).json({
        ok: true,
        message: "Estado del producto actualizado exitosamente",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        ok: false,
        error: "Error al actualizar el estado del producto",
      });
    }
  }
  async updateStock(req: Request, res: Response) {
    try {
      const { product_id, quantity } = req.params as unknown as {
        product_id: string;
        quantity: string;
      };
      const q = parseInt(quantity, 10);
      if (!Number.isFinite(q) || q < 0) {
        return res
          .status(400)
          .json({ ok: false, error: "Cantidad de stock inválida" });
      }
      const product = await prisma.products.findUnique({
        where: { id: product_id },
      });
      if (!product) {
        return res
          .status(404)
          .json({ ok: false, error: "Producto no encontrado" });
      }
      const nextState: ProductState =
        q > 0 ? ProductState.active : ProductState.out_stock;
      await prisma.products.update({
        where: { id: product_id },
        data: { stock: q, state: nextState },
      });
      return res.status(200).json({
        ok: true,
        message: "Stock actualizado",
        stock: q,
        state: nextState,
      });
    } catch (error) {
      console.error("Error al actualizar stock:", error);
      return res
        .status(500)
        .json({ ok: false, error: "Error al actualizar el stock" });
    }
  }
  async updateCategory(req: Request, res: Response) {
    try {
      const { category_id } = req.params;
      const { title } = req.body;
      const image = req.file;
      if (!title) {
        return res.status(400).json({
          ok: false,
          error: "El título es requerido",
        });
      }
      const existingCategory = await prisma.categories.findUnique({
        where: { id: category_id },
      });
      if (!existingCategory) {
        return res.status(404).json({
          ok: false,
          error: "Categoría no encontrada",
        });
      }
      const normalized_title = title.toLowerCase().trim();
      const existingCategoryWithTitle = await prisma.categories.findFirst({
        where: {
          title: normalized_title,
          id: { not: category_id },
        },
      });
      if (existingCategoryWithTitle) {
        return res.status(400).json({
          ok: false,
          error: "Ya existe una categoría con este título",
        });
      }
      let image_url = existingCategory.image;
      if (image) {
        if (existingCategory.image) {
          const imagePath = this.extractPathFromPublicUrl(
            existingCategory.image,
          );
          if (imagePath) {
            await deleteImage(imagePath);
          }
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
        if (result.url) {
          image_url = result.url;
        } else {
          console.error("Error subiendo imagen", result.error);
          return res.status(500).json({
            ok: false,
            error: "Error al subir la imagen",
          });
        }
      }
      await prisma.categories.update({
        where: { id: category_id },
        data: {
          title: normalized_title,
          image: image_url,
        },
      });
      return res.status(200).json({
        ok: true,
        message: "Categoría actualizada exitosamente",
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        ok: false,
        error: "Error al actualizar la categoría",
      });
    }
  }
  async categoryChangeStatus(req: Request, res: Response) {
    try {
      const { category_id, status } =
        req.params as unknown as UpdateCategoryStatusSchema;
      const statusNumber = parseInt(status);
      const status_map: Record<number, CategoryStatus> = {
        1: CategoryStatus.active,
        2: CategoryStatus.inactive,
        3: CategoryStatus.deleted,
      };
      if (!status_map[statusNumber] || isNaN(statusNumber)) {
        return res.status(400).json({
          ok: false,
          error:
            "Estado de categoría inválido. Debe ser activo(1), inactivo(2) o eliminado(3)",
        });
      }
      const nextStatus = status_map[statusNumber];
      await prisma.categories.update({
        where: { id: category_id },
        data: {
          status: nextStatus,
          deleted_at: nextStatus === CategoryStatus.deleted ? new Date() : null,
        },
      });
      const statusMessages = {
        1: "activada",
        2: "desactivada",
        3: "eliminada",
      };
      return res.status(200).json({
        ok: true,
        message: `Categoría ${statusMessages[statusNumber as keyof typeof statusMessages]} exitosamente`,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        ok: false,
        error: "Error al cambiar el estado de la categoría",
      });
    }
  }
  async getPublicCategories(_req: Request, res: Response) {
    try {
      const categories = await prisma.categories.findMany({
        where: {
          status: CategoryStatus.active,
        },
      });
      return res.status(200).json({
        ok: true,
        data: categories,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        ok: false,
        error: "Error al obtener las categorías públicas",
      });
    }
  }
  async getPublicProducts(req: Request, res: Response) {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 12));
      const title = (req.query.title as string) || undefined;
      const categoryId = (req.query.categoryId as string) || undefined;
      const sortBy = (req.query.sortBy as string) || undefined;
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || "asc";
      const skip = (page - 1) * limit;
      const where: any = { is_active: true, state: "active" };
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
        prisma.products.count({ where }),
        prisma.products.findMany({
          where,
          skip,
          take: limit,
          include: { category: true },
          orderBy: sortBy
            ? [{ [sortBy]: sortOrder }]
            : [{ created_at: "desc" }],
        }),
      ]);
      const totalPages = Math.ceil(totalProducts / limit) || 1;
      return res.status(200).json({
        ok: true,
        data: {
          products: dbProducts,
          pagination: {
            total: totalProducts,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      });
    } catch (error) {
      console.error("Error al obtener productos públicos:", error);
      return res.status(500).json({
        ok: false,
        error: "Error al obtener los productos públicos",
      });
    }
  }
  async getPublicProductById(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      if (!id) {
        return res
          .status(400)
          .json({ ok: false, error: "ID de producto requerido" });
      }
      const product = await prisma.products.findUnique({
        where: { id },
        include: { category: true },
      });
      if (
        product?.is_active !== true ||
        product.state !== ProductState.active
      ) {
        return res
          .status(404)
          .json({ ok: false, error: "Producto no encontrado" });
      }
      return res.status(200).json({ ok: true, data: { product } });
    } catch (error) {
      console.error("Error al obtener producto público por id:", error);
      return res
        .status(500)
        .json({ ok: false, error: "Error al obtener el producto" });
    }
  }
}
export default ProductServices;
