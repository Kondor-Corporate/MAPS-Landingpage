import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProtectedRoutes } from '@/router/ProtectedRoutes';
import { PublicRoutes } from '@/router/PublicRoutes';
import { RoleGuard } from '@/router/RoleGuard';
import { useAuthStore, type AuthUser } from '@/store/authStore';
import { resetAuthStore } from '@/tests/helpers/resetAuthStore';
import { API_BASE, refreshErrorHandler, refreshSuccessHandler, server } from '@/tests/mocks/server';

const ADMIN_USER: AuthUser = { id: 1, usuario: 'admin', rol: 'ADMIN', slug: null };

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function renderProtected(initialPath = '/admin') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/admin" element={<ProtectedRoutes />}>
          <Route index element={<div data-testid="inside">Dentro</div>} />
        </Route>
        <Route path="/login" element={<div>Pantalla login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function seedPersistedUserWithoutToken(user: AuthUser = ADMIN_USER) {
  resetAuthStore({
    user,
    accessToken: null,
    isAuthenticated: false,
    isInitialized: true,
  });
}

describe('ProtectedRoutes', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it('no inicializado: no renderiza contenido', () => {
    const { container } = renderProtected();

    expect(container.firstChild).toBeNull();
  });

  it('inicializado y no autenticado: redirige a login', () => {
    resetAuthStore({ isInitialized: true });

    renderProtected();

    expect(screen.getByText('Pantalla login')).toBeInTheDocument();
  });

  it('autenticado: renderiza rutas hijas', () => {
    resetAuthStore({
      isInitialized: true,
      isAuthenticated: true,
      user: ADMIN_USER,
      accessToken: 't',
    });

    renderProtected();

    expect(screen.getByTestId('inside')).toHaveTextContent('Dentro');
  });

  it('restore pendiente: no muestra outlet ni login', async () => {
    const response = deferred<ReturnType<typeof HttpResponse.json>>();
    server.use(http.post(`${API_BASE}/auth/refresh`, async () => response.promise));
    seedPersistedUserWithoutToken();

    renderProtected();

    expect(screen.queryByTestId('inside')).not.toBeInTheDocument();
    expect(screen.queryByText('Pantalla login')).not.toBeInTheDocument();

    response.resolve(
      HttpResponse.json({
        data: { accessToken: 'access-restaurado', user: ADMIN_USER },
        message: 'OK',
        error: null,
      }),
    );
    expect(await screen.findByTestId('inside')).toBeInTheDocument();
  });

  it('restore exitoso: autentica y muestra outlet', async () => {
    server.use(refreshSuccessHandler('access-restaurado', ADMIN_USER));
    seedPersistedUserWithoutToken();

    renderProtected();

    expect(await screen.findByTestId('inside')).toBeInTheDocument();
    expect(useAuthStore.getState()).toMatchObject({
      user: ADMIN_USER,
      accessToken: 'access-restaurado',
      isAuthenticated: true,
    });
  });

  it('restore inválido 401: logout y redirige a login', async () => {
    server.use(refreshErrorHandler(401));
    seedPersistedUserWithoutToken();

    renderProtected();

    expect(await screen.findByText('Pantalla login')).toBeInTheDocument();
    expect(screen.queryByTestId('inside')).not.toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('restore con error de red: no hace logout y redirige a login', async () => {
    server.use(http.post(`${API_BASE}/auth/refresh`, () => HttpResponse.error()));
    seedPersistedUserWithoutToken();

    renderProtected();

    expect(await screen.findByText('Pantalla login')).toBeInTheDocument();
    expect(screen.queryByTestId('inside')).not.toBeInTheDocument();
    expect(useAuthStore.getState().user).toEqual(ADMIN_USER);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});

describe('PublicRoutes', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it('no inicializado: no renderiza outlet ni redirige', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<PublicRoutes />}>
            <Route index element={<div>Pantalla login</div>} />
          </Route>
          <Route path="/intranet/dashboard" element={<div>Intranet dashboard</div>} />
          <Route path="/admin/dashboard" element={<div>Admin dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Pantalla login')).not.toBeInTheDocument();
    expect(screen.queryByText('Intranet dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Admin dashboard')).not.toBeInTheDocument();
  });

  it('anónimo inicializado: muestra el outlet', () => {
    resetAuthStore({ isInitialized: true });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<PublicRoutes />}>
            <Route index element={<div>Pantalla login</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Pantalla login')).toBeInTheDocument();
  });

  it('PRODUCTOR autenticado: redirige a intranet', () => {
    resetAuthStore({
      isInitialized: true,
      isAuthenticated: true,
      user: { id: 1, usuario: 'p', rol: 'PRODUCTOR', slug: 'productor-prueba' },
      accessToken: 't',
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<PublicRoutes />}>
            <Route index element={<div>Pantalla login</div>} />
          </Route>
          <Route path="/intranet/dashboard" element={<div>Intranet dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Intranet dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla login')).not.toBeInTheDocument();
  });

  it('ADMIN autenticado: redirige a admin', () => {
    resetAuthStore({
      isInitialized: true,
      isAuthenticated: true,
      user: { id: 1, usuario: 'admin', rol: 'ADMIN', slug: null },
      accessToken: 't',
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<PublicRoutes />}>
            <Route index element={<div>Pantalla login</div>} />
          </Route>
          <Route path="/admin/dashboard" element={<div>Admin dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla login')).not.toBeInTheDocument();
  });

  it('SUPERADMIN autenticado: redirige a admin', () => {
    resetAuthStore({
      isInitialized: true,
      isAuthenticated: true,
      user: { id: 1, usuario: 'super', rol: 'SUPERADMIN', slug: null },
      accessToken: 't',
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<PublicRoutes />}>
            <Route index element={<div>Pantalla login</div>} />
          </Route>
          <Route path="/admin/dashboard" element={<div>Admin dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Admin dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Pantalla login')).not.toBeInTheDocument();
  });
});

describe('RoleGuard', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it('no inicializado: null', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/x']}>
        <Routes>
          <Route path="/x" element={<RoleGuard allowedRoles={['ADMIN']} />}>
            <Route index element={<div>Secreto</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('sin usuario: redirige a login', () => {
    resetAuthStore({ isInitialized: true });

    render(
      <MemoryRouter initialEntries={['/x']}>
        <Routes>
          <Route path="/x" element={<RoleGuard allowedRoles={['ADMIN']} />}>
            <Route index element={<div>Secreto</div>} />
          </Route>
          <Route path="/login" element={<div>Pantalla login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Pantalla login')).toBeInTheDocument();
  });

  it('rol no permitido: redirige a unauthorized', () => {
    resetAuthStore({
      isInitialized: true,
      user: { id: 1, usuario: 'p', rol: 'PRODUCTOR', slug: 'productor-prueba' },
      accessToken: 't',
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/x']}>
        <Routes>
          <Route path="/x" element={<RoleGuard allowedRoles={['ADMIN']} />}>
            <Route index element={<div>Secreto</div>} />
          </Route>
          <Route path="/unauthorized" element={<div>Sin permiso</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Sin permiso')).toBeInTheDocument();
  });

  it('ADMIN no obtiene permisos exclusivos de SUPERADMIN', () => {
    resetAuthStore({
      isInitialized: true,
      user: { id: 1, usuario: 'admin', rol: 'ADMIN', slug: null },
      accessToken: 't',
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin/admins']}>
        <Routes>
          <Route path="/admin/admins" element={<RoleGuard allowedRoles={['SUPERADMIN']} />}>
            <Route index element={<div>Administradores</div>} />
          </Route>
          <Route path="/unauthorized" element={<div>Sin permiso</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Sin permiso')).toBeInTheDocument();
    expect(screen.queryByText('Administradores')).not.toBeInTheDocument();
  });

  it('SUPERADMIN entra al guard exclusivo', () => {
    resetAuthStore({
      isInitialized: true,
      user: { id: 1, usuario: 'super', rol: 'SUPERADMIN', slug: null },
      accessToken: 't',
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin/admins']}>
        <Routes>
          <Route path="/admin/admins" element={<RoleGuard allowedRoles={['SUPERADMIN']} />}>
            <Route index element={<div>Administradores</div>} />
          </Route>
          <Route path="/unauthorized" element={<div>Sin permiso</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Administradores')).toBeInTheDocument();
    expect(screen.queryByText('Sin permiso')).not.toBeInTheDocument();
  });

  it('SUPERADMIN entra a rutas normales de admin', () => {
    resetAuthStore({
      isInitialized: true,
      user: { id: 1, usuario: 'super', rol: 'SUPERADMIN', slug: null },
      accessToken: 't',
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <Routes>
          <Route
            path="/admin/dashboard"
            element={<RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']} />}
          >
            <Route index element={<div>Panel admin</div>} />
          </Route>
          <Route path="/unauthorized" element={<div>Sin permiso</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Panel admin')).toBeInTheDocument();
    expect(screen.queryByText('Sin permiso')).not.toBeInTheDocument();
  });

  it('PRODUCTOR entra a su guard de intranet', () => {
    resetAuthStore({
      isInitialized: true,
      user: { id: 1, usuario: 'p', rol: 'PRODUCTOR', slug: 'productor-prueba' },
      accessToken: 't',
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/intranet/dashboard']}>
        <Routes>
          <Route path="/intranet/dashboard" element={<RoleGuard allowedRoles={['PRODUCTOR']} />}>
            <Route index element={<div>Intranet</div>} />
          </Route>
          <Route path="/unauthorized" element={<div>Sin permiso</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Intranet')).toBeInTheDocument();
    expect(screen.queryByText('Sin permiso')).not.toBeInTheDocument();
  });

  it('rol permitido: muestra hijo', () => {
    resetAuthStore({
      isInitialized: true,
      user: { id: 1, usuario: 'a', rol: 'ADMIN', slug: null },
      accessToken: 't',
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/x']}>
        <Routes>
          <Route path="/x" element={<RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']} />}>
            <Route index element={<div data-testid="ok">Panel admin</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('ok')).toHaveTextContent('Panel admin');
  });
});
