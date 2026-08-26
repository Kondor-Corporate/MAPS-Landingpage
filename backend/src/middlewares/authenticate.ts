import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { loadEnv } from '../config/env.js';
import type { JWTPayload } from '../types/jwt.js';
import { AppError } from '../lib/errors.js';
import { prisma } from '../lib/prisma.js';

/**
 * Verifica el JWT y el estado actual del usuario.
 *
 * La consulta evita que un access token ya emitido mantenga acceso después de
 * desactivar la cuenta o cambiar su rol.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
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

  let payload: JWTPayload;
  try {
    const env = loadEnv();
    payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
  } catch {
    next(new AppError(401, 'Token inválido o expirado'));
    return;
  }

  try {
    if (
      !payload.sub ||
      payload.role === undefined ||
      payload.ver === undefined ||
      payload.ver === null ||
      typeof payload.ver !== 'number' ||
      !Number.isInteger(payload.ver)
    ) {
      next(new AppError(401, 'Token inválido'));
      return;
    }
    const userId = Number(payload.sub);
    if (!Number.isInteger(userId) || userId <= 0) {
      next(new AppError(401, 'Token inválido'));
      return;
    }

    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { activo: true, rol: true, tokenVersion: true },
    });
    if (!user?.activo) {
      next(new AppError(401, 'Sesión inválida o cuenta desactivada'));
      return;
    }
    if (user.rol !== payload.role) {
      next(new AppError(401, 'La sesión debe renovarse'));
      return;
    }
    if (user.tokenVersion !== payload.ver) {
      next(new AppError(401, 'La sesión fue revocada'));
      return;
    }

    req.user = { ...payload, role: user.rol };
    next();
  } catch (error) {
    next(error);
  }
};
