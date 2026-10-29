import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { useAuthStore } from '@/store/authStore';
import { resetAuthStore } from '@/tests/helpers/resetAuthStore';
import { API_BASE, loginErrorHandler, loginSuccessHandler, server } from '@/tests/mocks/server';

/** Evita coincidir con el botón «Mostrar contraseña». */
function getUsuarioInput() {
  return screen.getByRole('textbox', { name: /usuario/i });
}

function getPasswordInput() {
  return screen.getByPlaceholderText('••••••••');
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/intranet/dashboard" element={<div>Intranet dashboard</div>} />
        <Route path="/admin/dashboard" element={<div>Admin dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    resetAuthStore({ isInitialized: true });
  });

  it('validación: campos vacíos muestran mensajes', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /ingresar al portal/i }));

    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((a) => a.textContent?.includes('correo o usuario'))).toBe(true);
    expect(alerts.some((a) => a.textContent?.includes('contraseña'))).toBe(true);
  });

  it('validación: correo con @ inválido', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'no@valido@');
    await user.type(getPasswordInput(), 'secret');
    await user.click(screen.getByRole('button', { name: /ingresar al portal/i }));

    expect(screen.getByText(/correo electrónico no válido/i)).toBeInTheDocument();
  });

  it('validación: solo contraseña vacía', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'admin');
    await user.click(screen.getByRole('button', { name: /ingresar al portal/i }));

    expect(screen.getByText(/ingresa tu contraseña/i)).toBeInTheDocument();
    expect(screen.queryByText(/ingresa tu correo o usuario/i)).not.toBeInTheDocument();
  });

  it('error 401 del API muestra mensaje y conserva los valores ingresados', async () => {
    server.use(loginErrorHandler(401));
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'admin');
    await user.type(getPasswordInput(), 'wrong');
    await user.click(screen.getByRole('button', { name: /ingresar al portal/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/credenciales inválidas/i);
    });

    expect(getUsuarioInput()).toHaveValue('admin');
    expect(getPasswordInput()).toHaveValue('wrong');
    expect(screen.getByRole('button', { name: /ingresar al portal/i })).not.toBeDisabled();
  });

  it('login PRODUCTOR navega a intranet', async () => {
    server.use(
      loginSuccessHandler(
        { id: 1, usuario: 'producer', rol: 'PRODUCTOR', slug: 'producer' },
        'token-productor',
      ),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'producer');
    await user.type(getPasswordInput(), 'ok');
    await user.click(screen.getByRole('button', { name: /ingresar al portal/i }));

    await waitFor(() => {
      expect(screen.getByText('Intranet dashboard')).toBeInTheDocument();
    });
    expect(useAuthStore.getState()).toMatchObject({
      user: { id: 1, usuario: 'producer', rol: 'PRODUCTOR', slug: 'producer' },
      accessToken: 'token-productor',
      isAuthenticated: true,
    });
  });

  it('login ADMIN navega a admin', async () => {
    server.use(
      loginSuccessHandler({ id: 2, usuario: 'admin', rol: 'ADMIN', slug: null }, 'token-admin'),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'admin');
    await user.type(getPasswordInput(), 'ok');
    await user.click(screen.getByRole('button', { name: /ingresar al portal/i }));

    await waitFor(() => {
      expect(screen.getByText('Admin dashboard')).toBeInTheDocument();
    });
    expect(useAuthStore.getState()).toMatchObject({
      user: { id: 2, usuario: 'admin', rol: 'ADMIN', slug: null },
      accessToken: 'token-admin',
      isAuthenticated: true,
    });
  });

  it('login SUPERADMIN navega a admin y conserva el rol', async () => {
    server.use(
      loginSuccessHandler(
        { id: 3, usuario: 'superadmin', rol: 'SUPERADMIN', slug: null },
        'token-superadmin',
      ),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'superadmin');
    await user.type(getPasswordInput(), 'ok');
    await user.click(screen.getByRole('button', { name: /ingresar al portal/i }));

    await waitFor(() => {
      expect(screen.getByText('Admin dashboard')).toBeInTheDocument();
    });
    expect(useAuthStore.getState()).toMatchObject({
      user: { id: 3, usuario: 'superadmin', rol: 'SUPERADMIN', slug: null },
      accessToken: 'token-superadmin',
      isAuthenticated: true,
    });
  });

  it('body inesperado (data null) muestra error y no autentica', async () => {
    server.use(
      http.post(`${API_BASE}/auth/login`, () =>
        HttpResponse.json({ data: null, message: 'OK', error: null }),
      ),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'admin');
    await user.type(getPasswordInput(), 'ok');
    await user.click(screen.getByRole('button', { name: /ingresar al portal/i }));

    expect(await screen.findByText(/respuesta inesperada del servidor/i)).toBeInTheDocument();
    expect(screen.queryByText('Admin dashboard')).not.toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('error 5xx muestra el fallback de producción y no autentica', async () => {
    server.use(
      loginErrorHandler(500, {
        data: null,
        message: 'Internal Server Error',
        error: null,
      }),
    );
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'admin');
    await user.type(getPasswordInput(), 'ok');
    await user.click(screen.getByRole('button', { name: /ingresar al portal/i }));

    expect(await screen.findByText(/no se pudo iniciar sesión/i)).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(screen.getByRole('button', { name: /ingresar al portal/i })).not.toBeDisabled();
  });

  it('error de red muestra el mensaje de producción y no autentica', async () => {
    server.use(http.post(`${API_BASE}/auth/login`, () => HttpResponse.error()));
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'admin');
    await user.type(getPasswordInput(), 'ok');
    await user.click(screen.getByRole('button', { name: /ingresar al portal/i }));

    expect(await screen.findByText(/error de red/i)).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(screen.getByRole('button', { name: /ingresar al portal/i })).not.toBeDisabled();
  });

  it('doble submit envía un solo POST', async () => {
    let hits = 0;
    const response = deferred<ReturnType<typeof HttpResponse.json>>();
    server.use(
      http.post(`${API_BASE}/auth/login`, async () => {
        hits += 1;
        return response.promise;
      }),
    );

    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'admin');
    await user.type(getPasswordInput(), 'ok');
    await user.click(screen.getByRole('button', { name: /ingresar al portal/i }));

    expect(screen.getByRole('button', { name: /ingresando/i })).toBeDisabled();
    expect(hits).toBe(1);

    const form = screen.getByRole('button', { name: /ingresando/i }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);
    expect(hits).toBe(1);

    response.resolve(
      HttpResponse.json({
        data: {
          accessToken: 't',
          user: { id: 1, usuario: 'admin', rol: 'ADMIN', slug: null },
        },
        message: 'OK',
        error: null,
      }),
    );
    expect(await screen.findByText('Admin dashboard')).toBeInTheDocument();
  });

  it('toggle mostrar contraseña cambia type del input', async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = getPasswordInput();
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /mostrar contraseña/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: /ocultar contraseña/i }));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('durante envío el botón muestra Ingresando… y está deshabilitado', async () => {
    const response = deferred<ReturnType<typeof HttpResponse.json>>();
    server.use(
      http.post(`${API_BASE}/auth/login`, async () => {
        return response.promise;
      }),
    );

    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'admin');
    await user.type(getPasswordInput(), 'ok');
    await user.click(screen.getByRole('button', { name: /ingresar al portal/i }));

    expect(screen.getByRole('button', { name: /ingresando/i })).toBeDisabled();

    response.resolve(
      HttpResponse.json({
        data: {
          accessToken: 't',
          user: { id: 1, usuario: 'admin', rol: 'ADMIN', slug: null },
        },
        message: 'OK',
        error: null,
      }),
    );
    expect(await screen.findByText('Admin dashboard')).toBeInTheDocument();
  });
});
