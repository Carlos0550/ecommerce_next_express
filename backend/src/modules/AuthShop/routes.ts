import { Router } from 'express';
import AuthServices from '@/modules/User/services/auth_services';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';
const router = Router();
const authServices = new AuthServices();
router.post('/login', (req, _res, next) => next(), (req, res) => authServices.loginShop(req, res));
router.post('/register', (req, _res, next) => next(), (req, res) => authServices.registerShop(req, res));
router.post('/password/reset', (req, _res, next) => next(), (req, res) => authServices.resetPasswordShop(req, res));
router.post('/password/change', requireAuth, (req, res) => authServices.changePasswordShop(req, res));
router.get('/validate-token', requireAuth, requireRole([2]), (req, res) => {
  const user = (req as any).user;
  res.json({
    ok: true,
    id: user.sub || user.id,
    email: user.email,
    name: user.name,
    is_active: user.is_active ?? true,
    role: user.role || 2,
    profileImage: user.profileImage || null,
    subjectType: user.subjectType || 'user',
  });
});
export default router;
