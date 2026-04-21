import multer from 'multer';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { fromFile } from 'file-type';

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

async function unlinkSafe(p: string) {
  try { await fs.promises.unlink(p); } catch {}
}

export const validateImageMagicBytes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const files: Express.Multer.File[] = req.file
    ? [req.file]
    : Array.isArray(req.files)
      ? (req.files)
      : Object.values((req.files as Record<string, Express.Multer.File[]>) || {}).flat();
  for (const f of files) {
    if (!f?.path) continue;
    const detected = await fromFile(f.path).catch(() => null);
    if (!detected || !ALLOWED_IMAGE_MIME.has(detected.mime)) {
      await Promise.all(files.map((x) => unlinkSafe(x.path)));
      res.status(400).json({ ok: false, error: 'invalid_file_type', message: 'El contenido del archivo no coincide con un formato de imagen permitido' });
      return;
    }
  }
  next();
};
const imageUploadDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(imageUploadDir)) {
  fs.mkdirSync(imageUploadDir, { recursive: true });
}
const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      if (!fs.existsSync(imageUploadDir)) {
        fs.mkdirSync(imageUploadDir, { recursive: true });
      }
      cb(null, imageUploadDir);
    } catch (err) {
      cb(err as Error, imageUploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'image-' + uniqueSuffix + ext);
  }
});
const imageFileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new Error('Solo se permiten archivos de imagen'));
    return;
  }
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    cb(new Error('Formato de imagen no permitido. Use: ' + allowedExtensions.join(', ')));
    return;
  }
  cb(null, true);
};
export const imageUpload = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 30 * 1024 * 1024, 
  }
});
export const uploadSingleImage = (fieldName = 'image') => imageUpload.single(fieldName);
export const uploadMultipleImages = (fieldName = 'images', maxCount = 5) => 
  imageUpload.array(fieldName, maxCount);
export const handleImageUploadError = (err: unknown, _req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: 'Imagen demasiado grande',
        message: 'El tamaño de la imagen excede el límite de 30MB'
      });
      return;
    }
    res.status(400).json({
      error: 'Error al subir imagen',
      message: err.message
    });
    return;
  }
  if (err instanceof Error && err.message && (err.message.includes('Solo se permiten') || err.message.includes('Formato de imagen'))) {
    res.status(400).json({
      error: 'Formato inválido',
      message: err.message
    });
    return;
  }
  next(err);
};
