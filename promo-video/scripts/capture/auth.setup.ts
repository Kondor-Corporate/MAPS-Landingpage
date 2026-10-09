/**
 * Login del productor y guardado de la sesión autenticada en .auth/producer.json.
 * Reutilizado por las capturas de intranet (dashboard, biblioteca, noticias, mi perfil).
 *
 * El accessToken vive en memoria en la app; la sesión persiste vía cookie de
 * refresh (httpOnly). `storageState` captura cookies + localStorage, así que las
 * capturas de intranet re-autentican solas al hacer el refresh silencioso.
 */
import { expect, test } from '@playwright/test';
import {
  CREDENTIALS,
  DIRS,
  PRODUCER_STATE,
  ROUTES,
  ensureDir,
  newScreenshotContext,
} from './config';

test('login productor y guardar storageState', async ({ browser }) => {
  ensureDir(DIRS.auth);

  const context = await newScreenshotContext(browser);
  const page = await context.newPage();

  await page.goto(ROUTES.login);
  await expect(page.getByLabel(/email o usuario/i)).toBeVisible();

  await page.getByLabel(/email o usuario/i).fill(CREDENTIALS.user);
  await page.getByLabel(/^contraseña$/i).fill(CREDENTIALS.pass);
  await page.getByRole('button', { name: /ingresar al portal/i }).click();

  // El login deja la cookie de refresh en el contexto. Navegamos al dashboard
  // y confirmamos que quedó autenticado antes de persistir el estado.
  await page.waitForURL(/\/intranet\//, { timeout: 30_000 }).catch(() => {});
  await page.goto(ROUTES.dashboard);
  await expect(page.getByText(/Acceso al Portal SELF/i)).toBeVisible({ timeout: 30_000 });

  await context.storageState({ path: PRODUCER_STATE });
  await context.close();
});
