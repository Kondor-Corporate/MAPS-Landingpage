import { z } from 'zod';

/**
 * Postulación pública de nuevos Productores Asesores de Seguros.
 * Todos los campos son obligatorios. El cuerpo se recibe por un endpoint
 * público, por lo que la validación es la única barrera de integridad previa
 * a la persistencia.
 */
export const createPostulacionSchema = z
  .object({
    nombreCompleto: z
      .string()
      .trim()
      .min(3, { message: 'Ingresá tu nombre completo' })
      .max(120, { message: 'Máximo 120 caracteres' }),
    dni: z.preprocess(
      (value) => (typeof value === 'string' ? value.replace(/[.\s]/g, '') : value),
      z
        .string()
        .regex(/^\d{7,9}$/, { message: 'DNI inválido (7 a 9 dígitos)' }),
    ),
    telefono: z
      .string()
      .trim()
      .min(6, { message: 'Ingresá un teléfono válido' })
      .max(30, { message: 'Máximo 30 caracteres' })
      .regex(/^[\d\s()+-]+$/, { message: 'Teléfono inválido' }),
    matricula: z
      .string()
      .trim()
      .min(1, { message: 'Ingresá tu número de matrícula' })
      .max(40, { message: 'Máximo 40 caracteres' }),
    localidad: z
      .string()
      .trim()
      .min(2, { message: 'Ingresá tu localidad' })
      .max(120, { message: 'Máximo 120 caracteres' }),
    situacion: z.enum(['PRODUCTOR_NUEVO', 'TRABAJA_CON_OTRAS'], {
      errorMap: () => ({ message: 'Seleccioná una opción' }),
    }),
  })
  .strict();

export type CreatePostulacionInput = z.infer<typeof createPostulacionSchema>;
