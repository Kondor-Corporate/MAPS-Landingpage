/**
 * Grabación del mapa de asesores (1920x1080 webm) → public/recordings/map-search.webm
 *
 * Secuencia: cargar home → mapa → búsqueda por ciudad (flyTo) → popup del productor.
 * La búsqueda usa un geocoder externo, así que es best-effort; el clic sobre el
 * marcador de carlos-rodriguez garantiza el popup aunque el geocode falle.
 * No requiere autenticación (mapa público).
 */
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  DIRS,
  PRODUCER_DISPLAY_NAME,
  ROUTES,
  finishVideo,
  newVideoContext,
} from './config';

test('grabación mapa de asesores', async ({ browser }) => {
  const context = await newVideoContext(browser);
  const page = await context.newPage();

  await page.goto(ROUTES.home);
  await page.locator('#mapa').scrollIntoViewIfNeeded();

  // Esperar a que carguen los marcadores de productores.
  const anyMarker = page.getByRole('button', { name: /Ver asesor/i }).first();
  await expect(anyMarker).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1200); // encuadre inicial estable

  // Búsqueda por ciudad (best-effort: depende del geocoder externo).
  await page.getByPlaceholder(/Ingresá tu ciudad/i).fill('La Plata');
  await page.getByRole('button', { name: /^Buscar$/i }).click();
  await page.waitForTimeout(3000); // dejar correr el flyTo / apertura de popup

  // Asegurar el popup del productor de referencia.
  const carlosMarker = page.getByRole('button', {
    name: new RegExp(`Ver asesor ${PRODUCER_DISPLAY_NAME}`, 'i'),
  });
  await carlosMarker.click().catch(() => {});
  await page.waitForTimeout(2500); // mantener el popup en cámara

  await finishVideo(page, context, path.join(DIRS.recordings, 'map-search.webm'));
});
