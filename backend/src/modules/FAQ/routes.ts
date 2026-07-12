import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { errors } from '@/utils/errors';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';
import FaqServices from './services/faq.services';
import { ensureFaqCreate, ensureFaqUpdate, parseFaqListQuery } from './router.controller';

const router = Router();
const service = new FaqServices();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const rs = await service.listPublic();
    res.json(rs);
  }),
);

router.get(
  '/admin',
  requireAuth,
  requireRole(["ADMIN"]),
  parseFaqListQuery,
  asyncHandler(async (req, res) => {
    const { page, limit } = (req as any).faqQuery as { page: number; limit: number };
    const rs = await service.listAdmin(page, limit);
    res.json(rs);
  }),
);

router.post(
  '/',
  requireAuth,
  requireRole(["ADMIN"]),
  ensureFaqCreate,
  asyncHandler(async (req, res) => {
    const data = (req as any).faqCreate;
    const rs = await service.create(data);
    res.status(201).json(rs);
  }),
);

router.put(
  '/:id',
  requireAuth,
  requireRole(["ADMIN"]),
  ensureFaqUpdate,
  asyncHandler(async (req, res) => {
    const raw = req.params.id;
    const id = typeof raw === 'string' ? raw : raw?.[0];
    if (!id) throw errors.missingFields(['id']);
    const data = (req as any).faqUpdate;
    const rs = await service.update(id, data);
    res.json(rs);
  }),
);

router.delete(
  '/:id',
  requireAuth,
  requireRole(["ADMIN"]),
  asyncHandler(async (req, res) => {
    const raw = req.params.id;
    const id = typeof raw === 'string' ? raw : raw?.[0];
    if (!id) throw errors.missingFields(['id']);
    const rs = await service.softDelete(id);
    res.json(rs);
  }),
);

export default router;