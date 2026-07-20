import multer from 'multer';
import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const uploadFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError(400, 'Solo se permiten imágenes JPG, PNG o WEBP'));
      return;
    }
    cb(null, true);
  },
}).single('file');

export const uploadFotoMiddleware: RequestHandler = (req, res, next) => {
  uploadFoto(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(413, 'El archivo supera el tamaño máximo de 5 MB.'));
      return;
    }
    next(error);
  });
};
