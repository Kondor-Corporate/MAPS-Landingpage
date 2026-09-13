import { expect, test } from '@playwright/test';

const SEED_NEWS_TITLE = 'MAPS expande cobertura territorial al sur';
const SEED_NEWS_PATH = '/noticias/maps-expande-cobertura-sur';

test('noticias: listado público y detalle seed por slug', async ({ page }) => {
  await page.goto('/noticias');

  await expect(page.getByRole('heading', { name: 'Noticias', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /vista previa de noticia:/i }).first()).toBeVisible();

  await page.goto(SEED_NEWS_PATH);

  await expect(page).toHaveURL(SEED_NEWS_PATH);
  await expect(page.getByRole('heading', { name: 'Noticia no encontrada' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: SEED_NEWS_TITLE, level: 1 })).toBeVisible();
});
