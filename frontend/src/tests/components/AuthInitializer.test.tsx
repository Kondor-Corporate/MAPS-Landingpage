import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthInitializer } from '@/components/AuthInitializer';
import { refreshAccessToken } from '@/lib/axios';
import { ProtectedRoutes } from '@/router/ProtectedRoutes';
import { useAuthStore, type Rol } from '@/store/authStore';
import { resetAuthStore } from '@/tests/helpers/resetAuthStore';

vi.mock('@/lib/axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/axios')>();
  return { ...actual, refreshAccessToken: vi.fn() };
});

const refreshMock = vi.mocked(refreshAccessToken);

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe('AuthInitializer — reload y recuperación', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
    refreshMock.mockReset();
    resetAuthStore();
  });

  it.each<Rol>(['ADMIN', 'SUPERADMIN', 'PRODUCTOR'])(
    'restaura la sesión al recargar como %s',
    async (rol) => {
      window.history.replaceState({}, '', '/admin/dashboard');
      const user = {
        id: 1,
        usuario: rol.toLowerCase(),
        rol,
        slug: rol === 'PRODUCTOR' ? 'productor-prueba' : null,
      };
      useAuthStore.setState({ user });
      refreshMock.mockImplementation(async () => {
        useAuthStore.getState().login(user, 'access-renovado');
        return 'access-renovado';
      });

      render(
        <AuthInitializer>
          <p>Ruta protegida</p>
        </AuthInitializer>,
      );

      expect(await screen.findByText('Ruta protegida')).toBeInTheDocument();
      expect(useAuthStore.getState()).toMatchObject({
        user,
        accessToken: 'access-renovado',
        isAuthenticated: true,
      });
    },
  );

  it('mantiene loading y no ejecuta guards mientras el retry sigue pendiente', async () => {
    window.history.replaceState({}, '', '/admin/dashboard');
    const userEventInstance = userEvent.setup();
    const user = { id: 1, usuario: 'admin', rol: 'ADMIN' as const, slug: null };
    const retry = deferred<string>();
    const protectedRouteRender = vi.fn();
    useAuthStore.setState({ user });
    refreshMock
      .mockRejectedValueOnce({ isAxiosError: true, message: 'Network Error' })
      .mockImplementationOnce(() =>
        retry.promise.then((token) => {
          useAuthStore.getState().login(user, token);
          return token;
        }),
      );

    function ProtectedProbe() {
      protectedRouteRender();
      return <p>Ruta protegida</p>;
    }

    render(
      <AuthInitializer>
        <MemoryRouter initialEntries={['/admin/dashboard']}>
          <Routes>
            <Route element={<ProtectedRoutes />}>
              <Route path="/admin/dashboard" element={<ProtectedProbe />} />
            </Route>
            <Route path="/login" element={<p>Pantalla de login</p>} />
          </Routes>
        </MemoryRouter>
      </AuthInitializer>,
    );

    expect(await screen.findByText('No se pudo verificar la sesión')).toBeInTheDocument();
    expect(useAuthStore.getState().user).toEqual(user);

    await userEventInstance.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(screen.getByText('Cargando sesión…')).toBeInTheDocument();
    expect(screen.queryByText('Ruta protegida')).not.toBeInTheDocument();
    expect(screen.queryByText('Pantalla de login')).not.toBeInTheDocument();
    expect(protectedRouteRender).not.toHaveBeenCalled();

    retry.resolve('access-recuperado');

    expect(await screen.findByText('Ruta protegida')).toBeInTheDocument();
    expect(protectedRouteRender).toHaveBeenCalledOnce();
  });

  it('limpia una sesión cuyo refresh fue rechazado', async () => {
    useAuthStore.setState({
      user: { id: 1, usuario: 'admin', rol: 'ADMIN', slug: null },
    });
    refreshMock.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    render(
      <AuthInitializer>
        <p>Aplicación inicializada</p>
      </AuthInitializer>,
    );

    expect(await screen.findByText('Aplicación inicializada')).toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('en ruta privada un refresh 401 cierra la sesión sin pantalla de red', async () => {
    window.history.replaceState({}, '', '/admin/dashboard');
    useAuthStore.setState({
      user: { id: 1, usuario: 'admin', rol: 'ADMIN', slug: null },
    });
    refreshMock.mockRejectedValue({
      isAxiosError: true,
      response: { status: 401 },
    });

    render(
      <AuthInitializer>
        <p>Aplicación inicializada</p>
      </AuthInitializer>,
    );

    expect(await screen.findByText('Aplicación inicializada')).toBeInTheDocument();
    expect(screen.queryByText('No se pudo verificar la sesión')).not.toBeInTheDocument();
    await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  it('muestra la landing anónima sin esperar una llamada de refresh', async () => {
    const pendingRefresh = deferred<string>();
    refreshMock.mockReturnValue(pendingRefresh.promise);

    render(
      <AuthInitializer>
        <p>Landing pública</p>
      </AuthInitializer>,
    );

    expect(await screen.findByText('Landing pública')).toBeInTheDocument();
    expect(refreshMock).not.toHaveBeenCalled();
    pendingRefresh.resolve('unused');
  });

  it('no bloquea la landing si falla el refresh en segundo plano', async () => {
    useAuthStore.setState({
      user: { id: 1, usuario: 'admin', rol: 'ADMIN', slug: null },
    });
    refreshMock.mockRejectedValue({ isAxiosError: true, message: 'Network Error' });

    render(
      <AuthInitializer>
        <p>Landing pública</p>
      </AuthInitializer>,
    );

    expect(await screen.findByText('Landing pública')).toBeInTheDocument();
    expect(screen.queryByText('No se pudo verificar la sesión')).not.toBeInTheDocument();
  });

  it('espera el refresh en curso al navegar de la landing a una ruta privada', async () => {
    const user = { id: 1, usuario: 'admin', rol: 'ADMIN' as const, slug: null };
    const pendingRefresh = deferred<string>();
    useAuthStore.setState({ user });
    refreshMock.mockImplementation(() =>
      pendingRefresh.promise.then((token) => {
        useAuthStore.getState().login(user, token);
        return token;
      }),
    );

    function Landing() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate('/admin/dashboard')}>
          Administrar
        </button>
      );
    }

    render(
      <AuthInitializer>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route element={<ProtectedRoutes />}>
              <Route path="/admin/dashboard" element={<p>Ruta protegida</p>} />
            </Route>
            <Route path="/login" element={<p>Pantalla de login</p>} />
          </Routes>
        </MemoryRouter>
      </AuthInitializer>,
    );

    expect(await screen.findByRole('button', { name: 'Administrar' })).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Administrar' }));

    expect(screen.queryByText('Ruta protegida')).not.toBeInTheDocument();
    expect(screen.queryByText('Pantalla de login')).not.toBeInTheDocument();

    pendingRefresh.resolve('access-renovado');

    expect(await screen.findByText('Ruta protegida')).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(2);
  });
});
