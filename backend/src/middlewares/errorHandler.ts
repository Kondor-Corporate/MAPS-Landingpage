import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';
import {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
} from 'jsonwebtoken';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

function getHttpStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const o = err as Record<string, unknown>;
  if (typeof o.status === 'number') return o.status;
  if (typeof o.statusCode === 'number') return o.statusCode;
  return undefined;
}

function getErrorType(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('type' in err)) return undefined;
  const t = (err as { type: unknown }).type;
  return typeof t === 'string' ? t : undefined;
}

function isPayloadTooLarge(err: unknown): boolean {
  return getErrorType(err) === 'entity.too.large';
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      data: null,
      message: err.message,
      error: null,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      data: null,
      message: 'Datos de entrada inválidos',
      error: err.flatten(),
    });
    return;
  }

  if (err instanceof JsonWebTokenError || err instanceof TokenExpiredError || err instanceof NotBeforeError) {
    res.status(401).json({
      data: null,
      message: 'Token inválido o expirado',
      error: null,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        data: null,
        message: 'El recurso ya existe o hay conflicto de unicidad',
        error: isProduction() ? null : { code: err.code, meta: err.meta },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        data: null,
        message: 'Recurso no encontrado',
        error: isProduction() ? null : { code: err.code, meta: err.meta },
      });
      return;
    }
    console.error(err);
    res.status(500).json({
      data: null,
      message: 'Error de base de datos',
      error: isProduction() ? null : { code: err.code, meta: err.meta },
    });
    return;
  }

  if (isPayloadTooLarge(err) || getHttpStatus(err) === 413) {
    res.status(413).json({
      data: null,
      message: 'Cuerpo de la petición demasiado grande',
      error: null,
    });
    return;
  }

  if (getErrorType(err) === 'entity.parse.failed') {
    res.status(400).json({
      data: null,
      message: 'JSON inválido',
      error: null,
    });
    return;
  }

  if (err instanceof SyntaxError) {
    const status = getHttpStatus(err);
    if (status === 400 || /json/i.test(err.message)) {
      res.status(400).json({
        data: null,
        message: 'JSON inválido',
        error: null,
      });
      return;
    }
  }

  console.error(err);
  res.status(500).json({
    data: null,
    message: 'Internal Server Error',
    error: isProduction() ? null : String(err),
  });
};
