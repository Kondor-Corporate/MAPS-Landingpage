import { z } from 'zod';

/**
 * Campos de productor para alta/edición admin (MAPS-009).
 *
 * Pendiente (fuera de alcance actual): aceptar **WhatsApp** u otros medios solo tras
 * decisión de negocio y migración Prisma (p. ej. columna `whatsapp` en `Productor`).
 */
const producerCoreFields = {
  nombre: z.string().trim().min(1, { message: 'Nombre requerido' }),
  apellido: z.string().trim().min(1, { message: 'Apellido requerido' }),
  email: z.string().trim().email({ message: 'Email inválido' }),
  telefono: z.string().trim().optional(),
};

/** Alta admin: crea `Usuario` PRODUCTOR + `Productor`. Estado inicial opcional en cuenta. */
export const createProducerSchema = z
  .object({
    ...producerCoreFields,
    activo: z.boolean().optional(),
  })
  .strict();

const producerPatchFields = z.object(producerCoreFields).strict().partial();

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
