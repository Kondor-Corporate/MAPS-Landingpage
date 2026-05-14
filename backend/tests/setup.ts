/**
 * Carga `backend/.env` de forma explícita (no depende del cwd al lanzar Vitest).
 *
 * **Base de datos:** no hay DB de test dedicada en esta fase. La suite de integración
 * usa el mismo `DATABASE_URL` que definás en `backend/.env` (típicamente la Postgres
 * local de desarrollo del equipo). En **GitHub Actions** el workflow exporta
 * `DATABASE_URL` al servicio Postgres del job antes de `prisma migrate deploy` y tests.
 *
 * Requisitos locales: PostgreSQL accesible, migraciones aplicadas y `npm run db:seed`.
 */
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });
