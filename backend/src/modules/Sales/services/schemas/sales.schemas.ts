export const SaleSource = ["WEB", "CAJA"] as const;
export type SaleSource = typeof SaleSource[number];
export const PaymentMethods = ["TARJETA", "EFECTIVO", "QR", "NINGUNO", "TRANSFERENCIA"] as const;
export type PaymentMethods = typeof PaymentMethods[number];
export type UserSale = {
    user_id?: string
}
export type SaleRequest = {
    payment_method: PaymentMethods
    source: SaleSource
    product_ids: string[]
    user_sale?: UserSale
    tax?: number
    loadedManually?: boolean
    manualProducts?: { quantity: number; title: string; price: number; options?: any }[]
    payment_methods?: { method: PaymentMethods; amount: number }[]
    items?: { product_id: string; quantity: number; options?: any }[]
    sale_date?: string
}
export type SalesSummaryRequest = {
    page: number,
    limit: number,
    start: string,
    end: string
}
