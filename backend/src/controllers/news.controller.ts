/**
 * Controladores HTTP de Noticias.
 * Adapta request/response Express al servicio de dominio y normaliza el envelope `{ data, message, error }`.
 */
import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import {
  newsService,
  type CreateNewsInput,
  type ListNewsAdminQuery,
  type ListNewsPagedQuery,
  type UpdateNewsInput,
} from '../services/news.service.js';

export const newsController = {
  listPublic: (async (req, res, next) => {
    try {
      const query = req.query as unknown as ListNewsPagedQuery;
      const rows = await newsService.listPublicNews(query);
      res.json({
        data: rows,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  getPublicBySlug: (async (req, res, next) => {
    try {
      const { slug } = req.params as { slug: string };
      const row = await newsService.getPublicNewsBySlug(slug);
      if (!row) {
        throw new AppError(404, 'Noticia no encontrada');
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

  listIntranet: (async (req, res, next) => {
    try {
      const query = req.query as unknown as ListNewsPagedQuery;
      const rows = await newsService.listIntranetNews(query);
      res.json({
        data: rows,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  listAdmin: (async (req, res, next) => {
    try {
      const query = req.query as unknown as ListNewsAdminQuery;
      const rows = await newsService.listAdminNews(query);
      res.json({
        data: rows,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,

  getAdminById: (async (req, res, next) => {
    try {
      const id = Number.parseInt(req.params.id, 10);
      const row = await newsService.getAdminNewsById(id);
      if (!row) {
        throw new AppError(404, 'Noticia no encontrada');
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
      const sub = req.user?.sub;
      if (sub === undefined || sub === '') {
        throw new AppError(401, 'No autenticado');
      }
      const actorUserId = Number.parseInt(sub, 10);
      if (!Number.isFinite(actorUserId)) {
        throw new AppError(401, 'Token inválido');
      }
      const body = req.body as CreateNewsInput;
      const created = await newsService.createNews(body, actorUserId);
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
      const body = req.body as UpdateNewsInput;
      const updated = await newsService.updateNews(id, body);
      res.json({
        data: updated,
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
      await newsService.deleteNews(id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }) satisfies RequestHandler,
};
