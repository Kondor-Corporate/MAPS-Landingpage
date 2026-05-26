import type { RequestHandler } from 'express';

import { AppError } from '../lib/errors.js';

import {

  producersService,

  toAdminProducerDto,

  toMapProducerDto,

  type ListProducersQuery,

} from '../services/producers.service.js';

import type { UpdateAdminProducerInput } from '../lib/producerProfileMapper.js';



function getUserId(req: Parameters<RequestHandler>[0]): number {

  const sub = req.user?.sub;

  if (sub === undefined || sub === '') {

    throw new AppError(401, 'No autenticado');

  }

  const id = Number.parseInt(sub, 10);

  if (Number.isNaN(id)) {

    throw new AppError(401, 'Token inválido');

  }

  return id;

}



function certNombreFromBody(body: Record<string, unknown>): string | undefined {

  const raw =

    typeof body.nombre === 'string'

      ? body.nombre

      : typeof body.certificacionNombre === 'string'

        ? body.certificacionNombre

        : undefined;

  return raw?.trim() || undefined;

}



export const producersController = {

  list: (async (req, res, next) => {

    try {

      const query = req.query as unknown as ListProducersQuery;

      const rows = await producersService.list(query);

      res.json({

        data: rows.map(toAdminProducerDto),

        message: 'OK',

        error: null,

      });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,



  getById: (async (req, res, next) => {

    try {

      const id = Number.parseInt(req.params.id, 10);

      const row = await producersService.getById(id);

      if (!row) {

        throw new AppError(404, 'Productor no encontrado');

      }

      res.json({

        data: toAdminProducerDto(row),

        message: 'OK',

        error: null,

      });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,



  create: (async (req, res, next) => {

    try {

      const body = req.body as UpdateAdminProducerInput & {

        nombre: string;

        apellido: string;

        email: string;

        telefono?: string;

        activo?: boolean;

      };

      const creadoPorId = getUserId(req);

      const created = await producersService.create(body, { creadoPorId });

      res.status(201).json({

        data: toAdminProducerDto(created),

        message: 'OK',

        error: null,

      });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,



  update: (async (req, res, next) => {

    try {

      const id = Number.parseInt(req.params.id, 10);

      const body = req.body as UpdateAdminProducerInput;

      const updated = await producersService.update(id, body);

      res.json({

        data: toAdminProducerDto(updated),

        message: 'OK',

        error: null,

      });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,



  getMe: (async (req, res, next) => {

    try {

      const usuarioId = getUserId(req);

      const profile = await producersService.getMe(usuarioId);

      res.json({ data: { profile }, message: 'OK', error: null });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,



  updateMe: (async (req, res, next) => {

    try {

      const usuarioId = getUserId(req);

      const body = req.body as Parameters<typeof producersService.updateMe>[1];

      const profile = await producersService.updateMe(usuarioId, body);

      res.json({ data: { profile }, message: 'OK', error: null });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,



  uploadCertificacionMe: (async (req, res, next) => {

    try {

      const usuarioId = getUserId(req);

      const file = req.file;

      if (!file) {

        throw new AppError(400, 'Archivo PDF requerido');

      }

      const cert = await producersService.uploadCertificacionMe(

        usuarioId,

        file,

        certNombreFromBody(req.body ?? {}),

      );

      res.status(201).json({ data: { certificacion: cert }, message: 'OK', error: null });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,



  deleteCertificacionMe: (async (req, res, next) => {

    try {

      const usuarioId = getUserId(req);

      const certId = Number.parseInt(req.params.certId, 10);

      await producersService.deleteCertificacionMe(usuarioId, certId);

      res.json({ data: null, message: 'OK', error: null });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,



  uploadCertificacionAdmin: (async (req, res, next) => {

    try {

      const productorId = Number.parseInt(req.params.id, 10);

      const file = req.file;

      if (!file) {

        throw new AppError(400, 'Archivo PDF requerido');

      }

      const cert = await producersService.uploadCertificacionAdmin(

        productorId,

        file,

        certNombreFromBody(req.body ?? {}),

      );

      res.status(201).json({ data: { certificacion: cert }, message: 'OK', error: null });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,



  deleteCertificacionAdmin: (async (req, res, next) => {

    try {

      const productorId = Number.parseInt(req.params.id, 10);

      const certId = Number.parseInt(req.params.certId, 10);

      await producersService.deleteCertificacionAdmin(productorId, certId);

      res.json({ data: null, message: 'OK', error: null });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,



  getBySlug: (async (req, res, next) => {

    try {

      const { slug } = req.params as { slug: string };

      const profile = await producersService.getBySlug(slug);

      res.json({ data: { profile }, message: 'OK', error: null });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,



  listForMap: (async (_req, res, next) => {

    try {

      const rows = await producersService.listForMap();

      res.json({

        data: { producers: rows.map(toMapProducerDto) },

        message: 'OK',

        error: null,

      });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,



  updateStatus: (async (req, res, next) => {

    try {

      const id = Number.parseInt(req.params.id, 10);

      const { activo } = req.body as { activo: boolean };

      const row = await producersService.setActivo(id, activo);

      res.json({

        data: toAdminProducerDto(row),

        message: 'OK',

        error: null,

      });

    } catch (err) {

      next(err);

    }

  }) satisfies RequestHandler,

};

