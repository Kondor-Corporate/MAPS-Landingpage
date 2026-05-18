import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { producersService } from '../services/producers.service.js';
import { producerCreateSchema, producerUpdateSchema, redSocialSchema } from '../validations/producer.schema.js';

export const producersController: Record<string, RequestHandler> = {
  /**
   * POST /producers
   * Crea un nuevo productor (solo admin)
   */
  async create(req, res, next) {
    try {
      if (!req.user) {
        next(new AppError(401, 'No autenticado'));
        return;
      }

      const parsed = producerCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await producersService.createProducer(parsed.data, req.user.sub);

      res.status(201).json({
        data: resultado,
        message: 'Productor creado exitosamente',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /producers
   * Lista todos los productores
   */
  async getAll(req, res, next) {
    try {
      const pagina = Math.max(1, parseInt(String(req.query.pagina)) || 1);
      const limite = Math.min(100, Math.max(1, parseInt(String(req.query.limite)) || 20));
      const skip = (pagina - 1) * limite;

      const resultado = await producersService.getProducers(skip, limite);

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
   * GET /producers/directory
   * Lista productores activos (para directorio público)
   */
  async getDirectory(req, res, next) {
    try {
      const pagina = Math.max(1, parseInt(String(req.query.pagina)) || 1);
      const limite = Math.min(100, Math.max(1, parseInt(String(req.query.limite)) || 20));
      const skip = (pagina - 1) * limite;

      const resultado = await producersService.getActiveProducers(skip, limite);

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
   * GET /producers/:id
   * Obtiene un productor por ID
   */
  async getById(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        next(new AppError(400, 'ID inválido'));
        return;
      }

      const productor = await producersService.getProducerById(id);
      if (!productor) {
        next(new AppError(404, 'Productor no encontrado'));
        return;
      }

      res.json({
        data: productor,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /producers/slug/:slug
   * Obtiene un productor por slug
   */
  async getBySlug(req, res, next) {
    try {
      const { slug } = req.params;

      const productor = await producersService.getProducerBySlug(slug);
      if (!productor) {
        next(new AppError(404, 'Productor no encontrado'));
        return;
      }

      res.json({
        data: productor,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /producers/:id
   * Actualiza un productor (solo admin)
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

      const parsed = producerUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await producersService.updateProducer(id, parsed.data);

      res.json({
        data: resultado,
        message: 'Productor actualizado',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /producers/:id
   * Elimina un productor (solo admin)
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

      await producersService.deleteProducer(id);

      res.json({
        data: null,
        message: 'Productor eliminado',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /producers/:id/redes-sociales
   * Agrega una red social a un productor (solo admin)
   */
  async addRedSocial(req, res, next) {
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

      const parsed = redSocialSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await producersService.addRedSocial(id, parsed.data);

      res.status(201).json({
        data: resultado,
        message: 'Red social agregada',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /producers/redes-sociales/:redId
   * Actualiza una red social (solo admin)
   */
  async updateRedSocial(req, res, next) {
    try {
      if (!req.user) {
        next(new AppError(401, 'No autenticado'));
        return;
      }

      const redId = parseInt(req.params.redId);
      if (isNaN(redId)) {
        next(new AppError(400, 'ID inválido'));
        return;
      }

      const parsed = redSocialSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await producersService.updateRedSocial(redId, parsed.data);

      res.json({
        data: resultado,
        message: 'Red social actualizada',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /producers/redes-sociales/:redId
   * Elimina una red social (solo admin)
   */
  async deleteRedSocial(req, res, next) {
    try {
      if (!req.user) {
        next(new AppError(401, 'No autenticado'));
        return;
      }

      const redId = parseInt(req.params.redId);
      if (isNaN(redId)) {
        next(new AppError(400, 'ID inválido'));
        return;
      }

      await producersService.deleteRedSocial(redId);

      res.json({
        data: null,
        message: 'Red social eliminada',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },
};
