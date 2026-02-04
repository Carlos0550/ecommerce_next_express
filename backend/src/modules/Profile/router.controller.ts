import { Request, Response, NextFunction } from 'express';
import { ProfileUpdateSchema } from './services/profile.zod';
export function validateUpdatePayload(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ProfileUpdateSchema.parse(req.body);
    (req as any).profileUpdate = parsed;
    next();
  } catch (err: any) {
    res.status(400).json({ ok: false, error: 'invalid_payload', message: err?.message || 'validation_error' });
  }
}
