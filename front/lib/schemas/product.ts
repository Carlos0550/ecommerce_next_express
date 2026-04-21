import { z } from "zod";

export const ProductFormSchema = z.object({
  title: z.string().min(1, "Requerido"),
  description: z.string().optional(),
  price: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine((v) => Number.isFinite(v) && v >= 0, "Precio inválido"),
  stock: z
    .union([z.string(), z.number()])
    .transform((v) => Number(v))
    .refine(
      (v) => Number.isFinite(v) && Number.isInteger(v) && v >= 0,
      "Stock inválido"
    ),
  category_id: z.string().min(1, "Elegí una categoría"),
  sku: z.string().optional(),
});

export type ProductFormInput = z.input<typeof ProductFormSchema>;
export type ProductFormValues = z.output<typeof ProductFormSchema>;

export const CategoryFormSchema = z.object({
  title: z.string().min(1, "Requerido"),
  slug: z.string().optional(),
});
export type CategoryFormInput = z.input<typeof CategoryFormSchema>;
