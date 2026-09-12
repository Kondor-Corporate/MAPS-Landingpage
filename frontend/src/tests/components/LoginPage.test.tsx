import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { useAuthStore } from '@/store/authStore';
import { API_BASE, server } from '@/tests/mocks/server';

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
        <Route
          path="/intranet/dashboard"
          element={<div>Intranet dashboard</div>}
        />
        <Route path="/admin/dashboard" element={<div>Admin dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
    localStorage.clear();
    useAuthStore.persist.clearStorage();
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isInitialized: true,
      isAuthenticated: false,
    });
  });

  afterAll(() => {
    server.close();
  });

  it('validación: campos vacíos muestran mensajes', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(
      screen.getByRole('button', { name: /ingresar al portal/i }),
    );

    const alerts = screen.getAllByRole('alert');
    expect(alerts.some((a) => a.textContent?.includes('correo o usuario'))).toBe(
      true,
    );
    expect(alerts.some((a) => a.textContent?.includes('contraseña'))).toBe(
      true,
    );
  });

  it('validación: correo con @ inválido', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'no@valido@');
    await user.type(getPasswordInput(), 'secret');
    await user.click(
      screen.getByRole('button', { name: /ingresar al portal/i }),
    );

    expect(
      screen.getByText(/correo electrónico no válido/i),
    ).toBeInTheDocument();
  });

  it('validación: solo contraseña vacía', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'admin');
    await user.click(
      screen.getByRole('button', { name: /ingresar al portal/i }),
    );

    expect(screen.getByText(/ingresa tu contraseña/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/ingresa tu correo o usuario/i),
    ).not.toBeInTheDocument();
  });

  it('error 401 del API muestra mensaje y conserva los valores ingresados', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'admin');
    await user.type(getPasswordInput(), 'wrong');
    await user.click(
      screen.getByRole('button', { name: /ingresar al portal/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('alert').textContent,
      ).toMatch(/credenciales inválidas/i);
    });

    expect(getUsuarioInput()).toHaveValue('admin');
    expect(getPasswordInput()).toHaveValue('wrong');
    expect(
      screen.getByRole('button', { name: /ingresar al portal/i }),
    ).not.toBeDisabled();
  });

  it('login PRODUCTOR navega a intranet', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'producer');
    await user.type(getPasswordInput(), 'ok');
    await user.click(
      screen.getByRole('button', { name: /ingresar al portal/i }),
    );

    await waitFor(() => {
      expect(screen.getByText('Intranet dashboard')).toBeInTheDocument();
    });
  });

  it('login ADMIN navega a admin', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.type(getUsuarioInput(), 'admin');
    await user.type(getPasswordInput(), 'ok');
    await user.click(
      screen.getByRole('button', { name: /ingresar al portal/i }),
    );

    await waitFor(() => {
      expect(screen.getByText('Admin dashboard')).toBeInTheDocument();
    });
  });

  it('toggle mostrar contraseña cambia type del input', async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = getPasswordInput();
    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(
      screen.getByRole('button', { name: /mostrar contraseña/i }),
    );
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(
      screen.getByRole('button', { name: /ocultar contraseña/i }),
    );
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
    await user.click(
      screen.getByRole('button', { name: /ingresar al portal/i }),
    );

    expect(
      screen.getByRole('button', { name: /ingresando/i }),
    ).toBeDisabled();

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
