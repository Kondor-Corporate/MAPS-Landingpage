import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  /** Origen permitido del frontend. Usado en CORS + cookies. Ej: http://localhost:5173 */
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_SECRET: z.string().min(32),
  REFRESH_EXPIRES_IN: z.string().default('30d'),

  /**
   * Contraseña inicial asignada a nuevos usuarios PRODUCTOR (alta admin) hasta existir
   * invitación / primer login. Exigir valor fuerte en producción (no commitear en .env real).
   */
  DEFAULT_PRODUCER_PASSWORD: z.string().min(12),

  /** URL pública del API (para URLs de archivos en storage local). */
  API_PUBLIC_URL: z.string().url().optional(),

  /** `local` = disco en uploads/; `s3` = bucket S3-compatible. */
  STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),

  S3_BUCKET: z.string().min(1).optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_ACCESS_KEY: z.string().min(1).optional(),
  S3_SECRET_KEY: z.string().min(1).optional(),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),

  /** User-Agent para peticiones a Nominatim (política de uso obligatoria). */
  NOMINATIM_USER_AGENT: z
    .string()
    .min(1)
    .default('maps-landingpage-dev/1.0 (contact@kondor.local)'),
}).superRefine((data, ctx) => {
  if (data.STORAGE_PROVIDER === 's3') {
    const required = ['S3_BUCKET', 'S3_REGION', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'] as const;
    for (const key of required) {
      if (!data[key]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${key} is required when STORAGE_PROVIDER=s3`,
          path: [key],
        });
      }
    }
  }
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) {
    return cached;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  cached = parsed.data;
  return cached;
}
