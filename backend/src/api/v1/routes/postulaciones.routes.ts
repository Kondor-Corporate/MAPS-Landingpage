import { Router } from 'express';
import { Rol } from '@prisma/client';
import { postulacionesController } from '../../../controllers/postulaciones.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';
import { postulacionLimiter } from '../../../middlewares/postulacionLimiter.js';
import { validate } from '../../../middlewares/validate.js';
import {
  createPostulacionSchema,
  postulacionIdParamSchema,
} from '../../../validations/postulacion.schema.js';

export const postulacionesRouter = Router();

const adminOnly = [authenticate, authorize(Rol.ADMIN, Rol.SUPERADMIN)] as const;
const superadminOnly = [authenticate, authorize(Rol.SUPERADMIN)] as const;

// Alta pública de postulaciones (rate-limited + validada).
postulacionesRouter.post(
  '/',
  postulacionLimiter,
  validate({ body: createPostulacionSchema }),
  postulacionesController.create,
);

// Consulta administrativa (lectura restringida).
postulacionesRouter.get('/', ...adminOnly, postulacionesController.list);

// Eliminación física. La autorización no depende de que el frontend oculte la acción.
postulacionesRouter.delete(
  '/:id',
  ...superadminOnly,
  validate({ params: postulacionIdParamSchema }),
  postulacionesController.remove,
);
