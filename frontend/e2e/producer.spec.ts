import { expect, test } from '@playwright/test';

test('perfil público del productor seed carga datos estables', async ({ page }) => {
  await page.goto('/productor/carlos-rodriguez');

  await expect(page.getByRole('heading', { name: 'Perfil no encontrado' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Carlos A. Rodríguez', level: 1 })).toBeVisible();
  await expect(page.getByText(/asesor verificado/i)).toBeVisible();
  await expect(page.getByText(/matrícula #78429/i)).toBeVisible();
});
