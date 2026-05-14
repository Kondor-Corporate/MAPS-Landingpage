/**
 * Carga `backend/.env` de forma explícita (no depende del cwd al lanzar Vitest).
 * Requiere PostgreSQL, migraciones y `npm run db:seed`.
 */
import { config } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });
