/**
 * Grabación login → dashboard (1920x1080 webm) → public/recordings/login-dashboard.webm
 *
 * Contexto LIMPIO / deslogueado a propósito: necesitamos capturar visualmente
 * /login → tipeo de usuario → tipeo de contraseña → submit → transición real al
 * dashboard. NO usa el storageState del productor.
 */
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  CREDENTIALS,
  DIRS,
  ROUTES,
  finishVideo,
  newVideoContext,
} from './config';

test('grabación login a dashboard', async ({ browser }) => {
  const context = await newVideoContext(browser); // sin storageState → deslogueado
  const page = await context.newPage();

  await page.goto(ROUTES.login);
  const userField = page.getByLabel(/email o usuario/i);
  await expect(userField).toBeVisible();
  await page.waitForTimeout(800); // arranque en blanco antes de tipear

  // Tipeo visible para que la grabación muestre el ingreso.
  await userField.click();
  await userField.pressSequentially(CREDENTIALS.user, { delay: 90 });
  const passField = page.getByLabel(/^contraseña$/i);
  await passField.click();
  await passField.pressSequentially(CREDENTIALS.pass, { delay: 90 });
  await page.waitForTimeout(600);

  await page.getByRole('button', { name: /ingresar al portal/i }).click();

  // Transición real al dashboard autenticado.
  await page.waitForURL(/\/intranet\//, { timeout: 30_000 }).catch(() => {});
  await expect(page.getByText(/Acceso al Portal SELF/i)).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2000); // mantener el dashboard en cámara

  await finishVideo(page, context, path.join(DIRS.recordings, 'login-dashboard.webm'));
});
