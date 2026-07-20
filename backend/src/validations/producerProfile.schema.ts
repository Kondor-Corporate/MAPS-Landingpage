import { z } from 'zod';
import { PRODUCER_SPECIALTY_KEYS } from '../constants/producerSpecialties.js';
import { passwordSchema } from '../lib/passwordPolicy.js';

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
    latitud: z.number().optional(),
    longitud: z.number().optional(),
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

/** Cambio self-service: requiere la contraseña actual (MAPS-016). */
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
