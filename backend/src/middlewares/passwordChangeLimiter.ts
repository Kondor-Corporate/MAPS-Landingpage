import type { Request } from 'express';
import rateLimit from 'express-rate-limit';

function passwordChangeAttemptsPerWindow(): number {
  if (process.env.NODE_ENV === 'test') return 10_000;
  if (process.env.NODE_ENV === 'development') return 500;
  return 10;
}

/**
 * Instancia única compartida por PATCH /auth/me/password y el alias
 * PATCH /producers/me/password, para que no se dupliquen los cupos.
 * Clave: `req.user.sub` (usuario autenticado), no IP.
 */
export const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: passwordChangeAttemptsPerWindow(),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request) => {
    const sub = req.user?.sub;
    if (typeof sub === 'string' && sub.length > 0) {
      return sub;
    }
    return 'unauthenticated';
  },
  message: {
    data: null,
    message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
    error: null,
  },
});
