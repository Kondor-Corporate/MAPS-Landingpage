import { Router } from 'express';
import { newsController } from '../../../controllers/news.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';

export const newsRouter = Router();

/**
 * POST /news
 * Crear nueva noticia (solo admin)
 */
newsRouter.post('/', authenticate, authorize('ADMIN', 'SUPERADMIN'), newsController.create);

/**
 * GET /news
 * Listar noticias (públicas sin auth, todas si admin)
 */
newsRouter.get('/', newsController.getAll);

/**
 * GET /news/:id
 * Obtener noticia por ID
 */
newsRouter.get('/:id', newsController.getById);

/**
 * GET /news/slug/:slug
 * Obtener noticia por slug
 */
newsRouter.get('/slug/:slug', newsController.getBySlug);

/**
 * PATCH /news/:id
 * Actualizar noticia (solo admin)
 */
newsRouter.patch('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), newsController.update);

/**
 * DELETE /news/:id
 * Eliminar noticia (solo admin)
 */
newsRouter.delete('/:id', authenticate, authorize('ADMIN', 'SUPERADMIN'), newsController.delete);

/**
 * PATCH /news/:id/publish
 * Publicar noticia (solo admin)
 */
newsRouter.patch('/:id/publish', authenticate, authorize('ADMIN', 'SUPERADMIN'), newsController.publish);

/**
 * PATCH /news/:id/unpublish
 * Despublicar noticia (solo admin)
 */
newsRouter.patch(
  '/:id/unpublish',
  authenticate,
  authorize('ADMIN', 'SUPERADMIN'),
  newsController.unpublish,
);
