import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { CCPaymentMethods } from "./cuenta-corriente.schemas";

extendZodWithOpenApi(z);

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const numberFromMixed = z
  .union([z.number(), z.string()])
  .transform((v) => (typeof v === "string" ? parseFloat(v) : v));

const positiveNumber = numberFromMixed.refine(
  (v) => Number.isFinite(v) && v > 0,
  "El monto debe ser mayor a 0",
);

export const ClienteCCCreateSchema = z
  .object({
    nombre: z.string().min(1, "El nombre es obligatorio").trim(),
    telefono: z.string().min(1, "El teléfono es obligatorio").trim(),
    email: z.string().email("Email inválido").trim().optional().or(z.literal("")),
    direccion: z.string().trim().optional(),
    notas: z.string().trim().optional(),
  })
  .openapi({ description: "Body para crear un cliente de cuenta corriente" });

export const ClienteCCUpdateSchema = z
  .object({
    nombre: z.string().min(1).trim().optional(),
    telefono: z.string().min(1).trim().optional(),
    email: z.string().email("Email inválido").trim().optional().or(z.literal("")),
    direccion: z.string().trim().optional(),
    notas: z.string().trim().optional(),
  })
  .openapi({ description: "Body para actualizar un cliente de cuenta corriente" });

export const ClienteCCListQuerySchema = z
  .object({
    page: z
      .union([z.string(), z.number()])
      .transform((v) => Number(v))
      .pipe(z.number().int().min(1))
      .optional(),
    limit: z
      .union([z.string(), z.number()])
      .transform((v) => Number(v))
      .pipe(z.number().int().min(1).max(200))
      .optional(),
    search: z.string().optional(),
    estado: z.enum(["abierto", "vencido", "cerrado", "sin_ciclos"]).optional(),
  })
  .openapi({ description: "Query params para listar clientes CC" });

export const ClienteCCCiclosQuerySchema = z
  .object({
    from: z.string().regex(dateRegex).optional(),
    to: z.string().regex(dateRegex).optional(),
  })
  .openapi({ description: "Query params para historial de ciclos" });

export const DeudaBulkSchema = z
  .object({
    productos: z.string().min(1, "Tenés que cargar al menos un producto"),
    fecha_default: z.string().regex(dateRegex, "Fecha inválida (YYYY-MM-DD)"),
  })
  .openapi({ description: "Body para añadir deudas bulk a un cliente CC" });

export const DeudaUpdateSchema = z
  .object({
    cantidad: numberFromMixed
      .refine((v) => Number.isFinite(v) && Number.isInteger(v) && v > 0, "Cantidad inválida")
      .optional(),
    titulo: z.string().min(1).trim().optional(),
    precio_unit: positiveNumber.optional(),
    fecha: z.string().regex(dateRegex, "Fecha inválida (YYYY-MM-DD)").optional(),
    notas: z.string().trim().optional(),
  })
  .openapi({ description: "Body para actualizar una deuda CC" });

export const PagoCreateSchema = z
  .object({
    monto: positiveNumber,
    payment_method: z.enum(CCPaymentMethods),
    fecha: z.string().regex(dateRegex, "Fecha inválida (YYYY-MM-DD)"),
    notas: z.string().trim().optional(),
  })
  .openapi({ description: "Body para crear un pago CC" });

export const PagoUpdateSchema = z
  .object({
    monto: positiveNumber.optional(),
    payment_method: z.enum(CCPaymentMethods).optional(),
    fecha: z.string().regex(dateRegex, "Fecha inválida (YYYY-MM-DD)").optional(),
    notas: z.string().trim().optional(),
  })
  .openapi({ description: "Body para actualizar un pago CC" });

export type ClienteCCCreateRequest = z.infer<typeof ClienteCCCreateSchema>;
export type ClienteCCUpdateRequest = z.infer<typeof ClienteCCUpdateSchema>;
export type ClienteCCListQueryRequest = z.infer<typeof ClienteCCListQuerySchema>;
export type ClienteCCCiclosQueryRequest = z.infer<typeof ClienteCCCiclosQuerySchema>;
export type DeudaBulkRequest = z.infer<typeof DeudaBulkSchema>;
export type DeudaUpdateRequest = z.infer<typeof DeudaUpdateSchema>;
export type PagoCreateRequest = z.infer<typeof PagoCreateSchema>;
export type PagoUpdateRequest = z.infer<typeof PagoUpdateSchema>;
