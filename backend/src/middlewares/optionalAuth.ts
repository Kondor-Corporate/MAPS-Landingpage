import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { loadEnv } from '../config/env.js';
import type { JWTPayload } from '../types/jwt.js';

function isJWTPayload(value: unknown): value is JWTPayload {
  if (typeof value !== 'object' || value === null) return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.sub === 'string' &&
    payload.sub.length > 0 &&
    typeof payload.role === 'string' &&
    typeof payload.ver === 'number' &&
    Number.isInteger(payload.ver)
  );
}

/**
 * Igual que `authenticate`, pero no bloqueante: si hay un `Bearer` con firma
 * válida setea `req.user`, y en cualquier otro caso (sin token, token
 * inválido/expirado) deja pasar la request sin usuario. Pensado para rutas
 * públicas (como `/geocode`) que solo necesitan diferenciar el cupo de rate
 * limiting entre anónimos y autenticados.
 *
 * A diferencia de `authenticate`, no consulta la base de datos: en un
 * endpoint público de alto tráfico no vale la pena pagar esa latencia solo
 * para calcular un límite de requests. Un token revocado/desactivado
 * simplemente cuenta como autenticado hasta que expire, lo cual es aceptable
 * para este propósito (no otorga ningún permiso adicional).
 */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next();
    return;
  }

  try {
    const env = loadEnv();
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (isJWTPayload(payload)) {
      req.user = payload;
    }
  } catch {
    // Token inválido/expirado: se trata como anónimo, sin cortar la request.
  }

  next();
};
