import { Request, Response } from "express";
import { uploadImage, deleteImage } from "@/config/minio";
import fs from "fs";
import { prisma } from "@/config/prisma";
import { redis } from "@/config/redis";
import { CategoryStatus, ProductState } from "@prisma/client";
import { UpdateCategoryStatusSchema, UpdateProductRequest, UpdateProductStatusSchema } from "./product.zod";
import { analyzeProductImages } from "@/config/groq";
class ProductServices {
    async enhanceProductContent(req: Request, res: Response) {
        try {
            const { product_id } = req.params as unknown as { product_id: string };
            const { additionalContext, imageUrls: bodyImageUrls } = req.body as { additionalContext?: string; imageUrls?: unknown };
            const product = await prisma.products.findUnique({ where: { id: product_id } });
            if (!product) {
                return res.status(404).json({ ok: false, error: "Producto no encontrado" });
            }
            const providedUrls: string[] = Array.isArray(bodyImageUrls)
                ? (bodyImageUrls as any[]).filter((u) => typeof u === "string" && u.length > 0)
                : [];
            const existingUrls: string[] = Array.isArray(product.images)
                ? (product.images as any[]).filter((u) => typeof u === "string" && u.length > 0)
                : [];
            const imageUrls: string[] = providedUrls.length > 0 ? providedUrls : existingUrls;
            if (!imageUrls.length) {
                return res.status(400).json({ ok: false, error: "El producto no tiene imágenes para analizar" });
            }
            const context = [
                additionalContext || "",
                product.title ? `Título actual: ${product.title}` : "",
                product.description ? `Descripción actual: ${product.description}` : "",
            ].filter(Boolean).join("\n");
            const ai = await analyzeProductImages(imageUrls, context || undefined);
            return res.status(200).json({
                ok: true,
                proposal: {
                    title: ai.title,
                    description: ai.description,
                    options: ai.options || []
                }
            });
        } catch (error) {
            console.error("enhanceProductContent error:", error);
            return res.status(500).json({ ok: false, error: "Error al mejorar el contenido con IA" });
        }
    }
    async refreshAllProductsCache(tenantId?: string) {
        const where = tenantId ? { tenantId } : {};
        const products = await prisma.products.findMany({ where, include: { category: true } });
        const cacheKey = tenantId ? `${tenantId}:products:all` : "products:all";
        await redis.set(cacheKey, JSON.stringify(products));
        for (const p of products) {
            const productCacheKey = tenantId ? `${tenantId}:product:${p.id}` : `product:${p.id}`;
            await redis.set(productCacheKey, JSON.stringify(p));
        }
    }

    async refreshProductCache(productId: string, tenantId?: string) {
        const product = await prisma.products.findUnique({ where: { id: productId }, include: { category: true } });
        if (product) {
            const productTenantId = tenantId || product.tenantId;
            const productCacheKey = productTenantId ? `${productTenantId}:product:${productId}` : `product:${productId}`;
            await redis.set(productCacheKey, JSON.stringify(product));
            
            const allCacheKey = productTenantId ? `${productTenantId}:products:all` : "products:all";
            const cached = await redis.get(allCacheKey);
            if (cached) {
                const arr = JSON.parse(cached) as any[];
                const idx = arr.findIndex((x) => x.id === productId);
                if (idx >= 0) arr[idx] = product; else arr.unshift(product);
                await redis.set(allCacheKey, JSON.stringify(arr));
            }
        }
    }
    async saveProduct(req: Request, res: Response) {
        const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        const {
            title,
            description,
            price,
            tags,
            category_id,
            fillWithAI,
            publishAutomatically,
            stock,
            additionalContext,
            options,
        } = req.body

        const productImages = req.files

        let imageUrls: string[] = [];

        if (productImages && Array.isArray(productImages)) {
            for (const image of productImages as any[]) {
                try {
                    const fileName = `product-${Date.now()}-${Math.round(Math.random() * 1E9)}`;

                    const buffer: Buffer = image.buffer ?? fs.readFileSync(image.path);
                    const result = await uploadImage(buffer, fileName, 'products', image.mimetype);

                    if (result.url) {
                        imageUrls.push(result.url);
                    } else {
                        console.error('Error al subir imagen:', result.error);
                    }
                } catch (error) {
                    console.error('Error al procesar imagen:', error);
                }
            }
        }

        let finalTitle = title;
        let finalDescription = description ?? "";
        let finalPrice = price ? parseFloat(price) : 0;
        let finalTags = Array.isArray(tags) ? tags : [];
        let productState: ProductState = ProductState.active;
        const parsedStock = typeof stock === 'string' ? parseInt(stock, 10) : (typeof stock === 'number' ? stock : 1);
        const finalStock = Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : 1;
        let finalOptions = typeof options === 'string' ? JSON.parse(options) : (Array.isArray(options) ? options : []);

        if (fillWithAI === true || fillWithAI === 'true') {
            if (imageUrls.length === 0) {
                return res.status(400).json({
                    ok: false,
                    error: "Se requieren imágenes para completar con IA"
                });
            }

            try {
                const aiResult = await analyzeProductImages(imageUrls, additionalContext);
                finalTitle = aiResult.title;
                finalDescription = aiResult.description;
                finalTags = []; 
                if (aiResult.options && aiResult.options.length > 0) {
                    finalOptions = aiResult.options;
                }
                productState = publishAutomatically === "true" || publishAutomatically === true ? ProductState.active : ProductState.draft; 
            } catch (error) {
                console.error('Error al procesar con IA:', error);
                return res.status(500).json({
                    ok: false,
                    error: "Error al procesar las imágenes con IA"
                });
            }
        }

        const product = await prisma.products.create({
            data: {
                title: finalTitle,
                description: finalDescription,
                price: finalPrice,
                tags: finalTags,
                category: { connect: { id: category_id } },
                tenant: { connect: { id: tenantId } },
                images: imageUrls,
                state: productState,
                stock: finalStock,
                options: finalOptions,
            }
        });

        await this.refreshAllProductsCache(tenantId)
        await this.refreshProductCache(product.id, tenantId);

        return res.status(201).json({
            ok: true,
            message: fillWithAI ? "Producto generado con IA exitosamente" : "Producto creado exitosamente",
            product
        });

    }

    async saveCategory(req: Request, res: Response) {
        const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        const { title } = req.body
        const image = req.file
        const normalized_title = title.trim().toLowerCase()

        try {
            const category_exists = await prisma.categories.findFirst({
                where: {
                    title: normalized_title,
                    tenantId
                }
            })

            if (category_exists) {
                return res.status(409).json({
                    ok: false,
                    error: "Esta categoría ya existe."
                })
            }

            let image_url: string = ""
            if (image) {
                const fileName = `category-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
                const buffer: Buffer = (image as any).buffer ?? fs.readFileSync((image as any).path);
                const result = await uploadImage(buffer, fileName, 'categories', image.mimetype);
                if (result.url) {
                    image_url = result.url
                } else {
                    console.log("Error subiendo imagen a Supabase", result.error)
                }
            }

            await prisma.categories.create({
                data: {
                    title: normalized_title,
                    image: image_url,
                    tenantId
                }
            })

            return res.status(201).json({
                ok: true,
                message: "Categoría creada exitosamente"
            })
        } catch (error) {
            console.log("Error al guardar categoría", error)
            return res.status(500).json({
                ok: false,
                error: "Error al guardar categoría"
            })
        }

    }

    async getAllCategories(req: Request, res: Response) {
        const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        try {
            const categories = await prisma.categories.findMany({
                where: { tenantId },
                orderBy: {
                    created_at: "asc"
                },
                include: {
                    products: true
                }
            })

            if(categories.length === 0) {
                return res.status(404).json({
                    ok: false,
                    error: "No se encontraron categorías."
                })
            }

            const status_to_number: Record<CategoryStatus, number> = {
                [CategoryStatus.active]: 1,
                [CategoryStatus.inactive]: 2,
                [CategoryStatus.deleted]: 3,
            };

            const categories_with_status = categories.map((c: { status: CategoryStatus }) => {
                return {
                    ...c,
                    status: status_to_number[c.status as CategoryStatus]
                }
            })
            return res.status(200).json({
                ok: true,
                categories: categories_with_status
            })
        } catch (error) {
            console.log("Error al obtener categorías", error)
            return res.status(500).json({
                ok: false,
                error: "Error al obtener categorías"
            })
        }
    }

    async getAllProducts(req: Request, res: Response) {
        const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            const title = req.query.title as string;
            const categoryId = req.query.categoryId as string;

            const state = req.query.state as ProductState;
            const sortBy = req.query.sortBy as string;
            const sortOrder = req.query.sortOrder as "asc" | "desc";

            const isActive = req.query.isActive === 'true' ? true :
                req.query.isActive === 'false' ? false : undefined;

            const where: any = { tenantId };

            if (title) {
                where.title = {
                    contains: title,
                    mode: 'insensitive'
                };
            }

            if (categoryId) {
                where.categoryId = categoryId;
            }

            if (isActive !== undefined) {
                where.is_active = isActive;
            }

            console.log(state)
            if (state) {
                where.state = state;
            }
            console.log("Filtros:", where)
            const [totalProducts, products] = await Promise.all([
                prisma.products.count({ where }),

                prisma.products.findMany({
                    where,
                    skip,
                    take: limit,
                    include: {
                        category: true
                    },
                    orderBy: sortBy ? [{ [sortBy]: (sortOrder || 'asc') as "asc" | "desc" }] : [{ created_at: 'desc' }]
                })
            ])

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
                        hasPrevPage: page > 1
                    }
                }
            });
        } catch (error) {
            console.error("Error al obtener productos:", error);
            return res.status(500).json({
                ok: false,
                error: "Error al obtener los productos"
            });
        }
    }

    extractPathFromPublicUrl = (url: string): string | null => {
        try {
            const u = new URL(url);
            const match = u.pathname.match(/\/storage\/v1\/object\/(?:public|authenticated)\/([^/]+)\/(.+)/);
            if (!match) return null;
            const bucket = match[1];
            const path = match[2];
            const envBucket = process.env.SUPABASE_BUCKET || "images";
            if (bucket !== envBucket) {
                console.warn(`Bucket en URL (${bucket}) difiere del configurado (${envBucket}). Intentando eliminar por path relativo.`);
            }
            return path;
        } catch {
            return typeof url === "string" && url.length > 0 ? url : null;
        }
    };
    async deleteProduct(req: Request, res: Response) {
        const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        try {
            const { product_id } = req.params;

            const product_info = await prisma.products.findFirst({
                where: { id: product_id, tenantId }
            });

            if (!product_info) {
                return res.status(404).json({
                    ok: false,
                    error: "Producto no encontrado"
                });
            }

            if (product_info.state === ProductState.deleted) {
                return res.status(400).json({
                    ok: false,
                    error: "Producto ya eliminado",
                    message: "El producto ha sido eliminado previamente."
                });
            }

        await prisma.products.update({
            where: { id: product_id },
            data: {
                state: ProductState.deleted,
            }
        });

            await this.refreshProductCache(product_id, tenantId);

            return res.status(200).json({
                ok: true,
                message: "Producto eliminado exitosamente",
            });
        } catch (error) {
            console.error("Error al eliminar producto:", error);
            return res.status(500).json({
                ok: false,
                error: "Error al eliminar el producto"
            });
        }
    }

    async updateProduct(req: Request, res: Response) {
        const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        try {
            const {
                title,
                description,
                price,
                tags,
                category_id,
                existingImageUrls,
                deletedImageUrls,
                state,
                stock,
                options
            } = req.body as UpdateProductRequest;
            console.log("Estatus actual:", state);

            const rawExisting = existingImageUrls ?? (req.body as any).existing_image_urls;
            const rawDeleted = deletedImageUrls ?? (req.body as any).deleted_image_urls;

            const normalizedExisting: string[] = Array.isArray(rawExisting)
                ? rawExisting
                : typeof rawExisting === 'string' && rawExisting.trim().length
                    ? JSON.parse(rawExisting)
                    : [];

            const normalizedDeleted: string[] = Array.isArray(rawDeleted)
                ? rawDeleted
                : typeof rawDeleted === 'string' && rawDeleted.trim().length
                    ? JSON.parse(rawDeleted)
                    : [];

            const {
                product_id,
            } = req.params;

            const productImages = req.files

            let imageUrls: string[] = [];

            const existentProduct = await prisma.products.findFirst({
                where: { id: product_id, tenantId }
            });

            if (!existentProduct) {
                return res.status(404).json({
                    ok: false,
                    error: "Producto no encontrado"
                });
            }

            if (normalizedDeleted.length > 0) {
                const imagePaths = normalizedDeleted
                    .map((img: string) => this.extractPathFromPublicUrl(img))
                    .filter((p: string | null): p is string => p !== null);
                if (imagePaths.length > 0) {
                    const results = await Promise.all(imagePaths.map((p: string) => deleteImage(p)));
                    const failed = results.filter(r => !r.success).length;
                    if (failed > 0) {
                        console.warn(`No se pudieron eliminar ${failed} imágenes de Supabase.`);
                    }
                }
            }

            if (productImages && Array.isArray(productImages)) {
                for (const image of productImages as any[]) {
                    try {
                        const fileName = `product-${Date.now()}-${Math.round(Math.random() * 1E9)}`;

                        const buffer: Buffer = image.buffer ?? fs.readFileSync(image.path);
                        const result = await uploadImage(buffer, fileName, 'products', image.mimetype);

                        if (result.url) {
                            imageUrls.push(result.url);
                        } else {
                            console.error('Error al subir imagen:', result.error);
                        }
                    } catch (error) {
                        console.error('Error al procesar imagen:', error);
                    }
                }
            }

            const updatedImages = [...normalizedExisting, ...imageUrls];
            const parsedStock = typeof stock === 'string' ? parseInt(stock, 10) : (typeof stock === 'number' ? stock : undefined);
            const finalStock = parsedStock !== undefined && Number.isFinite(parsedStock) && parsedStock >= 0 ? parsedStock : undefined;
            const finalOptions = options ? (typeof options === 'string' ? JSON.parse(options) : options) : undefined;

            await prisma.products.update({
                where: { id: product_id },
                data: {
                    title,
                    description,
                    price: typeof price === 'string' ? parseFloat(price) : price,
                    tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? JSON.parse(tags) : []),
                    category: { connect: { id: category_id } },
                    images: updatedImages,
                    state: state || ProductState.active,
                    ...(finalStock !== undefined ? { stock: finalStock } : {}),
                    ...(finalOptions !== undefined ? { options: finalOptions } : {}),
                }
            });

            await this.refreshAllProductsCache(tenantId)
            await this.refreshProductCache(product_id, tenantId);

            return res.status(200).json({
                ok: true,
                message: "Producto actualizado exitosamente",
                images: updatedImages
            });

        } catch (error) {
            console.error("Error al actualizar producto:", error);
            return res.status(500).json({
                ok: false,
                error: "Error al actualizar el producto"
            });
        }
    }

    async productChangeStatus(req: Request, res: Response) {
        const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        try {
            const { product_id, state } = req.params as unknown as UpdateProductStatusSchema;

            const product = await prisma.products.findFirst({ where: { id: product_id, tenantId } });
            if (!product) {
                return res.status(404).json({
                    ok: false,
                    error: "Producto no encontrado"
                });
            }

            await prisma.products.update({
                where: { id: product_id },
                data: { state: state as ProductState }
            });

            await this.refreshProductCache(product_id, tenantId);

            return res.status(200).json({
                ok: true,
                message: "Estado del producto actualizado exitosamente"
            });
        } catch (error) {
            console.log(error);
            return res.status(500).json({
                ok: false,
                error: "Error al actualizar el estado del producto"
            });
        }
    }

    async updateStock(req: Request, res: Response) {
        const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        try {
            const { product_id, quantity } = req.params as unknown as { product_id: string; quantity: string };
            const q = parseInt(quantity, 10);
            if (!Number.isFinite(q) || q < 0) {
                return res.status(400).json({ ok: false, error: 'Cantidad de stock inválida' });
            }
            const product = await prisma.products.findFirst({ where: { id: product_id, tenantId } });
            if (!product) {
                return res.status(404).json({ ok: false, error: 'Producto no encontrado' });
            }
            const nextState: ProductState = q > 0 ? ProductState.active : ProductState.out_stock;
            await prisma.products.update({ where: { id: product_id }, data: { stock: q, state: nextState } });
            await this.refreshProductCache(product_id, tenantId);
            return res.status(200).json({ ok: true, message: 'Stock actualizado', stock: q, state: nextState });
        } catch (error) {
            console.error('Error al actualizar stock:', error);
            return res.status(500).json({ ok: false, error: 'Error al actualizar el stock' });
        }
    }

    async updateCategory(req: Request, res: Response) {
        const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        try {
            const { category_id } = req.params;
            const { title } = req.body;
            const image = req.file;

            if (!title) {
                return res.status(400).json({
                    ok: false,
                    error: "El título es requerido"
                });
            }

            const existingCategory = await prisma.categories.findFirst({
                where: { id: category_id, tenantId }
            });

            if (!existingCategory) {
                return res.status(404).json({
                    ok: false,
                    error: "Categoría no encontrada"
                });
            }

            const normalized_title = title.toLowerCase().trim();

            const existingCategoryWithTitle = await prisma.categories.findFirst({
                where: { 
                    title: normalized_title,
                    id: { not: category_id },
                    tenantId
                }
            });

            if (existingCategoryWithTitle) {
                return res.status(400).json({
                    ok: false,
                    error: "Ya existe una categoría con este título"
                });
            }

            let image_url = existingCategory.image;

            if (image) {
                if (existingCategory.image) {
                    const imagePath = this.extractPathFromPublicUrl(existingCategory.image);
                    if (imagePath) {
                        await deleteImage(imagePath);
                    }
                }

                const fileName = `category-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
                const buffer: Buffer = (image as any).buffer ?? fs.readFileSync((image as any).path);
                const result = await uploadImage(buffer, fileName, 'categories', image.mimetype);
                
                if (result.url) {
                    image_url = result.url;
                } else {
                    console.log("Error subiendo imagen a Supabase", result.error);
                    return res.status(500).json({
                        ok: false,
                        error: "Error al subir la imagen"
                    });
                }
            }

            await prisma.categories.update({
                where: { id: category_id },
                data: {
                    title: normalized_title,
                    image: image_url
                }
            });

            return res.status(200).json({
                ok: true,
                message: "Categoría actualizada exitosamente"
            });

        } catch (error) {
            console.log(error);
            return res.status(500).json({
                ok: false,
                error: "Error al actualizar la categoría"
            });
        }
    }

    async categoryChangeStatus(req: Request, res: Response) {
        const tenantId = (req as any).tenantId || (req as any).user?.tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        try {
            const {
                category_id,
                status
            } = req.params as unknown as UpdateCategoryStatusSchema

            const statusNumber = parseInt(status);
            
            const status_map: { [key: number]: CategoryStatus } = {
                1: CategoryStatus.active,
                2: CategoryStatus.inactive,
                3: CategoryStatus.deleted
            }

            if (!status_map[statusNumber] || isNaN(statusNumber)) {
                return res.status(400).json({
                    ok: false,
                    error: "Estado de categoría inválido. Debe ser activo(1), inactivo(2) o eliminado(3)"
                });
            }

            
            const category = await prisma.categories.findFirst({
                where: { id: category_id, tenantId }
            });
            
            if (!category) {
                return res.status(404).json({
                    ok: false,
                    error: "Categoría no encontrada"
                });
            }

            await prisma.categories.update({
                where: { id: category_id },
                data: {
                    status: status_map[statusNumber]
                }
            })

            const statusMessages = {
                1: "activada",
                2: "desactivada", 
                3: "eliminada"
            };

            return res.status(200).json({
                ok: true,
                message: `Categoría ${statusMessages[statusNumber as keyof typeof statusMessages]} exitosamente`
            })
        } catch (error) {
            console.log(error)
            return res.status(500).json({
                ok: false,
                error: "Error al cambiar el estado de la categoría"
            });
        }
    }

    async getPublicCategories(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        try {
            const categories = await prisma.categories.findMany({
                where: {
                    status: CategoryStatus.active,
                    tenantId
                }
            })
            console.log("Categorías públicas:", categories);
            return res.status(200).json({
                ok: true,
                data: categories
            })
        } catch (error) {
            console.log(error)
            return res.status(500).json({
                ok: false,
                error: "Error al obtener las categorías públicas"
            });
        }
    }
    async getPublicProducts(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 12;
            const title = (req.query.title as string) || undefined;
            const categoryId = (req.query.categoryId as string) || undefined;
            const sortBy = (req.query.sortBy as string) || undefined;
            const sortOrder = (req.query.sortOrder as "asc" | "desc") || "asc";

            const cacheKey = `${tenantId}:products:all`;
            const cached = await redis.get(cacheKey);
            let products: any[] = [];
            if (cached) {
                products = (JSON.parse(cached) as any[]).filter((p) => p.is_active === true && p.state === "active");
                if (title) products = products.filter((p) => typeof p.title === "string" && p.title.toLowerCase().includes(title.toLowerCase()));
                if (categoryId) products = products.filter((p) => p.categoryId === categoryId);
                if (sortBy) {
                    products.sort((a, b) => {
                        const av = a[sortBy]; const bv = b[sortBy];
                        if (av === bv) return 0;
                        return sortOrder === "asc" ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
                    });
                } else {
                    products.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                }
                const totalProducts = products.length;
                const totalPages = Math.ceil(totalProducts / limit) || 1;
                const slice = products.slice((page - 1) * limit, (page - 1) * limit + limit);
                return res.status(200).json({ ok: true, data: { products: slice, pagination: { total: totalProducts, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 } } });
            }

            const skip = (page - 1) * limit;
            const where: any = { is_active: true, state: "active", tenantId };
            if (title) where.title = { contains: title, mode: "insensitive" };
            if (categoryId) where.categoryId = categoryId;
            const [totalProducts, dbProducts] = await Promise.all([
                prisma.products.count({ where }),
                prisma.products.findMany({ where, skip, take: limit, include: { category: true }, orderBy: sortBy ? [{ [sortBy]: sortOrder }] : [{ created_at: "desc" }] })
            ]);
            const totalPages = Math.ceil(totalProducts / limit) || 1;
            return res.status(200).json({ ok: true, data: { products: dbProducts, pagination: { total: totalProducts, page, limit, totalPages, hasNextPage: page < totalPages, hasPrevPage: page > 1 } } });
        } catch (error) {
            console.error("Error al obtener productos públicos:", error);
            return res.status(500).json({
                ok: false,
                error: "Error al obtener los productos públicos",
            });
        }
    }

    async getPublicProductById(req: Request, res: Response) {
        const tenantId = (req as any).tenantId;
        
        if (!tenantId) {
            return res.status(400).json({ ok: false, error: 'tenant_required' });
        }
        
        try {
            const { id } = req.params as { id: string }
            if (!id) {
                return res.status(400).json({ ok: false, error: "ID de producto requerido" })
            }
            const product = await prisma.products.findFirst({
                where: { id, tenantId },
                include: { category: true }
            })
            if (!product || product.is_active !== true || product.state !== ProductState.active) {
                return res.status(404).json({ ok: false, error: "Producto no encontrado" })
            }
            return res.status(200).json({ ok: true, data: { product } })
        } catch (error) {
            console.error("Error al obtener producto público por id:", error)
            return res.status(500).json({ ok: false, error: "Error al obtener el producto" })
        }
    }
}

export default ProductServices
