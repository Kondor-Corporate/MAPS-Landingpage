import type { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import { logGeocodeEvent } from '../lib/geocodeMetrics.js';
import { createRateLimitStore } from './rateLimitStore.js';

const RATE_LIMIT_MESSAGE = {
  data: null,
  message: 'Demasiadas solicitudes. Intentá nuevamente en unos minutos.',
  error: null,
};

function rateLimitedHandler(req: Request, res: Response, _next: NextFunction, options: Options): void {
  logGeocodeEvent('geocode.rate_limited', { authenticated: Boolean(req.user) });
  res.status(options.statusCode).json(options.message);
}

/** Clave: `user:<sub>` si está autenticado (vía `optionalAuth`), IP si no. */
function keyGenerator(req: Request): string {
  const sub = req.user?.sub;
  if (typeof sub === 'string' && sub.length > 0) {
    return `user:${sub}`;
  }
  return ipKeyGenerator(req.ip ?? '');
}

function geocodeBurstMax(req: Request): number {
  if (process.env.NODE_ENV === 'test') return 10_000;
  if (process.env.NODE_ENV === 'development') return 500;
  return req.user ? 10 : 5;
}

function geocodeSustainedMax(req: Request): number {
  if (process.env.NODE_ENV === 'test') return 10_000;
  if (process.env.NODE_ENV === 'development') return 500;
  return req.user ? 120 : 30;
}

/**
 * Ventana corta (burst) para /geocode y /geocode/reverse.
 * Anónimo: 5 req / 10s por IP. Autenticado: 10 req / 10s por usuario.
 */
export const geocodeBurstLimiter = rateLimit({
  windowMs: 10 * 1000,
  max: geocodeBurstMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  store: createRateLimitStore('rl:geocode:burst:'),
  message: RATE_LIMIT_MESSAGE,
  handler: rateLimitedHandler,
});

/**
 * Ventana sostenida para /geocode y /geocode/reverse.
 * Anónimo: 30 req / 15min por IP. Autenticado: 120 req / 15min por usuario.
 */
export const geocodeSustainedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: geocodeSustainedMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  store: createRateLimitStore('rl:geocode:sustained:'),
  message: RATE_LIMIT_MESSAGE,
  handler: rateLimitedHandler,
});
