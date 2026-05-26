import { Router } from 'express';

import { Rol } from '@prisma/client';

import { producersController } from '../../../controllers/producers.controller.js';

import { authenticate } from '../../../middlewares/authenticate.js';

import { authorize } from '../../../middlewares/authorize.js';

import { uploadCertificacionMiddleware } from '../../../middlewares/uploadCertificacion.js';

import { validate } from '../../../middlewares/validate.js';

import {

  bySlugParamSchema,

  certIdParamSchema,

  updateMyProfileSchema,

} from '../../../validations/producerProfile.schema.js';

import {

  createProducerSchema,

  listProducersQuerySchema,

  producerIdParamSchema,

  updateProducerSchema,

  updateProducerStatusSchema,

} from '../../../validations/producer.schema.js';



export const producersRouter = Router();



const adminOnly = [authenticate, authorize(Rol.ADMIN, Rol.SUPERADMIN)] as const;

const productorOnly = [authenticate, authorize(Rol.PRODUCTOR)] as const;



function uploadCertificacionRoute(

  handler: typeof producersController.uploadCertificacionMe,

) {

  return [

    (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {

      uploadCertificacionMiddleware(req, res, (err) => {

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



producersRouter.get('/me', ...productorOnly, producersController.getMe);



producersRouter.patch(

  '/me',

  ...productorOnly,

  validate({ body: updateMyProfileSchema }),

  producersController.updateMe,

);



producersRouter.post(

  '/me/certificaciones',

  ...productorOnly,

  ...uploadCertificacionRoute(producersController.uploadCertificacionMe),

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

  '/:id',

  ...adminOnly,

  validate({ params: producerIdParamSchema, body: updateProducerSchema }),

  producersController.update,

);

