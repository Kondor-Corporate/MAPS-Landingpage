import { expect, type Page } from '@playwright/test';

export const SEED_ADMIN = { usuario: 'admin', password: 'Admin1234!' } as const;
export const SEED_PRODUCER = { usuario: 'user', password: 'User1234!' } as const;

export async function openLogin(page: Page) {
  await page.goto('/login');
  await expect(page.getByLabel(/email o usuario/i)).toBeVisible();
  await expect(page.getByLabel(/^contraseña$/i)).toBeVisible();
}

export async function loginAs(page: Page, usuario: string, password: string) {
  await openLogin(page);
  await page.getByLabel(/email o usuario/i).fill(usuario);
  await page.getByLabel(/^contraseña$/i).fill(password);
  await page.getByRole('button', { name: /ingresar al portal/i }).click();
}
