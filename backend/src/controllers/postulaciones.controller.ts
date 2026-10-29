import type { RequestHandler } from 'express';
import { postulacionesService } from '../services/postulaciones.service.js';
import type { CreatePostulacionInput } from '../validations/postulacion.schema.js';

export const postulacionesController = {
  /** POST /postulaciones (público): recibe una postulación. No devuelve datos personales. */
  create: (async (req, res, next) => {
    try {
      const body = req.body as CreatePostulacionInput;
      await postulacionesService.create(body);
      res.status(201).json({
        data: null,
        message: 'Postulación recibida',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  /** GET /postulaciones (adminOnly): listado para consulta administrativa. */
  list: (async (_req, res, next) => {
    try {
      const rows = await postulacionesService.list();
      res.json({
        data: rows,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  /** DELETE /postulaciones/:id (solo SUPERADMIN): eliminación física de una fila. */
  remove: (async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await postulacionesService.remove(id);
      res.status(200).json({
        data: null,
        message: 'Postulación eliminada',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,
};
