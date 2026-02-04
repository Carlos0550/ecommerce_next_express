import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
extendZodWithOpenApi(z);
export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
}).openapi({ description: 'Body para login de usuario' });
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
}).openapi({ description: 'Body para registro de usuario' });
export const NewUserRequestSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role_id: z.number().int().min(1),
}).openapi({ description: 'Body para creación de usuario con rol' });
export const GetUsersQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).default(10),
  search: z.string().optional(),
}).openapi({ description: 'Query params para listar usuarios' });
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type NewUserRequest = z.infer<typeof NewUserRequestSchema>;
export type GetUsersQuery = z.infer<typeof GetUsersQuerySchema>;
