import { http, HttpResponse } from 'msw';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/authStore';
import { API_BASE, server } from '@/tests/mocks/server';

/** jsdom marca `location.replace` como no escribible; reemplazamos `window.location` en tests que lo necesitan. */
function installMockLocation() {
  const replace = vi.fn();
  const stub = {
    href: 'http://localhost/',
    replace,
    assign: vi.fn(),
    reload: vi.fn(),
  };
  Object.defineProperty(window, 'location', { configurable: true, value: stub });
  return replace;
}

const realLocation = window.location;

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterAll(() => {
  server.close();
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

beforeEach(() => {
  localStorage.clear();
  useAuthStore.persist.clearStorage();
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isInitialized: false,
    isAuthenticated: false,
  });
  server.resetHandlers();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation });
});

describe('api — interceptor de request (MSW)', () => {

  it('adjunta Authorization Bearer cuando hay accessToken', async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${API_BASE}/ping`, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    useAuthStore
      .getState()
      .login({ id: 1, usuario: 'a', rol: 'ADMIN', slug: null }, 'mi-jwt');

    await api.get('/ping');

    expect(authorization).toBe('Bearer mi-jwt');
  });

  it('no envía Authorization si no hay token', async () => {
    let authorization: string | null = null;
    server.use(
      http.get(`${API_BASE}/ping`, ({ request }) => {
        authorization = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await api.get('/ping');

    expect(authorization).toBeNull();
  });
});

describe('api — interceptor de response (MSW)', () => {
  it('401: refresca token y reintenta la petición', async () => {
    let hits = 0;
    server.use(
      http.get(`${API_BASE}/foo`, () => {
        hits += 1;
        if (hits === 1) {
          return new HttpResponse(null, { status: 401 });
        }
        return HttpResponse.json({
          data: { ok: true },
          message: 'OK',
          error: null,
        });
      }),
      http.post(`${API_BASE}/auth/refresh`, () =>
        HttpResponse.json({
          data: { accessToken: 'nuevo-access' },
          message: 'OK',
          error: null,
        }),
      ),
    );

    useAuthStore
      .getState()
      .login({ id: 1, usuario: 'a', rol: 'ADMIN', slug: null }, 'viejo');

    const res = await api.get('/foo');

    expect(res.data.data).toEqual({ ok: true });
    expect(useAuthStore.getState().accessToken).toBe('nuevo-access');
    expect(hits).toBe(2);
  });

  it('refresh falla: logout y location.replace a /login', async () => {
    const replace = installMockLocation();

    server.use(
      http.get(`${API_BASE}/foo`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API_BASE}/auth/refresh`, () =>
        new HttpResponse(null, { status: 401 }),
      ),
    );

    useAuthStore
      .getState()
      .login({ id: 1, usuario: 'a', rol: 'ADMIN', slug: null }, 'tok');

    await expect(api.get('/foo')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('401 en /auth/login no intenta refresh ni redirige a /login', async () => {
    const replace = installMockLocation();

    server.use(
      http.post(`${API_BASE}/auth/login`, () =>
        HttpResponse.json(
          { data: null, message: 'Credenciales inválidas', error: null },
          { status: 401 },
        ),
      ),
    );

    await expect(
      api.post('/auth/login', { usuario: 'admin', password: 'wrong' }),
    ).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(replace).not.toHaveBeenCalled();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('401 en /auth/refresh no inicia otro refresh ni redirige por sí solo', async () => {
    const replace = installMockLocation();

    server.use(
      http.post(`${API_BASE}/auth/refresh`, () =>
        new HttpResponse(null, { status: 401 }),
      ),
    );

    useAuthStore
      .getState()
      .login({ id: 1, usuario: 'a', rol: 'ADMIN', slug: null }, 'x');

    await expect(api.post('/auth/refresh', {})).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });

  it('reintento con _retry sigue en 401: logout sin bucle de refresh', async () => {
    const replace = installMockLocation();

    let hits = 0;
    server.use(
      http.get(`${API_BASE}/foo`, () => {
        hits += 1;
        return new HttpResponse(null, { status: 401 });
      }),
      http.post(`${API_BASE}/auth/refresh`, () =>
        HttpResponse.json({
          data: { accessToken: 'otro' },
          message: 'OK',
          error: null,
        }),
      ),
    );

    useAuthStore
      .getState()
      .login({ id: 1, usuario: 'a', rol: 'ADMIN', slug: null }, 't');

    await expect(api.get('/foo')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(hits).toBe(2);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(replace).toHaveBeenCalledWith('/login');
  });

  it('400 funcional no refresca ni cierra la sesión', async () => {
    const replace = installMockLocation();
    let refreshHits = 0;
    server.use(
      http.post(`${API_BASE}/functional`, () =>
        HttpResponse.json(
          { data: null, message: 'Dato inválido', error: null },
          { status: 400 },
        ),
      ),
      http.post(`${API_BASE}/auth/refresh`, () => {
        refreshHits += 1;
        return new HttpResponse(null, { status: 401 });
      }),
    );
    useAuthStore
      .getState()
      .login({ id: 1, usuario: 'a', rol: 'ADMIN', slug: null }, 'tok');

    await expect(api.post('/functional', {})).rejects.toMatchObject({
      response: { status: 400 },
    });

    expect(refreshHits).toBe(0);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });

  it('un error de red durante refresh conserva la sesión y no redirige', async () => {
    const replace = installMockLocation();
    server.use(
      http.get(`${API_BASE}/offline`, () => new HttpResponse(null, { status: 401 })),
      http.post(`${API_BASE}/auth/refresh`, () => HttpResponse.error()),
    );
    useAuthStore
      .getState()
      .login({ id: 1, usuario: 'a', rol: 'ADMIN', slug: null }, 'tok');

    await expect(api.get('/offline')).rejects.toBeTruthy();

    expect(useAuthStore.getState().user).not.toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(replace).not.toHaveBeenCalled();
  });

  it('401 concurrentes comparten un único refresh', async () => {
    let refreshHits = 0;
    const resourceHits = new Map<string, number>();
    server.use(
      http.get(`${API_BASE}/concurrent/:id`, ({ params }) => {
        const id = String(params.id);
        const hits = (resourceHits.get(id) ?? 0) + 1;
        resourceHits.set(id, hits);
        return hits === 1
          ? new HttpResponse(null, { status: 401 })
          : HttpResponse.json({ data: { id }, message: 'OK', error: null });
      }),
      http.post(`${API_BASE}/auth/refresh`, async () => {
        refreshHits += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return HttpResponse.json({
          data: {
            accessToken: 'shared-token',
            user: { id: 1, usuario: 'a', rol: 'ADMIN', slug: null },
          },
          message: 'OK',
          error: null,
        });
      }),
    );
    useAuthStore
      .getState()
      .login({ id: 1, usuario: 'a', rol: 'ADMIN', slug: null }, 'old');

    await Promise.all([api.get('/concurrent/1'), api.get('/concurrent/2')]);

    expect(refreshHits).toBe(1);
    expect(useAuthStore.getState().accessToken).toBe('shared-token');
  });
});
