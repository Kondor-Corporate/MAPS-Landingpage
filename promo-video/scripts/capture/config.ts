/**
 * Configuración compartida de las capturas de la app MAPS para el video promo.
 *
 * IMPORTANTE: este archivo NO importa nada desde ../frontend ni ../backend.
 * Todas las rutas, selectores y constantes que necesitan las capturas viven
 * acá dentro, para que promo-video funcione como proyecto independiente.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Browser, BrowserContext, Page } from '@playwright/test';

/** Raíz de promo-video. Los scripts npm siempre corren desde este directorio. */
export const PROMO_ROOT = process.cwd();

/** Base de la app real. Overridable por si el dev server corre en otro host/puerto. */
export const BASE_URL = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:5173';

/** Encuadre objetivo del video. */
export const VIEWPORT = { width: 1920, height: 1080 } as const;

/** Screenshots a 2x → 3840x2160, headroom para zoom/pan en Remotion sin perder calidad. */
export const SCREENSHOT_DSF = 2;
/** Grabaciones a 1x → webm limpio de 1920x1080. */
export const VIDEO_DSF = 1;

export const LOCALE = 'es-AR';
export const TIMEZONE = 'America/Argentina/Buenos_Aires';

/**
 * Credenciales del productor seed. Opcionalmente por variable de entorno; el
 * fallback son las credenciales de desarrollo (seed) ya existentes en el repo.
 * No se persisten en ningún archivo: viven solo como default en código.
 */
export const CREDENTIALS = {
  user: process.env.CAPTURE_PRODUCER_USER ?? 'user',
  pass: process.env.CAPTURE_PRODUCER_PASS ?? 'User1234!',
} as const;

/** Productor usado para perfil público, mapa y Mi Perfil. */
export const PRODUCER_SLUG = 'carlos-rodriguez';
export const PRODUCER_DISPLAY_NAME = 'Carlos A. Rodríguez';

/** Rutas reales de la app (definidas acá, no importadas del frontend). */
export const ROUTES = {
  home: '/',
  login: '/login',
  producerProfile: `/productor/${PRODUCER_SLUG}`,
  news: '/noticias',
  dashboard: '/intranet/dashboard',
  library: '/intranet/biblioteca',
  intranetNews: '/intranet/noticias',
  myProfile: '/intranet/mi-perfil',
} as const;

/** Carpetas de salida dentro de promo-video/public. */
export const DIRS = {
  publicWeb: path.join(PROMO_ROOT, 'public', 'screenshots', 'public-web'),
  intranet: path.join(PROMO_ROOT, 'public', 'screenshots', 'intranet'),
  recordings: path.join(PROMO_ROOT, 'public', 'recordings'),
  auth: path.join(PROMO_ROOT, '.auth'),
  /** Temporal para el .webm crudo de Playwright, fuera del repo. */
  videoTmp: path.join(os.tmpdir(), 'maps-capture-video'),
} as const;

/** Sesión autenticada del productor. SIEMPRE ignorada por Git. */
export const PRODUCER_STATE = path.join(DIRS.auth, 'producer.json');

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

const baseContextOptions = {
  baseURL: BASE_URL,
  viewport: VIEWPORT,
  locale: LOCALE,
  timezoneId: TIMEZONE,
} as const;

/** Contexto para screenshots (2x). Opcionalmente autenticado vía storageState. */
export function newScreenshotContext(
  browser: Browser,
  opts?: { storageState?: string },
): Promise<BrowserContext> {
  return browser.newContext({
    ...baseContextOptions,
    deviceScaleFactor: SCREENSHOT_DSF,
    storageState: opts?.storageState,
  });
}

/** Contexto para grabaciones (1x + recordVideo 1920x1080). */
export function newVideoContext(
  browser: Browser,
  opts?: { storageState?: string },
): Promise<BrowserContext> {
  ensureDir(DIRS.videoTmp);
  return browser.newContext({
    ...baseContextOptions,
    deviceScaleFactor: VIDEO_DSF,
    storageState: opts?.storageState,
    recordVideo: { dir: DIRS.videoTmp, size: { ...VIEWPORT } },
  });
}

/**
 * Espera de carga acotada: 'load' + un pequeño margen. Evitamos 'networkidle'
 * a propósito porque el mapa (maplibre) mantiene requests de tiles abiertos y
 * nunca llegaría a idle.
 */
export async function settle(page: Page, extraMs = 300): Promise<void> {
  await page.waitForLoadState('load');
  await page.waitForTimeout(extraMs);
}

/** Congela animaciones/transiciones y oculta el caret para stills consistentes. */
export async function freezeUi(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `*,*::before,*::after{
      animation-duration:0s!important;
      animation-delay:0s!important;
      transition-duration:0s!important;
      transition-delay:0s!important;
      caret-color:transparent!important;
      scroll-behavior:auto!important;
    }`,
  });
}

/** Screenshot del viewport (1920x1080 lógico → 3840x2160 físico a 2x). */
export async function saveViewportShot(page: Page, dest: string): Promise<void> {
  ensureDir(path.dirname(dest));
  await page.screenshot({ path: dest, animations: 'disabled', scale: 'device' });
}

/**
 * Cierra el contexto y guarda el video con nombre determinista en `dest`,
 * eliminando el archivo temporal de nombre aleatorio.
 */
export async function finishVideo(
  page: Page,
  context: BrowserContext,
  dest: string,
): Promise<void> {
  const video = page.video();
  await context.close();
  if (!video) {
    throw new Error('El contexto no grabó video (recordVideo no configurado).');
  }
  ensureDir(path.dirname(dest));
  await video.saveAs(dest);
  await video.delete().catch(() => {});
}
