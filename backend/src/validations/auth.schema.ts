import { z } from 'zod';
import { passwordSchema } from '../lib/passwordPolicy.js';

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
 * Body de POST /logout.
 * `{}` es válido. `refreshToken: ""` se trata como ausente para no devolver 400
 * ni bloquear una cookie `maps_refresh` válida (D2A).
 */
export const logoutBodySchema = z.object({
  refreshToken: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().min(1).optional(),
  ),
});

/** @deprecated Alias mantenido para compatibilidad durante la transición. Usar refreshBodySchema. */
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export const logoutSchema = logoutBodySchema;

/** Cambio self-service: cualquier Usuario autenticado cambia su propia contraseña. */
export const changeMyPasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .strict()
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'La confirmación no coincide',
    path: ['confirmPassword'],
  });
