import rateLimit from 'express-rate-limit';
import { createRateLimitStore } from './rateLimitStore.js';

function postulacionAttemptsPerWindow(): number {
  if (process.env.NODE_ENV === 'test') return 10_000;
  if (process.env.NODE_ENV === 'development') return 100;
  return 5;
}

/** POST /postulaciones: 5 envíos / 10 min por IP (endpoint público, anti-spam). */
export const postulacionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: postulacionAttemptsPerWindow(),
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('rl:postulacion:'),
  message: {
    data: null,
    message: 'Demasiados envíos. Intentá nuevamente en unos minutos.',
    error: null,
  },
});
