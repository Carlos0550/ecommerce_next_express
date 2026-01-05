import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);


export const BinaryFileSchema = z
  .string()
  .openapi({ type: 'string', format: 'binary', description: 'Archivo binario' });

export const SaveProductRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.union([z.number(), z.string()]),
  tags: z.array(z.string()).optional(),
  category_id: z.string().min(1),
  productImages: z.array(BinaryFileSchema).optional(),
  fillWithAI: z.boolean().optional(),
  state: z.enum(['active','inactive','draft','out_stock','deleted']).optional(),
  stock: z.union([z.number().int().min(0), z.string()]).optional(),
  additionalContext: z.string().optional(),
  options: z.union([z.array(z.object({ name: z.string(), values: z.array(z.string()) })), z.string()]).optional(),
}).openapi({ description: 'Body multipart para crear producto' });

export const SaveCategoryRequestSchema = z.object({
  title: z.string().min(1),
  image: BinaryFileSchema.optional(),
}).openapi({ description: 'Body multipart para crear categoría' });

export const GetProductsQuerySchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  title: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  state: z.enum(['active','inactive','draft','out_stock','deleted']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc','desc']).optional(),
}).openapi({ description: 'Query params para listar productos' });

export const UpdateProductRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  price: z.union([z.number(), z.string()]),
  tags: z.array(z.string()).optional(),
  category_id: z.string().min(1),
  existingImageUrls: z.array(z.string()).optional(),
  deletedImageUrls: z.array(z.string()).optional(),
  productImages: z.array(BinaryFileSchema).optional(),
  fillWithAI: z.boolean().optional(),
  state: z.enum(['active','inactive','draft','out_stock','deleted']).optional(),
  stock: z.union([z.number().int().min(0), z.string()]).optional(),
  options: z.union([z.array(z.object({ name: z.string(), values: z.array(z.string()) })), z.string()]).optional(),
}).openapi({ description: 'Body multipart para actualizar producto' });

export const UpdateCategoryStatusSchema = z.object({
  status: z.string(),
  category_id: z.string()
})

export const UpdateProductStatusSchema = z.object({
  state: z.enum(['active','inactive','draft','out_stock','deleted']),
  product_id: z.string()
})

export type SaveProductRequest = z.infer<typeof SaveProductRequestSchema>;
export type SaveCategoryRequest = z.infer<typeof SaveCategoryRequestSchema>;
export type GetProductsQuery = z.infer<typeof GetProductsQuerySchema>;
export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>;
export type UpdateCategoryStatusSchema = z.infer<typeof UpdateCategoryStatusSchema>
export type UpdateProductStatusSchema = z.infer<typeof UpdateProductStatusSchema>