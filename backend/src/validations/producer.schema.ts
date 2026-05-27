import { z } from 'zod';
import { PRODUCER_SPECIALTY_KEYS } from '../constants/producerSpecialties.js';
import { redesSocialesSchema } from './producerProfile.schema.js';

const producerCoreFields = {
  nombre: z.string().trim().min(1, { message: 'Nombre requerido' }),
  apellido: z.string().trim().min(1, { message: 'Apellido requerido' }),
  email: z.string().trim().email({ message: 'Email inválido' }),
  telefono: z.string().trim().optional(),
};

const producerExtendedFields = {
  bio: z.string().trim().optional(),
  ciudad: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  foto: z.string().trim().url().optional().or(z.literal('')),
  idiomas: z.array(z.string().trim().min(1)).optional(),
  latitud: z.number().optional(),
  longitud: z.number().optional(),
  especialidades: z.array(z.enum(PRODUCER_SPECIALTY_KEYS)).optional(),
  redesSociales: redesSocialesSchema,
  matricula: z.string().trim().optional().or(z.literal('')),
  verificado: z.boolean().optional(),
  anosExperiencia: z.number().int().min(0).optional(),
  clientesActivos: z.number().int().min(0).optional(),
  tituloProfesional: z.string().trim().optional(),
};

/** Alta admin: crea `Usuario` PRODUCTOR + `Productor`. */
export const createProducerSchema = z
  .object({
    ...producerCoreFields,
    activo: z.boolean().optional(),
    ...producerExtendedFields,
    ciudad: z
      .string()
      .trim()
      .min(5, { message: 'Dirección requerida (mínimo 5 caracteres)' }),
  })
  .strict();

const producerPatchFields = z
  .object({
    ...producerCoreFields,
    ...producerExtendedFields,
  })
  .strict()
  .partial();

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

/** Query opcional para listar productores por cuenta activa/inactiva. */
export const listProducersQuerySchema = z
  .object({
    activo: z.preprocess((val) => {
      const s = Array.isArray(val) ? val[0] : val;
      if (typeof s !== 'string') return undefined;
      const t = s.trim();
      if (t === '') return undefined;
      return t;
    }, z.enum(['true', 'false']).optional()),
  })
  .transform((q): { activo?: boolean } => {
    if (q.activo === undefined) return {};
    return { activo: q.activo === 'true' };
  });
