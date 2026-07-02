import { z } from 'zod';

const categoriaNoticiaSchema = z.enum([
  'NOVEDAD',
  'EVENTO',
  'CIRCULAR',
  'PRODUCTO',
  'COMUNICADO',
]);

const visibilidadSchema = z.enum(['PUBLICA', 'INTERNA']);

const httpsUrlSchema = z
  .string()
  .trim()
  .url({ message: 'URL inválida' })
  .refine((u) => u.startsWith('https://'), { message: 'Debe comenzar con https://' })
  .refine((u) => !u.startsWith('data:'), { message: 'No se permiten data URLs' });

const imagenUrlSchema = z
  .union([httpsUrlSchema, z.null()])
  .optional()
  .transform((v) => (v === undefined ? undefined : v));

const newsCoreFields = {
  titulo: z.string().trim().min(5, { message: 'El título debe tener al menos 5 caracteres' }),
  contenido: z
    .string()
    .trim()
    .min(20, { message: 'El contenido debe tener al menos 20 caracteres' }),
  descripcion: z.string().trim().optional().nullable(),
  categoria: categoriaNoticiaSchema,
  visibilidad: visibilidadSchema,
  imagenUrl: imagenUrlSchema,
  publicada: z.boolean().optional(),
};

/** Alta admin: crea `Noticia`. `slug` y `autorId` se resuelven en servidor. */
export const createNewsSchema = z.object(newsCoreFields).strict();

const newsPatchFields = z.object(newsCoreFields).strict().partial();

/** Actualización parcial: al menos un campo debe enviarse. */
export const updateNewsSchema = newsPatchFields.refine(
  (fields) => Object.values(fields).some((v) => v !== undefined),
  { message: 'Se requiere al menos un campo para actualizar' },
);

/** `id` numérico en path (Express entrega string; coerce a entero). */
export const newsIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

/** @deprecated Usar `newsIdParamSchema`. */
export const newsIdSchema = newsIdParamSchema;

/** Slug en path para detalle público. */
export const newsSlugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Slug inválido' }),
});

const booleanQueryPreprocess = z.preprocess((val) => {
  const s = Array.isArray(val) ? val[0] : val;
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  if (t === '') return undefined;
  return t;
}, z.enum(['true', 'false']).optional());

/** Query opcional para listado admin. */
export const listNewsAdminQuerySchema = z
  .object({
    publicada: booleanQueryPreprocess,
    visibilidad: visibilidadSchema.optional(),
    categoria: categoriaNoticiaSchema.optional(),
    q: z.string().trim().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .transform((q) => {
    const out: {
      publicada?: boolean;
      visibilidad?: z.infer<typeof visibilidadSchema>;
      categoria?: z.infer<typeof categoriaNoticiaSchema>;
      q?: string;
      page?: number;
      limit?: number;
    } = {};
    if (q.publicada !== undefined) out.publicada = q.publicada === 'true';
    if (q.visibilidad !== undefined) out.visibilidad = q.visibilidad;
    if (q.categoria !== undefined) out.categoria = q.categoria;
    if (q.q !== undefined) out.q = q.q;
    if (q.page !== undefined) out.page = q.page;
    if (q.limit !== undefined) out.limit = q.limit;
    return out;
  });

/** Query opcional para listado público. */
export const listNewsPublicQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(20).optional(),
  })
  .transform((q) => ({
    page: q.page,
    limit: q.limit,
  }));

/** Query opcional para listado intranet (mismos límites que público). */
export const listNewsIntranetQuerySchema = listNewsPublicQuerySchema;
