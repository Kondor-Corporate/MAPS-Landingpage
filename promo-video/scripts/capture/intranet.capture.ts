/**
 * Screenshots de la Intranet del productor (3840x2160), reutilizando la sesión
 * autenticada de .auth/producer.json (proyecto 'setup' corre antes por dependencia):
 *   - dashboard.png  → Dashboard con tarjetas de acceso
 *   - library.png    → Biblioteca Digital
 *   - news.png       → Novedades internas
 *   - my-profile.png → Mi Perfil del productor
 */
import fs from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  DIRS,
  PRODUCER_STATE,
  ROUTES,
  freezeUi,
  newScreenshotContext,
  saveViewportShot,
  settle,
} from './config';

test.beforeAll(() => {
  if (!fs.existsSync(PRODUCER_STATE)) {
    throw new Error(
      `Falta la sesión autenticada (${PRODUCER_STATE}). Ejecutá primero "npm run capture:setup".`,
    );
  }
});

test('dashboard intranet', async ({ browser }) => {
  const context = await newScreenshotContext(browser, { storageState: PRODUCER_STATE });
  const page = await context.newPage();

  await page.goto(ROUTES.dashboard);
  await expect(page.getByText(/Acceso al Portal SELF/i)).toBeVisible();
  await expect(page.getByText(/Biblioteca Digital/i).first()).toBeVisible();
  await settle(page);
  await freezeUi(page);

  await saveViewportShot(page, path.join(DIRS.intranet, 'dashboard.png'));
  await context.close();
});

test('biblioteca digital', async ({ browser }) => {
  const context = await newScreenshotContext(browser, { storageState: PRODUCER_STATE });
  const page = await context.newPage();

  await page.goto(ROUTES.library);
  await expect(page.getByRole('heading', { name: /Biblioteca Digital/i })).toBeVisible();
  await expect(page.getByText('Automotores').first()).toBeVisible();
  await settle(page);
  await freezeUi(page);

  await saveViewportShot(page, path.join(DIRS.intranet, 'library.png'));
  await context.close();
});

test('novedades internas', async ({ browser }) => {
  const context = await newScreenshotContext(browser, { storageState: PRODUCER_STATE });
  const page = await context.newPage();

  await page.goto(ROUTES.intranetNews);
  await expect(page.getByRole('heading', { name: /Novedades internas/i })).toBeVisible();
  await settle(page, 500);
  await freezeUi(page);

  await saveViewportShot(page, path.join(DIRS.intranet, 'news.png'));
  await context.close();
});

test('mi perfil del productor', async ({ browser }) => {
  const context = await newScreenshotContext(browser, { storageState: PRODUCER_STATE });
  const page = await context.newPage();

  // /intranet/mi-perfil redirige a /intranet/perfil/:slug.
  await page.goto(ROUTES.myProfile);
  await page.waitForURL(/\/intranet\/perfil\//, { timeout: 30_000 });
  await expect(page.getByText(/Carlos/).first()).toBeVisible();
  await settle(page);
  await freezeUi(page);

  await saveViewportShot(page, path.join(DIRS.intranet, 'my-profile.png'));
  await context.close();
});
