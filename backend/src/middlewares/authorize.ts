import type { RequestHandler } from 'express';
import type { Role } from '../types/roles.js';

/** RBAC: exige uno de los roles permitidos (implementar en siguiente iteración). */
export function authorize(..._allowed: Role[]): RequestHandler {
  return (_req, _res, next) => {
    next();
  };
}
