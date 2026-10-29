import type { Request, RequestHandler } from 'express';
import type { ZodError, ZodTypeAny } from 'zod';

export type ValidateSchemas = {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
};

/**
 * Tope defensivo previo a Zod. No es un límite de negocio:
 * evita que una colección absurda llegue a `safeParse`.
 */
const MAX_UNTRUSTED_ARRAY_LENGTH = 1000;

function sendInvalidInput(res: Parameters<RequestHandler>[1], error: unknown): void {
  res.status(422).json({
    data: null,
    message: 'Datos de entrada inválidos',
    error,
  });
}

function sendValidationError(res: Parameters<RequestHandler>[1], err: ZodError): void {
  sendInvalidInput(res, err.flatten());
}

/**
 * Recorre arrays, primitivos y las propiedades enumerables de cualquier objeto.
 * El stack es explícito para que un anidamiento profundo no termine en 500.
 */
function hasOversizedArray(value: unknown): boolean {
  const seen = new WeakSet<object>();
  const pending: unknown[] = [value];

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === null || typeof current !== 'object') continue;
    if (seen.has(current)) continue;
    seen.add(current);

    if (Array.isArray(current) && current.length > MAX_UNTRUSTED_ARRAY_LENGTH) {
      return true;
    }

    for (const item of Object.values(current)) {
      pending.push(item);
    }
  }

  return false;
}

function rejectIfOversized(value: unknown, res: Parameters<RequestHandler>[1]): boolean {
  if (!hasOversizedArray(value)) return false;
  sendInvalidInput(res, { formErrors: [], fieldErrors: {} });
  return true;
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
 * Antes de cada `safeParse`, rechaza arrays de más de 1000 elementos.
 */
export function validate(schemas: ValidateSchemas): RequestHandler {
  return (req, res, next) => {
    if (schemas.params) {
      if (rejectIfOversized(req.params, res)) return;
      const parsed = schemas.params.safeParse(req.params);
      if (!parsed.success) {
        sendValidationError(res, parsed.error);
        return;
      }
      assignParams(req, parsed.data as Record<string, unknown>);
    }

    if (schemas.query) {
      if (rejectIfOversized(req.query, res)) return;
      const parsed = schemas.query.safeParse(req.query);
      if (!parsed.success) {
        sendValidationError(res, parsed.error);
        return;
      }
      req.query = parsed.data as Request['query'];
    }

    if (schemas.body) {
      if (rejectIfOversized(req.body, res)) return;
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
