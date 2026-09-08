import { z } from 'zod';
import { PRODUCER_SPECIALTY_KEYS } from '../constants/producerSpecialties.js';
import {
  LATITUDE_MAX,
  LATITUDE_MIN,
  LONGITUDE_MAX,
  LONGITUDE_MIN,
} from '../lib/coordinates.js';

const LATITUDE_MESSAGE = 'La latitud debe estar entre -90 y 90';
const LONGITUDE_MESSAGE = 'La longitud debe estar entre -180 y 180';

const boundedLatitude = z
  .number()
  .finite({ message: LATITUDE_MESSAGE })
  .min(LATITUDE_MIN, { message: LATITUDE_MESSAGE })
  .max(LATITUDE_MAX, { message: LATITUDE_MESSAGE })
  .optional();

const boundedLongitude = z
  .number()
  .finite({ message: LONGITUDE_MESSAGE })
  .min(LONGITUDE_MIN, { message: LONGITUDE_MESSAGE })
  .max(LONGITUDE_MAX, { message: LONGITUDE_MESSAGE })
  .optional();

export const redesSocialesSchema = z
  .array(
    z.object({
      plataforma: z.string().trim().min(1),
      url: z.string().trim().url(),
      orden: z.number().int().min(0).optional(),
    }),
  )
  .optional();

const ADMIN_ONLY_PROFILE_FIELDS = [
  'matricula',
  'verificado',
  'anosExperiencia',
  'clientesActivos',
  'tituloProfesional',
  'nombre',
  'apellido',
  'slug',
] as const;

export const updateMyProfileSchema = z
  .object({
    bio: z.string().trim().optional(),
    ciudad: z.string().trim().optional(),

    direccion: z.string().trim().optional(),
    telefono: z.string().trim().optional(),
    whatsapp: z.string().trim().optional(),
    foto: z.string().trim().url().optional().or(z.literal('')),
    idiomas: z.array(z.string().trim().min(1)).optional(),
    latitud: boundedLatitude,
    longitud: boundedLongitude,
    especialidades: z.array(z.enum(PRODUCER_SPECIALTY_KEYS)).optional(),
    redesSociales: redesSocialesSchema,
  })
  .strict()
  .refine(
    (fields) => Object.values(fields).some((v) => v !== undefined),
    { message: 'Se requiere al menos un campo para actualizar' },
  );

export function assertNoAdminOnlyProfileFields(body: Record<string, unknown>): void {
  for (const key of ADMIN_ONLY_PROFILE_FIELDS) {
    if (body[key] !== undefined) {
      throw new Error(`FORBIDDEN_FIELD:${key}`);
    }
  }
}

export const bySlugParamSchema = z.object({
  slug: z.string().trim().min(1),
});

export const certIdParamSchema = z.object({
  certId: z.coerce.number().int().positive(),
});

export const uploadCertificacionBodySchema = z.object({
  certificacionNombre: z.string().trim().optional(),
  nombre: z.string().trim().optional(),
});
