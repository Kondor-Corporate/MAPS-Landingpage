import type { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      data: null,
      message: err.message,
      error: null,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    data: null,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'production' ? null : String(err),
  });
};
