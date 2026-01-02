import { Router } from 'express';
import whatsAppController from './router.controller';
import { requireAuth, requireRole } from '@/middlewares/auth.middleware';

const router = Router();

router.post('/webhook', whatsAppController.handleWebhook);

router.get('/config', requireAuth, requireRole([1]), whatsAppController.getConfig);
router.put('/config', requireAuth, requireRole([1]), whatsAppController.updateConfig);

router.post('/session/create', requireAuth, requireRole([1]), whatsAppController.createSession);
router.get('/session/qrcode', requireAuth, requireRole([1]), whatsAppController.getQRCode);
router.get('/session/status', requireAuth, requireRole([1]), whatsAppController.getSessionStatus);
router.delete('/session/disconnect', requireAuth, requireRole([1]), whatsAppController.disconnectSession);

router.post('/test', requireAuth, requireRole([1]), whatsAppController.sendTestMessage);

export default router;

