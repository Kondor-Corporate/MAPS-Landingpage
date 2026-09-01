import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { getStorageAdapter, type StoredFileCategory } from '../lib/storage/index.js';
import { isStoredFilename } from '../lib/storage/types.js';

function parseCategory(value: string): StoredFileCategory | null {
  return value === 'certificaciones' || value === 'fotos' || value === 'noticias'
    ? value
    : null;
}

export const getStoredFile: RequestHandler = async (req, res, next) => {
  const category = parseCategory(req.params.category);
  const filename = req.params.filename;
  if (!category || !filename || !isStoredFilename(category, filename)) {
    next(new AppError(404, 'Archivo no encontrado'));
    return;
  }

  try {
    const storage = getStorageAdapter();
    if (!storage.readPublicFile) {
      next(new AppError(404, 'Archivo no encontrado'));
      return;
    }

    const result = await storage.readPublicFile(category, filename);
    if (!result) {
      next(new AppError(404, 'Archivo no encontrado'));
      return;
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', result.cacheControl);
    if (result.contentLength !== undefined) {
      res.setHeader('Content-Length', String(result.contentLength));
    }

    result.stream.once('error', () => {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      res.removeHeader('Content-Type');
      res.removeHeader('Cache-Control');
      res.removeHeader('Content-Length');
      next(new AppError(503, 'Archivo temporalmente no disponible'));
    });
    result.stream.pipe(res);
  } catch {
    next(new AppError(503, 'Archivo temporalmente no disponible'));
  }
};
