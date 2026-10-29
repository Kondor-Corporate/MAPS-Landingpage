import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { optionalAuth } from '../../../middlewares/optionalAuth.js';
import {
  geocodeBurstLimiter,
  geocodeSustainedLimiter,
} from '../../../middlewares/geocodeLimiter.js';
import {
  geocodeQuerySchema,
  reverseGeocodeQuerySchema,
} from '../../../validations/geocode.schema.js';
import {
  getGeocode,
  getReverseGeocode,
} from '../../../controllers/geocode.controller.js';

export const geocodeRouter = Router();

geocodeRouter.get(
  '/reverse',
  optionalAuth,
  geocodeBurstLimiter,
  geocodeSustainedLimiter,
  validate({ query: reverseGeocodeQuerySchema }),
  getReverseGeocode,
);

/**
 * GET /api/v1/geocode?q=<texto>
 *
 * Público (sin authenticate). Proxy hacia Nominatim server-side con User-Agent válido.
 * `optionalAuth` solo difiere el cupo (autenticado vs. anónimo) sin exigir sesión.
 */
geocodeRouter.get(
  '/',
  optionalAuth,
  geocodeBurstLimiter,
  geocodeSustainedLimiter,
  validate({ query: geocodeQuerySchema }),
  getGeocode,
);
