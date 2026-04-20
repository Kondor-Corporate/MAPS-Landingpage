import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

/** Valida body/query/params con Zod (implementar merge de schemas según necesidad). */
export function validate(_schema: ZodTypeAny): RequestHandler {
  return (_req, _res, next) => {
    next();
  };
}
