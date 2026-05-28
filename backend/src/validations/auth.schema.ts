import { z } from 'zod';

export const loginSchema = z.object({
  usuario: z.string().min(1),
  password: z.string().min(1),
});

/**
 * Body de POST /refresh.
 * `refreshToken` es opcional: el camino principal es la cookie httpOnly `maps_refresh`.
 * En **producción** el fallback por body queda desactivado salvo `ALLOW_REFRESH_BODY=true`
 * (ver `backend/src/config/env.ts`). En desarrollo y tests sigue habilitado por defecto.
 */
export const refreshBodySchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

/**
 * Body de POST /logout. Mismo esquema que refresh.
 */
export const logoutBodySchema = refreshBodySchema;

/** @deprecated Alias mantenido para compatibilidad durante la transición. Usar refreshBodySchema. */
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export const logoutSchema = logoutBodySchema;
