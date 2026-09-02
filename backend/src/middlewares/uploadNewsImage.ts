import multer from 'multer';
import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

const uploadNewsImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new AppError(400, 'Solo se permiten imágenes JPG, JPEG o PNG'));
      return;
    }
    cb(null, true);
  },
}).single('file');

export const uploadNewsImageMiddleware: RequestHandler = (req, res, next) => {
  uploadNewsImage(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(413, 'El archivo supera el tamaño máximo de 10 MB.'));
      return;
    }
    next(error);
  });
};
