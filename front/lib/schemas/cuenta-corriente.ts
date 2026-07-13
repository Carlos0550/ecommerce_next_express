import { z } from "zod";

export const CC_PAYMENT_METHODS = [
  "EFECTIVO",
  "TARJETA",
  "TRANSFERENCIA",
  "QR",
  "NINGUNO",
] as const;

export const CC_PAYMENT_LABELS: Record<(typeof CC_PAYMENT_METHODS)[number], string> = {
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  QR: "QR",
  NINGUNO: "Ninguno",
};

export const ClienteCCFormSchema = z.object({
  nombre: z.string().min(1, "El nombre es obligatorio"),
  telefono: z.string().min(1, "El teléfono es obligatorio"),
  email: z
    .string()
    .email("Email inválido")
    .optional()
    .or(z.literal("")),
  direccion: z.string().optional(),
  notas: z.string().optional(),
});
export type ClienteCCFormInput = z.input<typeof ClienteCCFormSchema>;
export type ClienteCCFormValues = z.output<typeof ClienteCCFormSchema>;

export const DeudaBulkFormSchema = z.object({
  productos: z.string().min(1, "Cargá al menos un producto"),
  fecha_default: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
});
export type DeudaBulkFormInput = z.input<typeof DeudaBulkFormSchema>;
export type DeudaBulkFormValues = z.output<typeof DeudaBulkFormSchema>;

export const DeudaEditSchema = z.object({
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor a 0"),
  titulo: z.string().min(1, "Requerido"),
  precio_unit: z.coerce.number().positive("El precio debe ser mayor a 0"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  notas: z.string().optional(),
});
export type DeudaEditInput = z.input<typeof DeudaEditSchema>;
export type DeudaEditValues = z.output<typeof DeudaEditSchema>;

export const PagoFormSchema = z.object({
  monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
  payment_method: z.enum(CC_PAYMENT_METHODS),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  notas: z.string().optional(),
});
export type PagoFormInput = z.input<typeof PagoFormSchema>;
export type PagoFormValues = z.output<typeof PagoFormSchema>;

export interface ParsedDeudaLinePreview {
  cantidad: number;
  titulo: string;
  precio_unit: number;
  total: number;
  error?: string;
}

/**
 * Parsea el texto multilinea de productos (formato CANT TITULO PRECIO en ARS).
 * Devuelve array de líneas con preview y errores por línea. No lanza.
 */
export function parseProductosPreview(texto: string): ParsedDeudaLinePreview[] {
  const lines = texto
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const RE = /^(\d+)\s+(.+?)\s+(-?[\d.,]+)\s*$/;
  return lines.map((raw, idx) => {
    const m = RE.exec(raw);
    if (!m) {
      return {
        cantidad: 0,
        titulo: raw,
        precio_unit: 0,
        total: 0,
        error: `Línea ${idx + 1}: formato inválido (CANT TITULO PRECIO)`,
      };
    }
    const cantidad = parseInt(m[1]!, 10);
    const titulo = m[2]!.trim();
    const precio_unit = parseARS(m[3]!);
    if (!Number.isFinite(precio_unit) || precio_unit < 0) {
      return {
        cantidad,
        titulo,
        precio_unit: 0,
        total: 0,
        error: `Línea ${idx + 1}: precio inválido (${m[3]})`,
      };
    }
    return {
      cantidad,
      titulo,
      precio_unit,
      total: cantidad * precio_unit,
    };
  });
}

/**
 * Convierte un string en formato ARS ("1.234,50" o "1234.50" o "1234,50")
 * a número. Acepta es-AR y formato US.
 */
export function parseARS(input: string): number {
  const s = input.trim().replace(/\s/g, "");
  if (!s) return NaN;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  let normalized: string;
  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = s;
  }
  return parseFloat(normalized);
}

export function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
