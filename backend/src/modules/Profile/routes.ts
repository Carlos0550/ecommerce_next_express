import type { Request, Response } from 'express';
import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { requireAuth } from '@/middlewares/auth.middleware';
import {
  uploadSingleImage,
  handleImageUploadError,
  validateImageMagicBytes,
} from '@/middlewares/image.middleware';
import ProfileServices from './services/profile.services';
import { validateUpdatePayload } from './router.controller';
import fs from 'fs';
import { uploadImage } from '@/config/minio';
import { errors } from '@/utils/errors';

const router = Router();
const service = new ProfileServices();

router.get('/profile/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const userId = Number(user.sub || user.id);
  const rs = await service.getMe(userId);
  res.json(rs);
}));

router.put(
  '/profile/me',
  requireAuth,
  validateUpdatePayload,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const userId = Number(user.sub || user.id);
    const data = (req as any).profileUpdate;
    const rs = await service.updateMe(userId, data);
    res.json(rs);
  }),
);

router.post(
  '/profile/avatar',
  requireAuth,
  uploadSingleImage('image'),
  handleImageUploadError,
  validateImageMagicBytes,
  asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user;
    const userId = Number(user.sub || user.id);
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw errors.missingFields(['image']);
    const buffer: Buffer = fs.readFileSync(file.path);
    const extRaw = (file.originalname || '').split('.').pop();
    const ext = extRaw ? `.${extRaw}` : '';
    const fileName = `avatar-${userId}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const result = await uploadImage(buffer, fileName, 'avatars', file.mimetype);
    if (!result.url) throw errors.imageUploadFailed();
    const rs = await service.updateAvatar(userId, result.url);
    res.json({ ...rs, url: result.url });
  }),
);

export default router;