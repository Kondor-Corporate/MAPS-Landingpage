import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL } from '@/lib/apiConfig';
import type { AuthUser } from '@/store/authStore';

export const API_BASE = /^https?:\/\//.test(API_BASE_URL) ? API_BASE_URL : `*${API_BASE_URL}`;

export const server = setupServer();

type LoginUser = {
  id: number;
  usuario: string;
  rol: AuthUser['rol'];
  slug: string | null;
};

export function loginSuccessHandler(user: LoginUser, accessToken: string) {
  return http.post(`${API_BASE}/auth/login`, () =>
    HttpResponse.json({
      data: { accessToken, user },
      message: 'OK',
      error: null,
    }),
  );
}

export function loginErrorHandler(
  status: number,
  body: { data: null; message: string; error: unknown } = {
    data: null,
    message: 'Credenciales inválidas',
    error: null,
  },
) {
  return http.post(`${API_BASE}/auth/login`, () => HttpResponse.json(body, { status }));
}

export function refreshSuccessHandler(accessToken: string, user?: AuthUser) {
  return http.post(`${API_BASE}/auth/refresh`, () =>
    HttpResponse.json({
      data: user ? { accessToken, user } : { accessToken },
      message: 'OK',
      error: null,
    }),
  );
}

export function refreshErrorHandler(status: 400 | 401 | 403) {
  return http.post(`${API_BASE}/auth/refresh`, () => new HttpResponse(null, { status }));
}
