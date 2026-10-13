import rateLimit from 'express-rate-limit';
import { createRateLimitStore, rateLimitJsonHandler } from './rateLimitStore.js';

function postulacionAttemptsPerWindow(): number {
  if (process.env.NODE_ENV === 'test') return 10_000;
  if (process.env.NODE_ENV === 'development') return 100;
  return 5;
}

/**
 * POST /postulaciones: 5 envíos / 10 min por IP (endpoint público, anti-spam).
 *
 * `standardHeaders`/`legacyHeaders` en `false`: no se exponen los encabezados
 * `RateLimit-*`/`X-RateLimit-*` para no revelar el umbral ni la ventana de la regla.
 * El `handler` propio conserva un `Retry-After` razonable (sin filtrar el límite) y
 * responde con el envelope estándar de la API.
 */
export const postulacionLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: postulacionAttemptsPerWindow(),
  standardHeaders: false,
  legacyHeaders: false,
  store: createRateLimitStore('rl:postulacion:'),
  handler: rateLimitJsonHandler('Demasiados envíos. Intentá nuevamente en unos minutos.'),
});
