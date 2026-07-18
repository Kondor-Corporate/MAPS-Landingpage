import multer from 'multer';
import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

const MAX_BYTES = 10 * 1024 * 1024;

const uploadCertificacion = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new AppError(400, 'Solo se permiten archivos PDF'));
      return;
    }
    cb(null, true);
  },
}).single('file');

export const uploadCertificacionMiddleware: RequestHandler = (req, res, next) => {
  uploadCertificacion(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(413, 'El archivo supera el tamaño máximo de 10 MB.'));
      return;
    }
    next(error);
  });
};
