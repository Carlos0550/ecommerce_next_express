import type { Request, Response, NextFunction } from 'express';
import { FaqCreateSchema, FaqUpdateSchema, FaqListQuery } from './services/faq.zod';

export function ensureFaqCreate(req: Request, _res: Response, next: NextFunction): void {
  const parsed = FaqCreateSchema.parse(req.body);
  (req as any).faqCreate = parsed;
  next();
}

export function ensureFaqUpdate(req: Request, _res: Response, next: NextFunction): void {
  const parsed = FaqUpdateSchema.parse(req.body);
  (req as any).faqUpdate = parsed;
  next();
}

export function parseFaqListQuery(req: Request, _res: Response, next: NextFunction): void {
  try {
    const parsed = FaqListQuery.parse({
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    (req as any).faqQuery = parsed;
  } catch {
    (req as any).faqQuery = { page: 1, limit: 50 };
  }
  next();
}