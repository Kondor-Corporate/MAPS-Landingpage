import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors.js';
import { libraryService } from '../services/library.service.js';
import { bibliotecaCreateSchema, ramoCreateSchema, recursoCreateSchema } from '../validations/library.schema.js';

export const libraryController: Record<string, RequestHandler> = {
  // ============ BIBLIOTECAS ============

  async createBiblioteca(req, res, next) {
    try {
      if (!req.user) {
        next(new AppError(401, 'No autenticado'));
        return;
      }

      const parsed = bibliotecaCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await libraryService.createBiblioteca(parsed.data);

      res.status(201).json({
        data: resultado,
        message: 'Biblioteca creada exitosamente',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async getBibliotecas(req, res, next) {
    try {
      const bibliotecas = await libraryService.getBibliotecas();

      res.json({
        data: bibliotecas,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async getBibliotecaById(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        next(new AppError(400, 'ID inválido'));
        return;
      }

      const biblioteca = await libraryService.getBibliotecaById(id);
      if (!biblioteca) {
        next(new AppError(404, 'Biblioteca no encontrada'));
        return;
      }

      res.json({
        data: biblioteca,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateBiblioteca(req, res, next) {
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

      const parsed = bibliotecaCreateSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await libraryService.updateBiblioteca(id, parsed.data);

      res.json({
        data: resultado,
        message: 'Biblioteca actualizada',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteBiblioteca(req, res, next) {
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

      await libraryService.deleteBiblioteca(id);

      res.json({
        data: null,
        message: 'Biblioteca eliminada',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  // ============ RAMOS ============

  async createRamo(req, res, next) {
    try {
      if (!req.user) {
        next(new AppError(401, 'No autenticado'));
        return;
      }

      const parsed = ramoCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await libraryService.createRamo(parsed.data);

      res.status(201).json({
        data: resultado,
        message: 'Ramo creado exitosamente',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async getRamoById(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        next(new AppError(400, 'ID inválido'));
        return;
      }

      const ramo = await libraryService.getRamoById(id);
      if (!ramo) {
        next(new AppError(404, 'Ramo no encontrado'));
        return;
      }

      res.json({
        data: ramo,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateRamo(req, res, next) {
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

      const parsed = ramoCreateSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await libraryService.updateRamo(id, parsed.data);

      res.json({
        data: resultado,
        message: 'Ramo actualizado',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteRamo(req, res, next) {
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

      await libraryService.deleteRamo(id);

      res.json({
        data: null,
        message: 'Ramo eliminado',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  // ============ RECURSOS ============

  async createRecurso(req, res, next) {
    try {
      if (!req.user) {
        next(new AppError(401, 'No autenticado'));
        return;
      }

      const parsed = recursoCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await libraryService.createRecurso(parsed.data, req.user.sub);

      res.status(201).json({
        data: resultado,
        message: 'Recurso creado exitosamente',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async getRecursoById(req, res, next) {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        next(new AppError(400, 'ID inválido'));
        return;
      }

      const recurso = await libraryService.getRecursoById(id);
      if (!recurso) {
        next(new AppError(404, 'Recurso no encontrado'));
        return;
      }

      res.json({
        data: recurso,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async updateRecurso(req, res, next) {
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

      const parsed = recursoCreateSchema.partial().safeParse({ ramoId: null, ...req.body });
      if (!parsed.success) {
        res.status(400).json({
          data: null,
          message: 'Validación fallida',
          error: parsed.error.flatten(),
        });
        return;
      }

      const resultado = await libraryService.updateRecurso(id, { url: req.body.url });

      res.json({
        data: resultado,
        message: 'Recurso actualizado',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  async deleteRecurso(req, res, next) {
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

      await libraryService.deleteRecurso(id);

      res.json({
        data: null,
        message: 'Recurso eliminado',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },
};
