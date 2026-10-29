import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import {
  libraryService,
  type CreateRamoInput,
  type ListLibraryRamosOptions,
  type UpdateRamoInput,
} from '../services/library.service.js';

export const libraryController = {
  list: (async (req, res, next) => {
    try {
      const role = req.user?.role;
      if (!role) {
        throw new AppError(401, 'No autenticado');
      }
      const query = req.query as unknown as Pick<ListLibraryRamosOptions, 'activo'>;
      const rows = await libraryService.list({ role, activo: query.activo });
      res.json({
        data: rows,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  getById: (async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const row = await libraryService.getById(id);
      if (!row) {
        throw new AppError(404, 'Ramo no encontrado');
      }
      res.json({
        data: row,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  create: (async (req, res, next) => {
    try {
      const body = req.body as CreateRamoInput;
      const created = await libraryService.create(body);
      res.status(201).json({
        data: created,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  update: (async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const body = req.body as UpdateRamoInput;
      const updated = await libraryService.update(id, body);
      res.json({
        data: updated,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  updateActivo: (async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const { activo } = req.body as { activo: boolean };
      const row = await libraryService.setActivo(id, activo);
      res.json({
        data: row,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  remove: (async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      await libraryService.remove(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,
};
