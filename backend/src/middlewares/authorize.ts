import type { RequestHandler } from 'express';
import type { Rol } from '@prisma/client';
import { AppError } from '../lib/errors.js';

/**
 * RBAC: exige JWT válido (`authenticate` debe ejecutarse antes) y rol incluido en `allowed`.
 */
export function authorize(...allowed: Rol[]): RequestHandler {
  const allowedSet = new Set<Rol>(allowed);

  return (req, _res, next) => {
    const user = req.user;
    if (!user) {
      next(new AppError(401, 'No autenticado'));
      return;
    }

    if (!allowedSet.has(user.role)) {
      next(new AppError(403, 'Acceso denegado'));
      return;
    }

    next();
  };
}
