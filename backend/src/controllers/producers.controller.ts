import type { RequestHandler } from 'express';

const notImplemented: RequestHandler = (_req, res) => {
  res.status(501).json({ data: null, message: 'Not implemented', error: null });
};

export const producersController = {
  list: notImplemented,
  getById: notImplemented,
  create: notImplemented,
  update: notImplemented,
  updateStatus: notImplemented,
} as const;
