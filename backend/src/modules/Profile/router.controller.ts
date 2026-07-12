import type { Request, Response, NextFunction } from 'express';
import { ProfileUpdateSchema } from './services/profile.zod';

export const validateUpdatePayload = (req: Request, _res: Response, next: NextFunction): void => {
  const parsed = ProfileUpdateSchema.parse(req.body);
  (req as any).profileUpdate = parsed;
  next();
};