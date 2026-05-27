import { Router } from 'express';
import { Rol } from '@prisma/client';
import { libraryController } from '../../../controllers/library.controller.js';
import { authenticate } from '../../../middlewares/authenticate.js';
import { authorize } from '../../../middlewares/authorize.js';
import { validate } from '../../../middlewares/validate.js';
import {
  createRamoSchema,
  listLibraryRamosQuerySchema,
  ramoIdParamSchema,
  updateRamoActivoSchema,
  updateRamoSchema,
} from '../../../validations/library.schema.js';

export const libraryRouter = Router();

const ramosRouter = Router();

const adminOnly = [authenticate, authorize(Rol.ADMIN, Rol.SUPERADMIN)] as const;
const intranetRead = [
  authenticate,
  authorize(Rol.PRODUCTOR, Rol.ADMIN, Rol.SUPERADMIN),
] as const;

ramosRouter.get(
  '/',
  ...intranetRead,
  validate({ query: listLibraryRamosQuerySchema }),
  libraryController.list,
);

ramosRouter.get(
  '/:id',
  ...adminOnly,
  validate({ params: ramoIdParamSchema }),
  libraryController.getById,
);

ramosRouter.post(
  '/',
  ...adminOnly,
  validate({ body: createRamoSchema }),
  libraryController.create,
);

ramosRouter.patch(
  '/:id/activo',
  ...adminOnly,
  validate({ params: ramoIdParamSchema, body: updateRamoActivoSchema }),
  libraryController.updateActivo,
);

ramosRouter.patch(
  '/:id',
  ...adminOnly,
  validate({ params: ramoIdParamSchema, body: updateRamoSchema }),
  libraryController.update,
);

ramosRouter.delete(
  '/:id',
  ...adminOnly,
  validate({ params: ramoIdParamSchema }),
  libraryController.remove,
);

libraryRouter.use('/ramos', ramosRouter);
