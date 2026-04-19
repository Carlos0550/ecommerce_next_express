import type { Request, Response, NextFunction } from 'express';
import { FaqCreateSchema, FaqUpdateSchema, FaqListQuery } from './services/faq.zod';
export function ensureFaqCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = FaqCreateSchema.parse(req.body);
    (req as any).faqCreate = parsed;
    next();
  } catch (err: any) {
    res.status(400).json({ ok: false, error: 'invalid_payload', message: err?.message || 'validation_error' });
  }
}
export function ensureFaqUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = FaqUpdateSchema.parse(req.body);
    (req as any).faqUpdate = parsed;
    next();
  } catch (err: any) {
    res.status(400).json({ ok: false, error: 'invalid_payload', message: err?.message || 'validation_error' });
  }
}
export function parseFaqListQuery(req: Request, _res: Response, next: NextFunction) {
  try {
    const parsed = FaqListQuery.parse({
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    (req as any).faqQuery = parsed;
    next();
  } catch {
    (req as any).faqQuery = { page: 1, limit: 50 };
    next();
  }
}
