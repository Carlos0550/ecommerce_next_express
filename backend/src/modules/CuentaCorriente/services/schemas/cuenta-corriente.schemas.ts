import type { PaymentMethod } from "@prisma/client";

export const CCPaymentMethods = [
  "EFECTIVO",
  "TARJETA",
  "TRANSFERENCIA",
  "QR",
  "NINGUNO",
] as const;

export type CCPaymentMethod = (typeof CCPaymentMethods)[number];

export interface ClienteCCRequest {
  nombre: string;
  telefono: string;
  email?: string;
  direccion?: string;
  notas?: string;
}

export interface ClienteCCUpdateRequest {
  nombre?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
  notas?: string;
}

export interface ClienteCCListQuery {
  page: number;
  limit: number;
  search?: string;
  estado?: "abierto" | "vencido" | "cerrado" | "sin_ciclos";
}

export interface ClienteCCCiclosQuery {
  from?: string;
  to?: string;
}

export interface DeudaBulkRequest {
  productos: string;
  fecha_default: string;
}

export interface DeudaUpdateRequest {
  cantidad?: number;
  titulo?: string;
  precio_unit?: number;
  fecha?: string;
  notas?: string;
}

export interface PagoCreateRequest {
  monto: number;
  payment_method: PaymentMethod;
  fecha: string;
  notas?: string;
}

export interface PagoUpdateRequest {
  monto?: number;
  payment_method?: PaymentMethod;
  fecha?: string;
  notas?: string;
}

export interface ParsedDeudaLine {
  cantidad: number;
  titulo: string;
  precio_unit: number;
  total: number;
}
