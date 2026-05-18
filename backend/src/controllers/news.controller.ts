import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { newsService } from '../services/news.service.js';
import { newsCreateSchema, newsUpdateSchema } from '../validations/news.schema.js';

export const newsController: Record<string, RequestHandler> = {
  /**
   * POST /news
   * Crea una nueva noticia (solo admin)
   */
  async create(req, res, next) {
    try {
      if (!req.user) {
        next(new AppError(401, 'No autenticado'));
        return;
      }

      const parsed = newsCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await newsService.createNews(parsed.data, req.user.sub);

      res.status(201).json({
        data: resultado,
        message: 'Noticia creada exitosamente',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /news
   * Lista todas las noticias (públicas por defecto, todas si es admin)
   */
  async getAll(req, res, next) {
    try {
      const pagina = Math.max(1, parseInt(String(req.query.pagina)) || 1);
      const limite = Math.min(100, Math.max(1, parseInt(String(req.query.limite)) || 20));
      const skip = (pagina - 1) * limite;

      const filters: Record<string, any> = {};

      // Si no es admin, solo mostrar publicadas y públicas
      if (!req.user) {
        filters.publicada = true;
        filters.visibilidad = 'PUBLICA';
      }

      const resultado = await newsService.getNews(skip, limite, filters);

      res.json({
        data: resultado,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /news/:id
   * Obtiene una noticia por ID
   */
  async getById(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        next(new AppError(400, 'ID inválido'));
        return;
      }

      const noticia = await newsService.getNewsById(id);
      if (!noticia) {
        next(new AppError(404, 'Noticia no encontrada'));
        return;
      }

      // Si no es admin y no está publicada/visible, rechazar
      if (!req.user && (!noticia.publicada || noticia.visibilidad !== 'PUBLICA')) {
        next(new AppError(403, 'Noticia no disponible'));
        return;
      }

      res.json({
        data: noticia,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /news/slug/:slug
   * Obtiene una noticia por slug
   */
  async getBySlug(req, res, next) {
    try {
      const { slug } = req.params;

      const noticia = await newsService.getNewsBySlug(slug);
      if (!noticia) {
        next(new AppError(404, 'Noticia no encontrada'));
        return;
      }

      // Si no es admin y no está publicada/visible, rechazar
      if (!req.user && (!noticia.publicada || noticia.visibilidad !== 'PUBLICA')) {
        next(new AppError(403, 'Noticia no disponible'));
        return;
      }

      res.json({
        data: noticia,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /news/:id
   * Actualiza una noticia (solo admin)
   */
  async update(req, res, next) {
    try {
      if (!req.user) {
        next(new AppError(401, 'No autenticado'));
        return;
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        next(new AppError(400, 'ID inválido'));
        return;
      }

      const parsed = newsUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await newsService.updateNews(id, parsed.data);

      res.json({
        data: resultado,
        message: 'Noticia actualizada',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /news/:id
   * Elimina una noticia (solo admin)
   */
  async delete(req, res, next) {
    try {
      if (!req.user) {
        next(new AppError(401, 'No autenticado'));
        return;
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        next(new AppError(400, 'ID inválido'));
        return;
      }

      await newsService.deleteNews(id);

      res.json({
        data: null,
        message: 'Noticia eliminada',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /news/:id/publish
   * Publica una noticia (solo admin)
   */
  async publish(req, res, next) {
    try {
      if (!req.user) {
        next(new AppError(401, 'No autenticado'));
        return;
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        next(new AppError(400, 'ID inválido'));
        return;
      }

      const resultado = await newsService.publishNews(id);

      res.json({
        data: resultado,
        message: 'Noticia publicada',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /news/:id/unpublish
   * Despublica una noticia (solo admin)
   */
  async unpublish(req, res, next) {
    try {
      if (!req.user) {
        next(new AppError(401, 'No autenticado'));
        return;
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        next(new AppError(400, 'ID inválido'));
        return;
      }

      const resultado = await newsService.unpublishNews(id);

      res.json({
        data: resultado,
        message: 'Noticia despublicada',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },
};
