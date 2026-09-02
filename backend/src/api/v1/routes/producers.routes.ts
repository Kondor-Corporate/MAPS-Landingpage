import { Router } from 'express';

import { Rol } from '@prisma/client';

import { authController } from '../../../controllers/auth.controller.js';

import { producersController } from '../../../controllers/producers.controller.js';

import { authenticate } from '../../../middlewares/authenticate.js';

import { authorize } from '../../../middlewares/authorize.js';

import { uploadCertificacionMiddleware } from '../../../middlewares/uploadCertificacion.js';

import { uploadFotoMiddleware } from '../../../middlewares/uploadFoto.js';

import { passwordChangeLimiter } from '../../../middlewares/passwordChangeLimiter.js';

import { validate } from '../../../middlewares/validate.js';

import { changeMyPasswordSchema } from '../../../validations/auth.schema.js';

import {

  bySlugParamSchema,

  certIdParamSchema,

  updateMyProfileSchema,

} from '../../../validations/producerProfile.schema.js';

import {

  createProducerSchema,

  listProducersQuerySchema,

  producerIdParamSchema,

  resetProducerPasswordSchema,

  updateProducerSchema,

  updateProducerStatusSchema,

} from '../../../validations/producer.schema.js';



export const producersRouter = Router();



const adminOnly = [authenticate, authorize(Rol.ADMIN, Rol.SUPERADMIN)] as const;

const productorOnly = [authenticate, authorize(Rol.PRODUCTOR)] as const;



type MulterMiddleware = (
  req: import('express').Request,
  res: import('express').Response,
  next: (err?: unknown) => void,
) => void;

function fileUploadRoute(middleware: MulterMiddleware, handler: import('express').RequestHandler) {

  return [

    (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {

      middleware(req, res, (err) => {

        if (err) {

          next(err);

          return;

        }

        next();

      });

    },

    handler,

  ] as const;

}

function uploadCertificacionRoute(handler: import('express').RequestHandler) {
  return fileUploadRoute(uploadCertificacionMiddleware, handler);
}

function uploadFotoRoute(handler: import('express').RequestHandler) {
  return fileUploadRoute(uploadFotoMiddleware, handler);
}



producersRouter.get('/me', ...productorOnly, producersController.getMe);



producersRouter.patch(

  '/me',

  ...productorOnly,

  validate({ body: updateMyProfileSchema }),

  producersController.updateMe,

);



producersRouter.patch(

  '/me/password',

  ...productorOnly,

  passwordChangeLimiter,

  validate({ body: changeMyPasswordSchema }),

  authController.changeMyPassword,

);



producersRouter.post(

  '/me/certificaciones',

  ...productorOnly,

  ...uploadCertificacionRoute(producersController.uploadCertificacionMe),

);



producersRouter.post(

  '/me/foto',

  ...productorOnly,

  ...uploadFotoRoute(producersController.uploadFotoMe),

);



producersRouter.delete(

  '/me/certificaciones/:certId',

  ...productorOnly,

  validate({ params: certIdParamSchema }),

  producersController.deleteCertificacionMe,

);



producersRouter.get(

  '/by-slug/:slug',

  validate({ params: bySlugParamSchema }),

  producersController.getBySlug,

);



producersRouter.get('/map', producersController.listForMap);



producersRouter.get(

  '/',

  ...adminOnly,

  validate({ query: listProducersQuerySchema }),

  producersController.list,

);



producersRouter.post(

  '/:id/certificaciones',

  ...adminOnly,

  validate({ params: producerIdParamSchema }),

  ...uploadCertificacionRoute(producersController.uploadCertificacionAdmin),

);



producersRouter.delete(

  '/:id/certificaciones/:certId',

  ...adminOnly,

  validate({ params: producerIdParamSchema.merge(certIdParamSchema) }),

  producersController.deleteCertificacionAdmin,

);



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

  '/:id/password',

  ...adminOnly,

  validate({ params: producerIdParamSchema, body: resetProducerPasswordSchema }),

  producersController.resetPassword,

);



producersRouter.patch(

  '/:id',

  ...adminOnly,

  validate({ params: producerIdParamSchema, body: updateProducerSchema }),

  producersController.update,

);

