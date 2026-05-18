import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { contactService } from '../services/contact.service.js';
import { contactSchema } from '../validations/contact.schema.js';

export const contactController: Record<string, RequestHandler> = {
  /**
   * POST /contact
   * Crea un nuevo mensaje de contacto
   */
  async create(req, res, next) {
    try {
      const parsed = contactSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await contactService.createMessage(parsed.data);

      res.status(201).json({
        data: resultado,
        message: 'Mensaje de contacto guardado exitosamente',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /contact
   * Lista todos los mensajes (solo admin)
   */
  async getAll(req, res, next) {
    try {
      // req.user viene del middleware de autenticación
      if (!req.user) {
        next(new AppError(401, 'No autenticado'));
        return;
      }

      const pagina = Math.max(1, parseInt(String(req.query.pagina)) || 1);
      const limite = Math.min(100, Math.max(1, parseInt(String(req.query.limite)) || 20));
      const skip = (pagina - 1) * limite;

      // Construir filtros opcionales
      const filters: Record<string, any> = {};
      if (req.query.leido === 'true' || req.query.leido === 'false') {
        filters.leido = req.query.leido === 'true';
      }

      const resultado = await contactService.getMessages(skip, limite, filters);

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
   * GET /contact/:id
   * Obtiene un mensaje específico (solo admin)
   */
  async getById(req, res, next) {
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

      const mensaje = await contactService.getMessageById(id);

      if (!mensaje) {
        next(new AppError(404, 'Mensaje no encontrado'));
        return;
      }

      res.json({
        data: mensaje,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /contact/:id/read
   * Marca un mensaje como leído (solo admin)
   */
  async markAsRead(req, res, next) {
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

      const mensaje = await contactService.getMessageById(id);
      if (!mensaje) {
        next(new AppError(404, 'Mensaje no encontrado'));
        return;
      }

      await contactService.markAsRead(id);

      res.json({
        data: null,
        message: 'Marcado como leído',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * PATCH /contact/:id/responded
   * Marca un mensaje como respondido (solo admin)
   */
  async markAsResponded(req, res, next) {
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

      const mensaje = await contactService.getMessageById(id);
      if (!mensaje) {
        next(new AppError(404, 'Mensaje no encontrado'));
        return;
      }

      await contactService.markAsResponded(id);

      res.json({
        data: null,
        message: 'Marcado como respondido',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /contact/:id
   * Elimina un mensaje (solo admin)
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

      const mensaje = await contactService.getMessageById(id);
      if (!mensaje) {
        next(new AppError(404, 'Mensaje no encontrado'));
        return;
      }

      await contactService.deleteMessage(id);

      res.json({
        data: null,
        message: 'Mensaje eliminado',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },
};
