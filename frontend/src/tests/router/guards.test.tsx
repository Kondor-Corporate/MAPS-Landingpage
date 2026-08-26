import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { ProtectedRoutes } from '@/router/ProtectedRoutes';
import { RoleGuard } from '@/router/RoleGuard';
import { useAuthStore } from '@/store/authStore';

describe('ProtectedRoutes', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.persist.clearStorage();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isInitialized: false,
      isAuthenticated: false,
    });
  });

  it('no inicializado: no renderiza contenido', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoutes />}>
            <Route index element={<div data-testid="inside">Dentro</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('inicializado y no autenticado: redirige a login', () => {
    useAuthStore.setState({
      isInitialized: true,
      isAuthenticated: false,
      user: null,
      accessToken: null,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoutes />}>
            <Route index element={<div>Dentro</div>} />
          </Route>
          <Route path="/login" element={<div>Pantalla login</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Pantalla login')).toBeInTheDocument();
  });

  it('autenticado: renderiza rutas hijas', () => {
    useAuthStore.setState({
      isInitialized: true,
      isAuthenticated: true,
      user: { id: 1, usuario: 'a', rol: 'ADMIN', slug: null },
      accessToken: 't',
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/admin" element={<ProtectedRoutes />}>
            <Route index element={<div data-testid="inside">Dentro</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('inside')).toHaveTextContent('Dentro');
  });
});

describe('RoleGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.persist.clearStorage();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isInitialized: false,
      isAuthenticated: false,
    });
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
    useAuthStore.setState({
      isInitialized: true,
      user: null,
      accessToken: null,
      isAuthenticated: false,
    });

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
    useAuthStore.setState({
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
    useAuthStore.setState({
      isInitialized: true,
      user: { id: 1, usuario: 'admin', rol: 'ADMIN', slug: null },
      accessToken: 't',
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/admin/admins']}>
        <Routes>
          <Route
            path="/admin/admins"
            element={<RoleGuard allowedRoles={['SUPERADMIN']} />}
          >
            <Route index element={<div>Administradores</div>} />
          </Route>
          <Route path="/unauthorized" element={<div>Sin permiso</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Sin permiso')).toBeInTheDocument();
    expect(screen.queryByText('Administradores')).not.toBeInTheDocument();
  });

  it('rol permitido: muestra hijo', () => {
    useAuthStore.setState({
      isInitialized: true,
      user: { id: 1, usuario: 'a', rol: 'ADMIN', slug: null },
      accessToken: 't',
      isAuthenticated: true,
    });

    render(
      <MemoryRouter initialEntries={['/x']}>
        <Routes>
          <Route
            path="/x"
            element={<RoleGuard allowedRoles={['ADMIN', 'SUPERADMIN']} />}
          >
            <Route index element={<div data-testid="ok">Panel admin</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('ok')).toHaveTextContent('Panel admin');
  });
});
