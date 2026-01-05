import { Router } from 'express';
import AuthServices from '@/modules/User/services/auth_services';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';

const router = Router();
const authServices = new AuthServices();

router.post('/login', (req, _res, next) => next(), (req, res) => authServices.loginAdmin(req, res));
router.post('/register', (req, _res, next) => next(), (req, res) => authServices.registerAdmin(req, res));
router.post('/password/reset', (req, _res, next) => next(), (req, res) => authServices.resetPasswordAdmin(req, res));
router.post('/password/change', requireAuth, requireRole([1]), (req, res) => authServices.changePasswordAdmin(req, res));


router.get('/validate-token', requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({
    ok: true,
    id: user.sub || user.id,
    email: user.email,
    name: user.name,
    is_active: true,
    role: user.role || 1,
    profileImage: user.profileImage || null,
    is_clerk: !!user.is_clerk,
    subjectType: 'admin',
  });
});

export default router;
