import { z } from 'zod';

const ramoIconoSchema = z.enum([
  'car',
  'heart',
  'fire',
  'store',
  'bike',
  'shield',
  'key',
  'megaphone',
  'classic-car',
  'person',
  'people',
  'scales',
  'truck',
  'umbrella',
  'boat',
  'home',
  'wrench',
  'factory',
  'wheat',
  'plane',
  'drone',
  'building',
  'pulse',
  'paw',
]);

const httpsUrlSchema = z
  .string()
  .trim()
  .url({ message: 'URL inválida' })
  .refine((u) => u.startsWith('https://'), { message: 'Debe comenzar con https://' });

const ramoCoreFields = {
  nombre: z.string().trim().min(1, { message: 'Nombre requerido' }),
  descripcion: z.string().trim().min(1, { message: 'Descripción requerida' }),
  icono: ramoIconoSchema,
  gdriveUrl: httpsUrlSchema,
  tipo: z.enum(['PRINCIPAL', 'SECUNDARIO']),
  orden: z.number().int().min(1),
  activo: z.boolean(),
};

export const createRamoSchema = z.object(ramoCoreFields).strict();

const ramoPatchFields = z.object(ramoCoreFields).strict().partial();

export const updateRamoSchema = ramoPatchFields.refine(
  (fields) => Object.values(fields).some((v) => v !== undefined),
  { message: 'Se requiere al menos un campo para actualizar' },
);

export const updateRamoActivoSchema = z.object({
  activo: z.boolean(),
});

export const ramoIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listLibraryRamosQuerySchema = z
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
