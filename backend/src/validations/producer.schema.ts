import { z } from 'zod';

const producerCoreFields = {
  nombre: z.string().trim().min(1, { message: 'Nombre requerido' }),
  apellido: z.string().trim().min(1, { message: 'Apellido requerido' }),
  email: z.string().trim().email({ message: 'Email inválido' }),
  telefono: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
};

/** Alta (fase CRUD posterior). Incluye estado inicial opcional del usuario. */
export const createProducerSchema = z.object({
  ...producerCoreFields,
  activo: z.boolean().optional(),
});

const producerPatchFields = z.object(producerCoreFields).partial();

/** Actualización parcial: al menos un campo debe enviarse. */
export const updateProducerSchema = producerPatchFields.refine(
  (fields) => Object.values(fields).some((v) => v !== undefined),
  { message: 'Se requiere al menos un campo para actualizar' },
);

/** Cambio explícito de cuenta activa/inactiva (Usuario.activo). */
export const updateProducerStatusSchema = z.object({
  activo: z.boolean(),
});

/** `id` numérico en path (Express entrega string; coerce a entero). */
export const producerIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
