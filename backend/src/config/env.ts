import { z } from 'zod';

/** Parsea FRONTEND_ORIGIN como lista separada por coma. */
export function parseFrontendOrigins(raw: string): string[] {
  return [...new Set(raw.split(',').map((part) => part.trim()).filter(Boolean))];
}

type NodeEnv = 'development' | 'production' | 'test';

/**
 * En dev/test, si solo hay localhost o 127.0.0.1 en un puerto, agrega el par equivalente
 * para evitar bloqueos CORS al alternar URLs en Windows.
 */
export function expandDevFrontendOrigins(origins: string[], nodeEnv: NodeEnv): string[] {
  if (nodeEnv !== 'development' && nodeEnv !== 'test') {
    return origins;
  }

  const expanded = [...origins];
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost') {
        const alt = new URL(origin);
        alt.hostname = '127.0.0.1';
        expanded.push(alt.origin);
      } else if (url.hostname === '127.0.0.1') {
        const alt = new URL(origin);
        alt.hostname = 'localhost';
        expanded.push(alt.origin);
      }
    } catch {
      // Validación previa en superRefine.
    }
  }

  return [...new Set(expanded)];
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  /**
   * Origen(es) permitidos del frontend (CORS). Una URL o varias separadas por coma.
   * Ej: http://localhost:5173 o http://localhost:5173,http://127.0.0.1:5173
   */
  FRONTEND_ORIGIN: z.string().min(1).default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_SECRET: z.string().min(32),
  REFRESH_EXPIRES_IN: z.string().default('30d'),

  /**
   * Detrás de reverse proxy (nginx, load balancer): `false` (default), `true` para confiar en
   * `X-Forwarded-*` como indica Express, o número entero de saltos (`1`, `2`, …).
   * En local/dev dejar `false` salvo que sepas lo que hacés.
   */
  TRUST_PROXY: z.string().optional().default('false'),

  /**
   * Permitir `refreshToken` en el body de POST /auth/refresh y logout (además de la cookie).
   * En producción el default es **desactivado** (solo cookie httpOnly). Activar solo si un
   * cliente legítimo no puede usar cookies (p. ej. herramientas internas); valor `true` explícito.
   */
  ALLOW_REFRESH_BODY: z.enum(['true', 'false']).optional(),

  /**
   * Contraseña usada únicamente por `prisma/seed.ts` para los productores de ejemplo.
   * Desde MAPS-016 el alta real de productores exige `password` individual en el body
   * de `POST /producers`; esta env var ya no participa en `producersService.create`.
   */
  DEFAULT_PRODUCER_PASSWORD: z.string().min(12).optional(),

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
  for (const origin of parseFrontendOrigins(data.FRONTEND_ORIGIN)) {
    const urlCheck = z.string().url().safeParse(origin);
    if (!urlCheck.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `FRONTEND_ORIGIN contiene una URL inválida: ${origin}`,
        path: ['FRONTEND_ORIGIN'],
      });
    }
  }

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

type ParsedEnv = z.infer<typeof envSchema>;

export type Env = ParsedEnv & {
  /** Valor ya normalizado para `app.set('trust proxy', …)`. */
  trustProxy: boolean | number;
  /** Si se acepta `body.refreshToken` además de la cookie `maps_refresh`. */
  allowRefreshBody: boolean;
  /** Orígenes CORS permitidos (normalizados, sin duplicados). */
  frontendOrigins: string[];
};

let cached: Env | null = null;

/** Interpreta `TRUST_PROXY` para Express (`trust proxy`). */
export function parseTrustProxy(raw: string): boolean | number {
  const v = raw.trim().toLowerCase();
  if (v === '' || v === 'false' || v === '0') return false;
  if (v === 'true') return true;
  const n = Number.parseInt(v, 10);
  if (!Number.isNaN(n) && n > 0) return n;
  return false;
}

function buildEnv(parsed: ParsedEnv): Env {
  const allowRefreshBody =
    parsed.ALLOW_REFRESH_BODY !== undefined
      ? parsed.ALLOW_REFRESH_BODY === 'true'
      : parsed.NODE_ENV !== 'production';

  const frontendOrigins = expandDevFrontendOrigins(
    parseFrontendOrigins(parsed.FRONTEND_ORIGIN),
    parsed.NODE_ENV,
  );

  return {
    ...parsed,
    trustProxy: parseTrustProxy(parsed.TRUST_PROXY),
    allowRefreshBody,
    frontendOrigins,
  };
}

export function loadEnv(): Env {
  if (cached) {
    return cached;
  }
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }
  cached = buildEnv(parsed.data);
  return cached;
}
