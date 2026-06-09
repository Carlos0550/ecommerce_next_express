import { z } from "zod";

export const EGRESO_PAYMENT_METHODS = [
  "TARJETA",
  "EFECTIVO",
  "QR",
  "NINGUNO",
  "TRANSFERENCIA",
] as const;

export const EgresoFormSchema = z.object({
  title: z.string().min(1, "Requerido"),
  description: z.string().optional(),
  amount: z.coerce.number().positive("Monto debe ser mayor a 0"),
  payment_method: z.enum(EGRESO_PAYMENT_METHODS),
  category_id: z.string().min(1, "Elegí una categoría"),
  egreso_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});
export type EgresoFormInput = z.input<typeof EgresoFormSchema>;
export type EgresoFormValues = z.output<typeof EgresoFormSchema>;

export const EgresoCategoryFormSchema = z.object({
  title: z.string().min(1, "Requerido"),
  description: z.string().optional(),
  color: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}){1,2}$/i, "Color inválido")
    .optional()
    .or(z.literal("")),
});
export type EgresoCategoryFormInput = z.input<typeof EgresoCategoryFormSchema>;
export type EgresoCategoryFormValues = z.output<typeof EgresoCategoryFormSchema>;
