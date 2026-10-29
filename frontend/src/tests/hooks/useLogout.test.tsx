import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useLogout } from '@/modules/auth/hooks/useLogout';
import { useAuthStore } from '@/store/authStore';
import { resetAuthStore } from '@/tests/helpers/resetAuthStore';
import { API_BASE, server } from '@/tests/mocks/server';

const SESSION_USER = { id: 1, usuario: 'admin', rol: 'ADMIN' as const, slug: null };

function LogoutProbe() {
  const logout = useLogout();
  return (
    <button type="button" onClick={() => void logout()}>
      Cerrar sesión
    </button>
  );
}

function renderLogout() {
  return render(
    <MemoryRouter initialEntries={['/intranet']}>
      <Routes>
        <Route path="/intranet" element={<LogoutProbe />} />
        <Route path="/login" element={<div>Pantalla login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function seedAuthenticatedSession() {
  useAuthStore.getState().login(SESSION_USER, 'access-token');
}

function mockLogoutRequest(respond: () => Response | Promise<Response>) {
  let hits = 0;
  server.use(
    http.post(`${API_BASE}/auth/logout`, () => {
      hits += 1;
      return respond();
    }),
  );
  return () => hits;
}

async function expectLoggedOut() {
  expect(await screen.findByText('Pantalla login')).toBeInTheDocument();
  expect(useAuthStore.getState().user).toBeNull();
  expect(useAuthStore.getState().accessToken).toBeNull();
  expect(useAuthStore.getState().isAuthenticated).toBe(false);
  expect(localStorage.getItem('maps-auth')).toBeNull();
}

describe('useLogout', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it('backend 204: limpia store/persist y navega a /login', async () => {
    const logoutHits = mockLogoutRequest(() => new HttpResponse(null, { status: 204 }));
    seedAuthenticatedSession();
    const user = userEvent.setup();
    renderLogout();

    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    await expectLoggedOut();
    expect(logoutHits()).toBe(1);
  });

  it('backend 500: igual limpia store/persist y navega a /login', async () => {
    const logoutHits = mockLogoutRequest(() => new HttpResponse(null, { status: 500 }));
    seedAuthenticatedSession();
    const user = userEvent.setup();
    renderLogout();

    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    await expectLoggedOut();
    expect(logoutHits()).toBe(1);
  });

  it('error de red: igual limpia store/persist y navega a /login', async () => {
    const logoutHits = mockLogoutRequest(() => HttpResponse.error());
    seedAuthenticatedSession();
    const user = userEvent.setup();
    renderLogout();

    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    await expectLoggedOut();
    expect(logoutHits()).toBe(1);
  });
});
