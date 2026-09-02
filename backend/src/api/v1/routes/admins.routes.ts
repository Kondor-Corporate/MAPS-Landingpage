import { Router } from 'express';
import { Rol } from '@prisma/client';
import { adminsController } from '../../../controllers/admins.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';
import { validate } from '../../../middlewares/validate.js';
import {
  adminIdParamSchema,
  createAdminSchema,
  listAdminsQuerySchema,
  resetAdminPasswordSchema,
  updateAdminSchema,
  updateAdminStatusSchema,
} from '../../../validations/admin.schema.js';

export const adminsRouter = Router();

const superadminOnly = [authenticate, authorize(Rol.SUPERADMIN)] as const;

adminsRouter.get(
  '/',
  ...superadminOnly,
  validate({ query: listAdminsQuerySchema }),
  adminsController.list,
);

adminsRouter.post(
  '/',
  ...superadminOnly,
  validate({ body: createAdminSchema }),
  adminsController.create,
);

adminsRouter.patch(
  '/:id/activo',
  ...superadminOnly,
  validate({ params: adminIdParamSchema, body: updateAdminStatusSchema }),
  adminsController.updateStatus,
);

adminsRouter.patch(
  '/:id/password',
  ...superadminOnly,
  validate({ params: adminIdParamSchema, body: resetAdminPasswordSchema }),
  adminsController.resetPassword,
);

adminsRouter.patch(
  '/:id',
  ...superadminOnly,
  validate({ params: adminIdParamSchema, body: updateAdminSchema }),
  adminsController.update,
);
