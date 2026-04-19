import { Router } from 'express';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';
import FaqServices from './services/faq.services';
import { ensureFaqCreate, ensureFaqUpdate, parseFaqListQuery } from './router.controller';
const router = Router();
const service = new FaqServices();
router.get('/', async (_req, res) => {
  const rs = await service.listPublic();
  res.json(rs);
});
router.get('/admin', requireAuth, requireRole(["ADMIN"]), parseFaqListQuery, async (req, res) => {
  const { page, limit } = (req as any).faqQuery as { page: number; limit: number };
  const rs = await service.listAdmin(page, limit);
  res.json(rs);
});
router.post('/', requireAuth, requireRole(["ADMIN"]), ensureFaqCreate, async (req, res) => {
  const data = (req as any).faqCreate;
  const rs = await service.create(data);
  res.status(201).json(rs);
});
router.put('/:id', requireAuth, requireRole(["ADMIN"]), ensureFaqUpdate, async (req, res) => {
  const id = req.params.id;
  if (!id) { res.status(400).json({ ok: false, error: 'missing_id' }); return; }
  const data = (req as any).faqUpdate;
  const rs = await service.update(id, data);
  res.json(rs);
});
router.delete('/:id', requireAuth, requireRole(["ADMIN"]), async (req, res) => {
  const id = req.params.id;
  if (!id) { res.status(400).json({ ok: false, error: 'missing_id' }); return; }
  const rs = await service.softDelete(id);
  res.json(rs);
});
export default router;
