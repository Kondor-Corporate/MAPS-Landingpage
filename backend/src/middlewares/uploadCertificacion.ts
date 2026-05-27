import multer from 'multer';
import { AppError } from '../lib/errors.js';

const MAX_BYTES = 10 * 1024 * 1024;

export const uploadCertificacionMiddleware = multer({
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
