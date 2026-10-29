import { z } from 'zod';

/** Política mínima compartida por alta, cambio self-service y reset admin (MAPS-016). */
export const PASSWORD_MIN_LENGTH = 8;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { message: `Mínimo ${PASSWORD_MIN_LENGTH} caracteres` })
  .regex(/[A-Z]/, { message: 'Requiere al menos una mayúscula' })
  .regex(/[a-z]/, { message: 'Requiere al menos una minúscula' })
  .regex(/[0-9]/, { message: 'Requiere al menos un número' });
