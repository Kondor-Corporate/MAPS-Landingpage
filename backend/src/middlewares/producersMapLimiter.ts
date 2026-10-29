import rateLimit from 'express-rate-limit';
import { createRateLimitStore } from './rateLimitStore.js';

function producersMapAttemptsPerWindow(): number {
  if (process.env.NODE_ENV === 'test') return 10_000;
  if (process.env.NODE_ENV === 'development') return 500;
  return 60;
}

/** GET /producers/map: 60 req/min por IP (endpoint público de alto tráfico). */
export const producersMapLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: producersMapAttemptsPerWindow(),
  standardHeaders: true,
  legacyHeaders: false,
  store: createRateLimitStore('rl:producersMap:'),
  message: {
    data: null,
    message: 'Demasiadas solicitudes. Intentá nuevamente en unos minutos.',
    error: null,
  },
});
