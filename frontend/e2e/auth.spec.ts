import { expect, test } from '@playwright/test';
import { loginAs, SEED_ADMIN, SEED_PRODUCER } from './helpers/auth';

test('anónimo en /admin/dashboard termina en login', async ({ page }) => {
  await page.goto('/admin/dashboard');

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel(/email o usuario/i)).toBeVisible();
  await expect(page.getByLabel(/^contraseña$/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /ingresar al portal/i })).toBeVisible();
});

test('ADMIN seed entra al dashboard admin', async ({ page }) => {
  await loginAs(page, SEED_ADMIN.usuario, SEED_ADMIN.password);

  await expect(page).toHaveURL(/\/admin\/dashboard$/);
  await expect(page.getByRole('heading', { name: /hola, admin/i })).toBeVisible();
});

test('PRODUCTOR seed entra a intranet y el logout deja privado inaccesible', async ({ page }) => {
  await loginAs(page, SEED_PRODUCER.usuario, SEED_PRODUCER.password);

  await expect(page).toHaveURL(/\/intranet\/dashboard$/);
  await expect(page.getByRole('heading', { name: /hola, productor/i })).toBeVisible();

  await page.getByRole('button', { name: /cerrar sesión/i }).click();

  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel(/email o usuario/i)).toBeVisible();

  await page.goto('/intranet/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});
