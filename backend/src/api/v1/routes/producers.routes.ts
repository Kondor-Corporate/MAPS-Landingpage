import { Router } from 'express';
import { producersController } from '../../../controllers/producers.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';

export const producersRouter = Router();

/**
 * POST /producers
 * Crear nuevo productor (solo admin)
 */
producersRouter.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN'), producersController.create);

/**
 * GET /producers
 * Listar todos los productores (solo admin)
 */
producersRouter.get('/', authenticate, authorize('ADMIN', 'SUPERADMIN'), producersController.getAll);

/**
 * GET /producers/directory
 * Directorio público de productores activos
 */
producersRouter.get('/directory', producersController.getDirectory);

/**
 * GET /producers/:id
 * Obtener productor por ID
 */
producersRouter.get('/:id', producersController.getById);

/**
 * GET /producers/slug/:slug
 * Obtener productor por slug
 */
producersRouter.get('/slug/:slug', producersController.getBySlug);

/**
 * PATCH /producers/:id
 * Actualizar productor (solo admin)
 */
producersRouter.patch('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), producersController.update);

/**
 * DELETE /producers/:id
 * Eliminar productor (solo admin)
 */
producersRouter.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), producersController.delete);

/**
 * POST /producers/:id/redes-sociales
 * Agregar red social a productor (solo admin)
 */
producersRouter.post(
  '/:id/redes-sociales',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  producersController.addRedSocial,
);

/**
 * PATCH /producers/redes-sociales/:redId
 * Actualizar red social (solo admin)
 */
producersRouter.patch(
  '/redes-sociales/:redId',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  producersController.updateRedSocial,
);

/**
 * DELETE /producers/redes-sociales/:redId
 * Eliminar red social (solo admin)
 */
producersRouter.delete(
  '/redes-sociales/:redId',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  producersController.deleteRedSocial,
);
