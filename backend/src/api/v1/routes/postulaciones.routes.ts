import { Router } from 'express';
import { Rol } from '@prisma/client';
import { postulacionesController } from '../../../controllers/postulaciones.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';
import { postulacionLimiter } from '../../../middlewares/postulacionLimiter.js';
import { validate } from '../../../middlewares/validate.js';
import { createPostulacionSchema } from '../../../validations/postulacion.schema.js';

export const postulacionesRouter = Router();

const adminOnly = [authenticate, authorize(Rol.ADMIN, Rol.SUPERADMIN)] as const;

// Alta pública de postulaciones (rate-limited + validada).
postulacionesRouter.post(
  '/',
  postulacionLimiter,
  validate({ body: createPostulacionSchema }),
  postulacionesController.create,
);

// Consulta administrativa (lectura restringida).
postulacionesRouter.get('/', ...adminOnly, postulacionesController.list);
