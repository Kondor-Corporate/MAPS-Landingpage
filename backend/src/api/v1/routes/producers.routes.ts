import { Router } from 'express';
import { Rol } from '@prisma/client';
import { producersController } from '../../../controllers/producers.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';
import { validate } from '../../../middlewares/validate.js';
import {
  createProducerSchema,
  producerIdParamSchema,
  updateProducerSchema,
  updateProducerStatusSchema,
} from '../../../validations/producer.schema.js';

export const producersRouter = Router();

const adminOnly = [authenticate, authorize(Rol.ADMIN, Rol.SUPERADMIN)] as const;

producersRouter.get('/', ...adminOnly, producersController.list);

producersRouter.get(
  '/:id',
  ...adminOnly,
  validate({ params: producerIdParamSchema }),
  producersController.getById,
);

producersRouter.post(
  '/',
  ...adminOnly,
  validate({ body: createProducerSchema }),
  producersController.create,
);

producersRouter.patch(
  '/:id/activo',
  ...adminOnly,
  validate({ params: producerIdParamSchema, body: updateProducerStatusSchema }),
  producersController.updateStatus,
);

producersRouter.patch(
  '/:id',
  ...adminOnly,
  validate({ params: producerIdParamSchema, body: updateProducerSchema }),
  producersController.update,
);
