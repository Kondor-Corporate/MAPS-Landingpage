import type { RequestHandler } from 'express';

export const adminsController: Record<string, RequestHandler> = {
  placeholder: (_req, res) => {
    res.status(501).json({ data: null, message: 'Not implemented', error: null });
  },
};
