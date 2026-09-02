import { z } from 'zod';
import { passwordSchema } from '../lib/passwordPolicy.js';

/** `id` numérico en path (Express entrega string; coerce a entero). */
export const adminIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** Query opcional para listar administradores por cuenta activa/inactiva. */
export const listAdminsQuerySchema = z
  .object({
    activo: z.preprocess(
      (val) => {
        const s = Array.isArray(val) ? val[0] : val;
        if (typeof s !== 'string') return undefined;
        const t = s.trim();
        if (t === '') return undefined;
        return t;
      },
      z.enum(['true', 'false']).optional(),
    ),
  })
  .transform((q): { activo?: boolean } => {
    if (q.activo === undefined) return {};
    return { activo: q.activo === 'true' };
  });

/** Identificador de acceso: handle o email. Trim, sin espacios internos, persistido en minúsculas. */
export const usuarioIdentSchema = z
  .string()
  .trim()
  .min(3, { message: 'Mínimo 3 caracteres' })
  .max(191, { message: 'Máximo 191 caracteres' })
  .regex(/^\S+$/, { message: 'No puede contener espacios' })
  .transform((s) => s.toLowerCase());

export const createAdminSchema = z
  .object({
    usuario: usuarioIdentSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .strict()
  .refine((d) => d.password === d.confirmPassword, {
    message: 'La confirmación no coincide',
    path: ['confirmPassword'],
  });

export const updateAdminSchema = z
  .object({
    usuario: usuarioIdentSchema,
  })
  .strict();

export const updateAdminStatusSchema = z
  .object({
    activo: z.boolean(),
  })
  .strict();

export const resetAdminPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .strict()
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'La confirmación no coincide',
    path: ['confirmPassword'],
  });
