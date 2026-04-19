import multer from 'multer';
import path from 'path';
import type { Request, Response, NextFunction } from 'express';
import fs from 'fs';
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
};
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void => {
  const allowedExts = ALLOWED_MIME_TYPES[file.mimetype];
  if (!allowedExts) {
    cb(new Error('Tipo de archivo no permitido'));
    return;
  }
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExts.includes(ext)) {
    cb(new Error('La extensión del archivo no coincide con su tipo'));
    return;
  }
  cb(null, true);
};
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, 
  }
});
export const handleMulterError = (err: unknown, _req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: 'Archivo demasiado grande',
        message: 'El tamaño del archivo excede el límite permitido'
      });
      return;
    }
    res.status(400).json({
      error: 'Error al subir archivo',
      message: err.message
    });
    return;
  }
  next(err);
};
export const uploadSingle = (fieldName: string) => upload.single(fieldName);
export const uploadMultiple = (fieldName: string, maxCount = 5) => 
  upload.array(fieldName, maxCount);
export const uploadFields = (fields: { name: string, maxCount: number }[]) => 
  upload.fields(fields);
