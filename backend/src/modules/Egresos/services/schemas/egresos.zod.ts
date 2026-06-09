import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { EgresoPaymentMethods } from "./egresos.schemas";

extendZodWithOpenApi(z);

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const EgresoCreateSchema = z
  .object({
    title: z.string().min(1, "El título es obligatorio"),
    description: z.string().optional(),
    amount: z
      .union([z.number(), z.string()])
      .transform((v) => (typeof v === "string" ? parseFloat(v) : v))
      .refine((v) => Number.isFinite(v) && v > 0, "El monto debe ser mayor a 0"),
    payment_method: z.enum(EgresoPaymentMethods),
    category_id: z.string().min(1, "La categoría es obligatoria"),
    egreso_date: z
      .string()
      .regex(dateRegex, "Fecha inválida (YYYY-MM-DD)"),
  })
  .openapi({ description: "Body para crear un egreso" });

export const EgresoUpdateSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    amount: z
      .union([z.number(), z.string()])
      .transform((v) => (typeof v === "string" ? parseFloat(v) : v))
      .refine((v) => Number.isFinite(v) && v > 0, "El monto debe ser mayor a 0")
      .optional(),
    payment_method: z.enum(EgresoPaymentMethods).optional(),
    category_id: z.string().min(1).optional(),
    egreso_date: z
      .string()
      .regex(dateRegex, "Fecha inválida (YYYY-MM-DD)")
      .optional(),
  })
  .openapi({ description: "Body para actualizar un egreso" });

export const EgresoListQuerySchema = z
  .object({
    page: z
      .union([z.string(), z.number()])
      .transform((v) => Number(v))
      .pipe(z.number().int().min(1))
      .optional(),
    limit: z
      .union([z.string(), z.number()])
      .transform((v) => Number(v))
      .pipe(z.number().int().min(1).max(100))
      .optional(),
    search: z.string().optional(),
    category_id: z.string().optional(),
    start_date: z.string().regex(dateRegex).optional(),
    end_date: z.string().regex(dateRegex).optional(),
  })
  .openapi({ description: "Query params para listar egresos" });

export const EgresoCategoryCreateSchema = z
  .object({
    title: z.string().min(1, "El título es obligatorio"),
    description: z.string().optional(),
    color: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}){1,2}$/, "Color inválido")
      .optional(),
  })
  .openapi({ description: "Body para crear una categoría de egresos" });

export const EgresoCategoryUpdateSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    color: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}){1,2}$/, "Color inválido")
      .optional(),
  })
  .openapi({ description: "Body para actualizar una categoría de egresos" });

export type EgresoCreateRequest = z.infer<typeof EgresoCreateSchema>;
export type EgresoUpdateRequest = z.infer<typeof EgresoUpdateSchema>;
export type EgresoListQueryRequest = z.infer<typeof EgresoListQuerySchema>;
export type EgresoCategoryCreateRequest = z.infer<
  typeof EgresoCategoryCreateSchema
>;
export type EgresoCategoryUpdateRequest = z.infer<
  typeof EgresoCategoryUpdateSchema
>;
