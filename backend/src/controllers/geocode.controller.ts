import type { RequestHandler } from 'express';
import { geocodeAddress } from '../lib/geocode.js';

/**
 * GET /api/v1/geocode?q=<texto>
 *
 * Endpoint público (sin authenticate). Recibe una consulta de texto,
 * delega en geocodeAddress (que usa NOMINATIM_USER_AGENT del entorno)
 * y devuelve las coordenadas o null si no se encontró resultado.
 *
 * El query param `q` ya llega validado y trimado por el middleware validate.
 */
export const getGeocode: RequestHandler = async (req, res) => {
  const q = req.query.q as string;

  const result = await geocodeAddress(q);

  res.json({
    data: result,
    message: result ? 'ok' : 'no encontrado',
    error: null,
  });
};
