import { z } from 'zod';

export const producerIdSchema = z.object({
  id: z.string().uuid(),
});

export const producerCreateSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug muy corto')
    .max(200, 'Slug muy largo')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido'),
  nombre: z
    .string()
    .min(2, 'Nombre muy corto')
    .max(100, 'Nombre muy largo'),
  apellido: z
    .string()
    .min(2, 'Apellido muy corto')
    .max(100, 'Apellido muy largo'),
  bio: z
    .string()
    .max(1000, 'Bio muy larga')
    .optional(),
  ciudad: z
    .string()
    .max(100, 'Ciudad muy larga')
    .optional(),
  dni: z
    .string()
    .max(20, 'DNI muy largo')
    .optional(),
  foto: z
    .string()
    .url('URL de foto inválida')
    .optional(),
  latitud: z
    .number()
    .min(-90, 'Latitud inválida')
    .max(90, 'Latitud inválida')
    .optional(),
  longitud: z
    .number()
    .min(-180, 'Longitud inválida')
    .max(180, 'Longitud inválida')
    .optional(),
  telefono: z
    .string()
    .max(20, 'Teléfono muy largo')
    .optional(),
});

export const producerUpdateSchema = producerCreateSchema.partial();

export const redSocialSchema = z.object({
  plataforma: z
    .string()
    .min(1, 'Plataforma requerida')
    .max(50, 'Plataforma muy larga'),
  url: z
    .string()
    .url('URL inválida'),
  orden: z
    .number()
    .int()
    .default(0),
});

export type ProducerCreateInput = z.infer<typeof producerCreateSchema>;
export type ProducerUpdateInput = z.infer<typeof producerUpdateSchema>;
export type RedSocialInput = z.infer<typeof redSocialSchema>;
