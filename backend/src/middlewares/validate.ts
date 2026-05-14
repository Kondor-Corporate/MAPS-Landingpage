import type { RequestHandler } from 'express';
import type { ZodError, ZodTypeAny } from 'zod';

export type ValidateSchemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

function sendValidationError(res: Parameters<RequestHandler>[1], err: ZodError): void {
  res.status(422).json({
    data: null,
    message: 'Datos de entrada inválidos',
    error: err.flatten(),
  });
}

function assignParams(req: Parameters<RequestHandler>[0], data: Record<string, unknown>): void {
  for (const key of Object.keys(data)) {
    const v = data[key];
    req.params[key] = v === undefined || v === null ? '' : String(v);
  }
}

/**
 * Valida `params`, `query` y/o `body` con Zod. Orden: params → query → body.
 * Asigna los valores parseados (p. ej. trim/coerce) de vuelta al request.
 */
export function validate(schemas: ValidateSchemas): RequestHandler {
  return (req, res, next) => {
    if (schemas.params) {
      const parsed = schemas.params.safeParse(req.params);
      if (!parsed.success) {
        sendValidationError(res, parsed.error);
        return;
      }
      assignParams(req, parsed.data as Record<string, unknown>);
    }

    if (schemas.query) {
      const parsed = schemas.query.safeParse(req.query);
      if (!parsed.success) {
        sendValidationError(res, parsed.error);
        return;
      }
      Object.assign(req.query as Record<string, unknown>, parsed.data as object);
    }

    if (schemas.body) {
      const parsed = schemas.body.safeParse(req.body);
      if (!parsed.success) {
        sendValidationError(res, parsed.error);
        return;
      }
      req.body = parsed.data;
    }

    next();
  };
}
