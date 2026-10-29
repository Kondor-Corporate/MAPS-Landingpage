import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { adminsService, type ListAdminsQuery } from '../services/admins.service.js';

function getCallerId(req: Parameters<RequestHandler>[0]): number {
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

export const adminsController = {
  list: (async (req, res, next) => {
    try {
      const query = req.query as unknown as ListAdminsQuery;
      const rows = await adminsService.list(query);
      res.json({
        data: rows,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  create: (async (req, res, next) => {
    try {
      const body = req.body as { usuario: string; password: string };
      const creadoPorId = getCallerId(req);
      const created = await adminsService.create(body, { creadoPorId });
      res.status(201).json({
        data: created,
        message: 'Administrador creado',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  update: (async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const { usuario } = req.body as { usuario: string };
      const updated = await adminsService.updateUsuario(id, usuario);
      res.json({
        data: updated,
        message: 'Administrador actualizado',
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
      const row = await adminsService.setActivo(id, activo);
      res.json({
        data: row,
        message: activo ? 'Administrador reactivado' : 'Administrador desactivado',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  resetPassword: (async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const body = req.body as { newPassword: string };
      await adminsService.resetPassword(id, body);
      res.json({
        data: null,
        message: 'Contraseña restablecida',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,
};
