import type { Request } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { createRateLimitStore, rateLimitJsonHandler } from './rateLimitStore.js';

const RETRY_MESSAGE = 'Demasiados intentos. Intenta de nuevo en 15 minutos.';
const WINDOW_MS = 15 * 60 * 1000;

function loginIpMax(): number {
  if (process.env.NODE_ENV === 'test') return 10_000;
  if (process.env.NODE_ENV === 'development') return 500;
  return 10;
}

function loginAccountMax(): number {
  if (process.env.NODE_ENV === 'test') return 10_000;
  if (process.env.NODE_ENV === 'development') return 500;
  return 5;
}

/** Clave de la cuenta normalizada (trim + minúsculas) para unificar variantes triviales. */
function normalizedUsuario(req: Request): string {
  const body = req.body as { usuario?: unknown } | undefined;
  return typeof body?.usuario === 'string' ? body.usuario.trim().toLowerCase() : '';
}

/**
 * B1 — Límite por IP del login. Usa el store Redis compartido (rate limiting
 * distribuido entre instancias de Cloud Run; antes era `MemoryStore` local, por
 * lo que el límite se multiplicaba por instancia). Degrada fail-open si Redis cae.
 * No expone encabezados `RateLimit-*` (ver `rateLimitJsonHandler`).
 */
export const loginIpLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: loginIpMax,
  standardHeaders: false,
  legacyHeaders: false,
  store: createRateLimitStore('rl:login:ip:'),
  handler: rateLimitJsonHandler(RETRY_MESSAGE),
});

/**
 * B2 — Límite por **cuenta + origen** del login. Frena la fuerza bruta dirigida a
 * una cuenta (incluida la distribuida que supera el límite por IP global) contando
 * los intentos fallidos por `usuario`.
 *
 * La clave incluye la IP a propósito: así un atacante **no** puede dejar fuera a un
 * usuario legítimo agotando el cupo de su cuenta (el bloqueo queda acotado al origen
 * del atacante, no a la cuenta de forma global) — evitando el DoS de bloqueo que la
 * consigna prohíbe. `skipSuccessfulRequests` hace que un login correcto no consuma
 * cupo. Es temporal (ventana), nunca un bloqueo permanente. Distribuido vía Redis.
 */
export const loginAccountLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: loginAccountMax,
  standardHeaders: false,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  store: createRateLimitStore('rl:login:acct:'),
  keyGenerator: (req: Request) => `${ipKeyGenerator(req.ip ?? '')}|${normalizedUsuario(req)}`,
  handler: rateLimitJsonHandler(RETRY_MESSAGE),
});
