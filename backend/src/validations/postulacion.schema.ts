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
    /**
     * Señal explícita de consentimiento. Sólo el literal `true` es válido:
     * `false`, ausente, `null`, `"true"` o `1` se rechazan. El servidor registra
     * el timestamp y la versión; el cliente no puede enviarlos.
     */
    consentimiento: z.literal(true, {
      errorMap: () => ({
        message: 'Debés aceptar el uso de tus datos para enviar la postulación.',
      }),
    }),
    /**
     * Honeypot anti-bot: campo señuelo que el formulario mantiene oculto y fuera
     * del tab-order. Los usuarios legítimos lo envían vacío; si llega con valor es
     * automatización. Se acepta en el schema (no se devuelve 422) para no revelar
     * la detección: el descarte ocurre silenciosamente en el servicio.
     */
    website: z.string().max(200).optional(),
  })
  .strict();

export type CreatePostulacionInput = z.infer<typeof createPostulacionSchema>;

/** `id` numérico positivo en `DELETE /postulaciones/:id`. Local a este recurso. */
export const postulacionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
