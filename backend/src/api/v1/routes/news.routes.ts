/**
 * Rutas HTTP del módulo Noticias (`/api/v1/news`).
 * Declara lectura pública, intranet y CRUD admin con validación Zod y RBAC.
 * Importante: `/public` e `/intranet` deben registrarse antes de `/:id` para evitar colisiones.
 */
import { Router } from 'express';
import { Rol } from '@prisma/client';
import { newsController } from '../../../controllers/news.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';
import { validate } from '../../../middlewares/validate.js';
import {
  createNewsSchema,
  listNewsAdminQuerySchema,
  listNewsIntranetQuerySchema,
  listNewsPublicQuerySchema,
  newsIdParamSchema,
  newsSlugParamSchema,
  updateNewsSchema,
} from '../../../validations/news.schema.js';

export const newsRouter = Router();

const adminOnly = [authenticate, authorize(Rol.ADMIN, Rol.SUPERADMIN)] as const;
/** Lectura de novedades internas: productores y roles administrativos autenticados. */
const intranetRead = [
  authenticate,
  authorize(Rol.PRODUCTOR, Rol.ADMIN, Rol.SUPERADMIN),
] as const;

newsRouter.get(
  '/public',
  validate({ query: listNewsPublicQuerySchema }),
  newsController.listPublic,
);

newsRouter.get(
  '/public/:slug',
  validate({ params: newsSlugParamSchema }),
  newsController.getPublicBySlug,
);

newsRouter.get(
  '/intranet',
  ...intranetRead,
  validate({ query: listNewsIntranetQuerySchema }),
  newsController.listIntranet,
);

newsRouter.get(
  '/',
  ...adminOnly,
  validate({ query: listNewsAdminQuerySchema }),
  newsController.listAdmin,
);

newsRouter.get(
  '/:id',
  ...adminOnly,
  validate({ params: newsIdParamSchema }),
  newsController.getAdminById,
);

newsRouter.post(
  '/',
  ...adminOnly,
  validate({ body: createNewsSchema }),
  newsController.create,
);

newsRouter.patch(
  '/:id',
  ...adminOnly,
  validate({ params: newsIdParamSchema, body: updateNewsSchema }),
  newsController.update,
);

newsRouter.delete(
  '/:id',
  ...adminOnly,
  validate({ params: newsIdParamSchema }),
  newsController.remove,
);
