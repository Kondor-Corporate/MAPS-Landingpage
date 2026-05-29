import { Router } from 'express';
import { validate } from '../../../middlewares/validate.js';
import { geocodeQuerySchema } from '../../../validations/geocode.schema.js';
import { getGeocode } from '../../../controllers/geocode.controller.js';

export const geocodeRouter = Router();

/**
 * GET /api/v1/geocode?q=<texto>
 *
 * Público (sin authenticate). Proxy hacia Nominatim server-side con User-Agent válido.
 * Rate limiting específico queda pendiente para la fase pre go-live (ver MAPS-013 §5.2).
 */
geocodeRouter.get('/', validate({ query: geocodeQuerySchema }), getGeocode);
