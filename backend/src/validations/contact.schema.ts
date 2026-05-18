import { z } from 'zod';

export const contactSchema = z.object({
  nombre: z
    .string()
    .min(2, 'Nombre debe tener al menos 2 caracteres')
    .max(100, 'Nombre no puede exceder 100 caracteres'),
  email: z
    .string()
    .email('Email inválido'),
  telefono: z
    .string()
    .max(20, 'Teléfono muy largo')
    .optional()
    .refine(
      (val) => !val || /^[\d\s\-\+\(\)]+$/.test(val),
      'Teléfono inválido',
    ),
  asunto: z
    .string()
    .min(3, 'Asunto muy corto')
    .max(150, 'Asunto muy largo'),
  mensaje: z
    .string()
    .min(10, 'Mensaje muy corto')
    .max(2000, 'Mensaje muy largo'),
});

export type ContactInput = z.infer<typeof contactSchema>;
