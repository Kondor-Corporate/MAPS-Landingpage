import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AuthInitializer } from '@/components/AuthInitializer';
import { refreshAccessToken } from '@/lib/axios';
import { ProtectedRoutes } from '@/router/ProtectedRoutes';
import { useAuthStore, type Rol } from '@/store/authStore';

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
    localStorage.clear();
    refreshMock.mockReset();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isInitialized: false,
      isAuthenticated: false,
    });
  });

  it.each<Rol>(['ADMIN', 'SUPERADMIN', 'PRODUCTOR'])(
    'restaura la sesión al recargar como %s',
    async (rol) => {
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
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
