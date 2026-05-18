import { z } from 'zod';

export const newsIdSchema = z.object({
  id: z.string().uuid(),
});

export const newsCreateSchema = z.object({
  titulo: z
    .string()
    .min(5, 'Título debe tener al menos 5 caracteres')
    .max(200, 'Título no puede exceder 200 caracteres'),
  slug: z
    .string()
    .min(3, 'Slug muy corto')
    .max(200, 'Slug muy largo')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug inválido'),
  descripcion: z
    .string()
    .max(500, 'Descripción muy larga')
    .optional(),
  contenido: z
    .string()
    .min(10, 'Contenido muy corto')
    .max(10000, 'Contenido muy largo'),
  imagenUrl: z
    .string()
    .url('URL de imagen inválida')
    .optional(),
  publicada: z
    .boolean()
    .default(false),
  visibilidad: z
    .enum(['INTERNA', 'PUBLICA'])
    .default('PUBLICA'),
});

export const newsUpdateSchema = newsCreateSchema.partial();

export type NewsCreateInput = z.infer<typeof newsCreateSchema>;
export type NewsUpdateInput = z.infer<typeof newsUpdateSchema>;
