import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { API_BASE_URL } from '@/lib/apiConfig';

export const API_BASE = /^https?:\/\//.test(API_BASE_URL)
  ? API_BASE_URL
  : `*${API_BASE_URL}`;

/**
 * Handlers por defecto para LoginPage y pruebas que necesitan API mínimo.
 * Sobrescribir con `server.use(...)` en tests específicos.
 */
export const defaultHandlers = [
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as {
      usuario?: string;
      password?: string;
    };

    if (body.password === 'wrong') {
      return HttpResponse.json(
        { data: null, message: 'Credenciales inválidas', error: null },
        { status: 401 },
      );
    }

    if (body.usuario === 'producer') {
      return HttpResponse.json({
        data: {
          accessToken: 'token-productor',
          user: { id: 1, usuario: 'producer', rol: 'PRODUCTOR', slug: 'producer' },
        },
        message: 'OK',
        error: null,
      });
    }

    return HttpResponse.json({
      data: {
        accessToken: 'token-admin',
        user: { id: 2, usuario: 'admin', rol: 'ADMIN', slug: null },
      },
      message: 'OK',
      error: null,
    });
  }),

  http.post(`${API_BASE}/auth/refresh`, () =>
    HttpResponse.json({
      data: { accessToken: 'refreshed-token' },
      message: 'OK',
      error: null,
    }),
  ),
];

export const server = setupServer(...defaultHandlers);
