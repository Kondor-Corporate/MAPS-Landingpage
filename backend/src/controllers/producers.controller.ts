import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import {
  producersService,
  toAdminProducerDto,
  type ListProducersQuery,
} from '../services/producers.service.js';

function getUserId(req: Parameters<RequestHandler>[0]): number {
  const sub = req.user?.sub;
  if (sub === undefined || sub === '') {
    throw new AppError(401, 'No autenticado');
  }
  const id = Number.parseInt(sub, 10);
  if (Number.isNaN(id)) {
    throw new AppError(401, 'Token inválido');
  }
  return id;
}

export const producersController = {
  list: (async (req, res, next) => {
    try {
      const query = req.query as unknown as ListProducersQuery;
      const rows = await producersService.list(query);
      res.json({
        data: rows.map(toAdminProducerDto),
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
      const row = await producersService.getById(id);
      if (!row) {
        throw new AppError(404, 'Productor no encontrado');
      }
      res.json({
        data: toAdminProducerDto(row),
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  create: (async (req, res, next) => {
    try {
      const body = req.body as {
        nombre: string;
        apellido: string;
        email: string;
        telefono?: string;
        activo?: boolean;
      };
      const creadoPorId = getUserId(req);
      const created = await producersService.create(
        {
          nombre: body.nombre,
          apellido: body.apellido,
          email: body.email,
          telefono: body.telefono,
          activo: body.activo,
        },
        { creadoPorId },
      );
      res.status(201).json({
        data: toAdminProducerDto(created),
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
      const body = req.body as {
        nombre?: string;
        apellido?: string;
        email?: string;
        telefono?: string;
      };
      const updated = await producersService.update(id, {
        nombre: body.nombre,
        apellido: body.apellido,
        email: body.email,
        telefono: body.telefono,
      });
      res.json({
        data: toAdminProducerDto(updated),
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  updateStatus: (async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const { activo } = req.body as { activo: boolean };
      const row = await producersService.setActivo(id, activo);
      res.json({
        data: toAdminProducerDto(row),
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,
};
