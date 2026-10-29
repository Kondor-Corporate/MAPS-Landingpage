import { expect, test } from '@playwright/test';

test('home pública muestra marca, navegación y hero', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('link', { name: /mapsasesores/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inicio' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Noticias' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mapa de Asesores' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Acceso Productores' }).first()).toBeVisible();

  await expect(
    page.getByRole('heading', { name: /el compromiso de asesorar está en nuestro adn/i }),
  ).toBeVisible();
});
