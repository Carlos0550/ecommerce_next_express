import { Router } from 'express';
import TenantController from './router.controller';
import { requireAuth } from '@/middlewares/auth.middleware';
import { resolveTenant } from '@/middlewares/tenant.middleware';

const router = Router();


router.get('/check-slug/:slug', TenantController.checkSlugAvailability);
router.get('/preview-slug/:storeName', TenantController.previewSlug);
router.post('/register', TenantController.registerTenant);
router.get('/:slug', TenantController.getPublicTenantInfo);


router.patch('/slug', requireAuth, resolveTenant, TenantController.updateSlug);

export default router;


