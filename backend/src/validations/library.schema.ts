import { z } from 'zod';

export const bibliotecaCreateSchema = z.object({
  nombre: z
    .string()
    .min(3, 'Nombre muy corto')
    .max(100, 'Nombre muy largo'),
  descripcion: z
    .string()
    .max(500, 'Descripción muy larga')
    .optional(),
});

export const ramoCreateSchema = z.object({
  bibliotecaId: z.number().int(),
  nombre: z
    .string()
    .min(3, 'Nombre muy corto')
    .max(100, 'Nombre muy largo'),
  descripcion: z
    .string()
    .max(500, 'Descripción muy larga')
    .optional(),
  orden: z
    .number()
    .int()
    .default(0),
});

export const recursoCreateSchema = z.object({
  ramoId: z.number().int(),
  url: z
    .string()
    .url('URL inválida'),
});

export type BibliotecaCreateInput = z.infer<typeof bibliotecaCreateSchema>;
export type RamoCreateInput = z.infer<typeof ramoCreateSchema>;
export type RecursoCreateInput = z.infer<typeof recursoCreateSchema>;
