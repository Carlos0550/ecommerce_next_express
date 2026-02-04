import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);
import { PaymentMethods, SaleSource } from './sales.schemas';
export const SalesSchema = z.object({
    payment_method: z.enum(PaymentMethods),
    source: z.enum(SaleSource),
    product_ids: z.array(z.string()),
    user_sale: z.object({
        user_id: z.string().optional(),
    }).optional(),
    tax: z.number().optional(),
    loadedManually: z.boolean().optional(),
    manualProducts: z.array(
        z.object({
            quantity: z.number().int().positive(),
            title: z.string().min(1),
            price: z.number().positive(),
        })
    ).optional(),
    payment_methods: z.array(
        z.object({
            method: z.enum(PaymentMethods),
            amount: z.number().positive(),
        })
    ).max(2).optional(),
})
