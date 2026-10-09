import { defineConfig } from '@playwright/test';
import { BASE_URL, LOCALE, TIMEZONE, VIEWPORT } from './scripts/capture/config';

/**
 * Config exclusiva de captura para el video promo. Independiente de cualquier
 * config del frontend. Cada proyecto corresponde a un script de captura y se
 * ejecuta con --project (ver scripts npm capture:*).
 *
 * NOTA: los scripts crean sus propios contextos (para controlar deviceScaleFactor,
 * storageState y recordVideo con nombres deterministas), por eso `use` acá solo
 * fija los defaults generales.
 */
export default defineConfig({
  testDir: './scripts/capture',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    locale: LOCALE,
    timezoneId: TIMEZONE,
    viewport: { ...VIEWPORT },
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts$/ },
    { name: 'public-web', testMatch: /public-web\.capture\.ts$/ },
    {
      name: 'intranet',
      testMatch: /intranet\.capture\.ts$/,
      dependencies: ['setup'],
    },
    { name: 'map', testMatch: /map\.record\.ts$/ },
    { name: 'login-dashboard', testMatch: /login-dashboard\.record\.ts$/ },
  ],
});
