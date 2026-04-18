import { Router, Request, Response } from 'express';
import { requireAuth } from '@/middlewares/auth.middleware';
import { uploadSingleImage, handleImageUploadError, validateImageMagicBytes } from '@/middlewares/image.middleware';
import ProfileServices from './services/profile.services';
import { validateUpdatePayload } from './router.controller';
import fs from 'fs';
import { uploadImage } from '@/config/minio';
const router = Router();
const service = new ProfileServices();
router.get('/profile/me', requireAuth, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = Number(user.sub || user.id);
  const rs = await service.getMe(userId);
  res.json(rs);
});
router.put('/profile/me', requireAuth, validateUpdatePayload, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = Number(user.sub || user.id);
  const data = (req as any).profileUpdate;
  const rs = await service.updateMe(userId, data);
  res.json(rs);
});
router.post('/profile/avatar', requireAuth, uploadSingleImage('image'), handleImageUploadError, validateImageMagicBytes, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = Number(user.sub || user.id);
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) return res.status(400).json({ ok: false, error: 'missing_image' });
  try {
    const buffer: Buffer = fs.readFileSync(file.path);
    const fileName = `avatar-${userId}-${Date.now()}-${Math.round(Math.random() * 1E9)}${(file.originalname || '').split('.').pop() ? '.' + (file.originalname.split('.').pop() as string) : ''}`;
    const result = await uploadImage(buffer, fileName, 'avatars', file.mimetype);
    if (!result.url) {
      return res.status(500).json({ ok: false, error: 'upload_failed' });
    }
    const rs = await service.updateAvatar(userId, result.url);
    res.json({ ...rs, url: result.url });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'upload_exception' });
  }
});
export default router;
