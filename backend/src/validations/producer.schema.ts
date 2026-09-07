import { z } from 'zod';
import { PRODUCER_SPECIALTY_KEYS } from '../constants/producerSpecialties.js';
import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
} from '../lib/coordinates.js';
import { passwordSchema } from '../lib/passwordPolicy.js';
import { redesSocialesSchema } from './producerProfile.schema.js';

const LATITUDE_MESSAGE = 'La latitud debe estar entre -90 y 90';
const LONGITUDE_MESSAGE = 'La longitud debe estar entre -180 y 180';

function optionalCoordinatePreprocess(value: unknown) {
  if (value === null || value === '') return undefined;
  if (typeof value === 'string') return Number(value);
  return value;
}

const optionalTrimmedString = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().optional(),
);

const optionalUrlString = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.string().trim().url().optional().or(z.literal('')),
);

const optionalLatitude = z.preprocess(
  optionalCoordinatePreprocess,
  z
    .number()
    .finite({ message: LATITUDE_MESSAGE })
    .min(LATITUDE_MIN, { message: LATITUDE_MESSAGE })
    .max(LATITUDE_MAX, { message: LATITUDE_MESSAGE })
    .optional(),
);

const optionalLongitude = z.preprocess(
  optionalCoordinatePreprocess,
  z
    .number()
    .finite({ message: LONGITUDE_MESSAGE })
    .min(LONGITUDE_MIN, { message: LONGITUDE_MESSAGE })
    .max(LONGITUDE_MAX, { message: LONGITUDE_MESSAGE })
    .optional(),
);

const optionalNonNegativeInteger = z.preprocess(
  (value) => {
    if (value === null || value === '') return undefined;
    if (typeof value === 'string') return Number(value);
    return value;
  },
  z.number().int().min(0).optional(),
);

const optionalStringArray = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.array(z.string().trim().min(1)).optional(),
);

const optionalSpecialtyArray = z.preprocess(
  (value) => {
    if (value === null) return undefined;
    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'object' && item !== null && 'clave' in item)
    ) {
      return value.map((item) => (item as { clave: unknown }).clave);
    }
    return value;
  },
  z.array(z.enum(PRODUCER_SPECIALTY_KEYS)).optional(),
);

const producerCoreFields = {
  nombre: z.string().trim().min(1, { message: 'Nombre requerido' }),
  apellido: z.string().trim().min(1, { message: 'Apellido requerido' }),
  email: z.string().trim().email({ message: 'Email invalido' }),
  telefono: optionalTrimmedString,
};

/** Contraseña inicial definida por el admin en el alta. Requerida solo en `createProducerSchema`. */
const producerPasswordField = {
  password: passwordSchema,
};

const producerExtendedFields = {
  bio: optionalTrimmedString,
  ciudad: optionalTrimmedString,
  direccion: optionalTrimmedString,
  whatsapp: optionalTrimmedString,
  foto: optionalUrlString,
  idiomas: optionalStringArray,
  latitud: optionalLatitude,
  longitud: optionalLongitude,
  especialidades: optionalSpecialtyArray,
  redesSociales: z.preprocess((value) => (value === null ? undefined : value), redesSocialesSchema),
  matricula: optionalTrimmedString.or(z.literal('')),
  verificado: z.boolean().optional(),
  anosExperiencia: optionalNonNegativeInteger,
  clientesActivos: optionalNonNegativeInteger,
  tituloProfesional: optionalTrimmedString,
};

function hasDireccion(fields: { ciudad?: string; direccion?: string }) {
  return (
    (fields.direccion !== undefined && fields.direccion.trim().length >= 5) ||
    (fields.ciudad !== undefined && fields.ciudad.trim().length >= 5)
  );
}

/** Alta admin: crea `Usuario` PRODUCTOR + `Productor`. Requiere password inicial (MAPS-016). */
export const createProducerSchema = z
  .object({
    ...producerCoreFields,
    ...producerPasswordField,
    activo: z.boolean().optional(),
    ...producerExtendedFields,
  })
  .strict()
  .refine(hasDireccion, { message: 'Direccion requerida (minimo 5 caracteres)' });

const producerPatchFields = z
  .object({
    ...producerCoreFields,
    ...producerExtendedFields,
  })
  .strict()
  .partial();

/** Actualizacion parcial: al menos un campo debe enviarse. */
export const updateProducerSchema = producerPatchFields.refine(
  (fields) => Object.values(fields).some((v) => v !== undefined),
  { message: 'Se requiere al menos un campo para actualizar' },
);

/** Cambio explicito de cuenta activa/inactiva (Usuario.activo). */
export const updateProducerStatusSchema = z.object({
  activo: z.boolean(),
});

/** Restablecimiento admin: no pide la contraseña actual (MAPS-016). */
export const resetProducerPasswordSchema = z
  .object({
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1),
  })
  .strict()
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'La confirmación no coincide',
    path: ['confirmPassword'],
  });

/** `id` numerico en path (Express entrega string; coerce a entero). */
export const producerIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** Query opcional para listar productores por cuenta activa/inactiva. */
export const listProducersQuerySchema = z
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
