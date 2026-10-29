import type { Request } from 'express';
import rateLimit from 'express-rate-limit';
import { createRateLimitStore, rateLimitJsonHandler } from './rateLimitStore.js';

function passwordChangeAttemptsPerWindow(): number {
  if (process.env.NODE_ENV === 'test') return 10_000;
  if (process.env.NODE_ENV === 'development') return 500;
  return 10;
}

/**
 * Instancia única compartida por PATCH /auth/me/password y el alias
 * PATCH /producers/me/password, para que no se dupliquen los cupos.
 * Clave: `req.user.sub` (usuario autenticado), no IP.
 *
 * Usa el store Redis compartido (distribuido entre instancias de Cloud Run) y no
 * expone encabezados `RateLimit-*`, en línea con el resto de los limiters.
 */
export const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: passwordChangeAttemptsPerWindow(),
  standardHeaders: false,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { keyGeneratorIpFallback: false },
  store: createRateLimitStore('rl:pwdchange:'),
  keyGenerator: (req: Request) => {
    const sub = req.user?.sub;
    if (typeof sub === 'string' && sub.length > 0) {
      return sub;
    }
    return 'unauthenticated';
  },
  handler: rateLimitJsonHandler('Demasiados intentos. Intenta de nuevo en 15 minutos.'),
});
