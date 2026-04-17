import type { RequestHandler } from 'express';

export const newsController: Record<string, RequestHandler> = {
  placeholder: (_req, res) => {
    res.status(501).json({ data: null, message: 'Not implemented', error: null });
  },
};
