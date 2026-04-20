import type { CookieOptions } from 'express';
import type { Env } from './env.js';

/** Nombre de la cookie httpOnly que guarda el JWT de refresh. */
export const REFRESH_COOKIE_NAME = 'maps_refresh';

/** Opciones para `res.cookie()` al setear el refresh token. `maxAge` en milisegundos. */
export function getRefreshCookieSetOptions(env: Env, maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeMs,
  };
}

/** Opciones para `res.clearCookie()`. Deben coincidir con las de set para que el navegador la elimine. */
export function getRefreshCookieClearOptions(env: Env): CookieOptions {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  };
}
