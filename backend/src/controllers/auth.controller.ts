import type { RequestHandler } from 'express';
import {
  REFRESH_COOKIE_NAME,
  getRefreshCookieClearOptions,
  getRefreshCookieSetOptions,
} from '../config/authCookies.js';
import { loadEnv } from '../config/env.js';
import { AppError } from '../lib/errors.js';
import { authService } from '../services/auth.service.js';
import { loginSchema, logoutBodySchema, refreshBodySchema } from '../validations/auth.schema.js';

/**
 * Lee el refresh desde la cookie httpOnly (`maps_refresh`). El body solo se usa si
 * `env.allowRefreshBody` (desarrollo/test por defecto, o `ALLOW_REFRESH_BODY=true` en prod).
 */
function resolveRefreshToken(
  req: Parameters<RequestHandler>[0],
  allowBody: boolean,
): string | undefined {
  const fromCookie = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE_NAME];
  if (fromCookie) return fromCookie;
  if (!allowBody) return undefined;
  return (req.body as { refreshToken?: string }).refreshToken;
}

export const authController: Record<string, RequestHandler> = {
  login: async (req, res, next) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        data: null,
        message: 'Datos de entrada inválidos',
        error: parsed.error.flatten(),
      });
      return;
    }

    try {
      const env = loadEnv();
      const result = await authService.login(parsed.data.usuario, parsed.data.password);

      const decoded = JSON.parse(
        Buffer.from(result.refreshToken.split('.')[1], 'base64url').toString(),
      ) as { exp?: number };
      const maxAgeMs =
        decoded.exp !== undefined ? decoded.exp * 1000 - Date.now() : 30 * 24 * 60 * 60 * 1000;

      res.cookie(
        REFRESH_COOKIE_NAME,
        result.refreshToken,
        getRefreshCookieSetOptions(env, maxAgeMs),
      );

      res.json({
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
        message: 'OK',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },

  refresh: async (req, res, next) => {
    const bodyParsed = refreshBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({
        data: null,
        message: 'Datos de entrada inválidos',
        error: bodyParsed.error.flatten(),
      });
      return;
    }

    const env = loadEnv();
    const refreshToken = resolveRefreshToken(req, env.allowRefreshBody);
    if (!refreshToken) {
      const msg = env.allowRefreshBody
        ? 'Refresh token requerido'
        : 'Refresh token requerido (cookie httpOnly)';
      next(new AppError(401, msg));
      return;
    }

    try {
      const result = await authService.refresh(refreshToken);
      res.json({
        data: result,
        message: 'OK',
        error: null,
      });
    } catch (err) {
      if (err instanceof AppError && err.statusCode === 401) {
        res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions(env));
      }
      next(err);
    }
  },

  logout: async (req, res, next) => {
    const bodyParsed = logoutBodySchema.safeParse(req.body);
    if (!bodyParsed.success) {
      res.status(400).json({
        data: null,
        message: 'Datos de entrada inválidos',
        error: bodyParsed.error.flatten(),
      });
      return;
    }

    if (!req.user) {
      next(new AppError(401, 'No autenticado'));
      return;
    }

    const env = loadEnv();
    const refreshToken = resolveRefreshToken(req, env.allowRefreshBody);
    if (!refreshToken) {
      const msg = env.allowRefreshBody
        ? 'Refresh token requerido'
        : 'Refresh token requerido (cookie httpOnly)';
      next(new AppError(401, msg));
      return;
    }

    try {
      await authService.logout(req.user.sub, refreshToken);
      res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieClearOptions(env));
      res.json({
        data: null,
        message: 'Sesión cerrada',
        error: null,
      });
    } catch (err) {
      next(err);
    }
  },
};
