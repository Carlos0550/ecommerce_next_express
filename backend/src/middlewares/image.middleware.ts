import multer from 'multer';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';

const imageUploadDir = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(imageUploadDir)) {
  fs.mkdirSync(imageUploadDir, { recursive: true });
}

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      
      if (!fs.existsSync(imageUploadDir)) {
        fs.mkdirSync(imageUploadDir, { recursive: true });
      }
      cb(null, imageUploadDir);
    } catch (err) {
      cb(err as any, imageUploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'image-' + uniqueSuffix + ext);
  }
});

const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Solo se permiten archivos de imagen'));
  }
  
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Formato de imagen no permitido. Use: ' + allowedExtensions.join(', ')));
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

export const uploadSingleImage = (fieldName: string = 'image') => imageUpload.single(fieldName);

export const uploadMultipleImages = (fieldName: string = 'images', maxCount: number = 5) => 
  imageUpload.array(fieldName, maxCount);

export const handleImageUploadError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'Imagen demasiado grande',
        message: 'El tamaño de la imagen excede el límite de 5MB'
      });
    }
    return res.status(400).json({ 
      error: 'Error al subir imagen',
      message: err.message
    });
  }
  
  if (err.message.includes('Solo se permiten') || err.message.includes('Formato de imagen')) {
    return res.status(400).json({ 
      error: 'Formato inválido',
      message: err.message
    });
  }
  
  next(err);
};