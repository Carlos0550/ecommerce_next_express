import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);
export const ProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(5).max(20).optional(),
  shipping_street: z.string().min(1).optional(),
  shipping_postal_code: z.string().min(3).max(12).optional(),
  shipping_city: z.string().min(1).optional(),
  shipping_province: z.string().min(1).optional(),
}).openapi({ description: 'Body para actualizar el perfil del usuario' });
export type ProfileUpdateRequest = z.infer<typeof ProfileUpdateSchema>;
