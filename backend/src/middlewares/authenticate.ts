import type { RequestHandler } from 'express';

/** Verifica JWT y asigna req.user (implementar en siguiente iteración). */
export const authenticate: RequestHandler = (_req, _res, next) => {
  next();
};
