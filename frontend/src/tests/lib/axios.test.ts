import MockAdapter from 'axios-mock-adapter';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (window as any).location;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).location = stub;
  return replace;
}

describe('api — interceptor de request (axios-mock-adapter)', () => {
  let mock: MockAdapter;

  beforeEach(() => {
    localStorage.clear();
    useAuthStore.persist.clearStorage();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isInitialized: false,
      isAuthenticated: false,
    });
    mock = new MockAdapter(api);
  });

  afterEach(() => {
    mock.restore();
  });

  it('adjunta Authorization Bearer cuando hay accessToken', async () => {
    useAuthStore
      .getState()
      .login({ id: 1, usuario: 'a', rol: 'ADMIN' }, 'mi-jwt');

    mock.onGet('/ping').reply(200, { ok: true });

    await api.get('/ping');

    expect(mock.history.get[0]?.headers?.Authorization).toBe('Bearer mi-jwt');
  });

  it('no envía Authorization si no hay token', async () => {
    mock.onGet('/ping').reply(200, { ok: true });

    await api.get('/ping');

    expect(mock.history.get[0]?.headers?.Authorization).toBeUndefined();
  });
});

describe('api — interceptor de response (MSW)', () => {
  const realLocation = window.location;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
    window.location = realLocation;
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
    window.location = realLocation;
  });

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
      .login({ id: 1, usuario: 'a', rol: 'ADMIN' }, 'viejo');

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
      .login({ id: 1, usuario: 'a', rol: 'ADMIN' }, 'tok');

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

  it('401 en /auth/refresh no reintenta refresh: logout directo', async () => {
    const replace = installMockLocation();

    server.use(
      http.post(`${API_BASE}/auth/refresh`, () =>
        new HttpResponse(null, { status: 401 }),
      ),
    );

    useAuthStore
      .getState()
      .login({ id: 1, usuario: 'a', rol: 'ADMIN' }, 'x');

    await expect(api.post('/auth/refresh', {})).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(replace).toHaveBeenCalledWith('/login');
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
      .login({ id: 1, usuario: 'a', rol: 'ADMIN' }, 't');

    await expect(api.get('/foo')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(hits).toBe(2);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(replace).toHaveBeenCalledWith('/login');
  });
});
