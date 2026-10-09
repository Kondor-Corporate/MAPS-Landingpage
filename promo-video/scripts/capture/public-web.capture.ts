/**
 * Screenshots de la Public Web (3840x2160):
 *   - hero.png             → Hero de la home
 *   - producer-profile.png → Perfil público de carlos-rodriguez
 *   - news.png             → Grilla de noticias públicas de la home
 */
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  DIRS,
  ROUTES,
  freezeUi,
  newScreenshotContext,
  saveViewportShot,
  settle,
} from './config';

test('hero público', async ({ browser }) => {
  const context = await newScreenshotContext(browser);
  const page = await context.newPage();

  await page.goto(ROUTES.home);
  await expect(
    page.getByRole('heading', { name: /El compromiso de asesorar está en nuestro ADN/i }),
  ).toBeVisible();
  await settle(page);
  await freezeUi(page);

  await saveViewportShot(page, path.join(DIRS.publicWeb, 'hero.png'));
  await context.close();
});

test('perfil público del productor', async ({ browser }) => {
  const context = await newScreenshotContext(browser);
  const page = await context.newPage();

  await page.goto(ROUTES.producerProfile);
  await expect(page.getByRole('link', { name: /Volver al mapa/i })).toBeVisible();
  await expect(page.getByText(/Carlos/).first()).toBeVisible();
  await settle(page);
  await freezeUi(page);

  await saveViewportShot(page, path.join(DIRS.publicWeb, 'producer-profile.png'));
  await context.close();
});

test('noticias públicas', async ({ browser }) => {
  const context = await newScreenshotContext(browser);
  const page = await context.newPage();

  await page.goto(ROUTES.home);
  const section = page.locator('#noticias');
  await section.scrollIntoViewIfNeeded();
  // Alinear la sección al tope del viewport para un encuadre estable.
  await section.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await settle(page, 500); // dejar disparar reveals por scroll antes de congelar
  await freezeUi(page);

  await saveViewportShot(page, path.join(DIRS.publicWeb, 'news.png'));
  await context.close();
});
