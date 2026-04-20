import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { loadEnv } from '../config/env.js';
import type { JWTPayload } from '../types/jwt.js';
import { AppError } from '../lib/errors.js';

/** Verifica JWT de acceso y asigna `req.user`. Espera `Authorization: Bearer <token>`. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new AppError(401, 'Token de acceso requerido'));
    return;
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    next(new AppError(401, 'Token de acceso requerido'));
    return;
  }

  try {
    const env = loadEnv();
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    if (!payload.sub || payload.role === undefined) {
      next(new AppError(401, 'Token inválido'));
      return;
    }
    req.user = payload;
    next();
  } catch {
    next(new AppError(401, 'Token inválido o expirado'));
  }
};
