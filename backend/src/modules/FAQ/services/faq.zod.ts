import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);
export const FaqCreateSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  position: z.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
}).openapi({ description: 'Crear FAQ' });
export const FaqUpdateSchema = z.object({
  question: z.string().min(1).optional(),
  answer: z.string().min(1).optional(),
  position: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
}).openapi({ description: 'Actualizar FAQ' });
export const FaqListQuery = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).default(50),
}).openapi({ description: 'Listado de FAQs' });
export type FaqCreateRequest = z.infer<typeof FaqCreateSchema>;
export type FaqUpdateRequest = z.infer<typeof FaqUpdateSchema>;
export type FaqListRequest = z.infer<typeof FaqListQuery>;
