import { z } from 'zod';

export const geocodeQuerySchema = z.object({
  q: z
    .string({ required_error: 'El parámetro q es requerido' })
    .trim()
    .min(3, 'La búsqueda debe tener al menos 3 caracteres')
    .max(200, 'La búsqueda es demasiado larga'),
});

export type GeocodeQueryParams = z.infer<typeof geocodeQuerySchema>;
