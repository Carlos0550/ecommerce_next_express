export const EgresoPaymentMethods = [
  "TARJETA",
  "EFECTIVO",
  "QR",
  "NINGUNO",
  "TRANSFERENCIA",
] as const;

export type EgresoPaymentMethod = (typeof EgresoPaymentMethods)[number];

export interface EgresoRequest {
  title: string;
  description?: string;
  amount: number;
  payment_method: EgresoPaymentMethod;
  category_id: string;
  egreso_date: string;
}

export interface EgresoUpdateRequest {
  title?: string;
  description?: string;
  amount?: number;
  payment_method?: EgresoPaymentMethod;
  category_id?: string;
  egreso_date?: string;
}

export interface EgresoListQuery {
  page: number;
  limit: number;
  search?: string;
  category_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface EgresoCategoryRequest {
  title: string;
  description?: string;
  color?: string;
}

export interface EgresoCategoryUpdateRequest {
  title?: string;
  description?: string;
  color?: string;
}
