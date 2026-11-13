import { render, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { getSidebarItems } from '@/shared/constants/sidebarItems';
import { AppSidebar, AppSidebarPanel } from '@/shared/layouts/AppSidebar';
import { useAuthStore, type AuthUser, type Rol } from '@/store/authStore';

const EXPECTED_LABELS: Record<Rol, string[]> = {
  PRODUCTOR: ['Dashboard', 'Biblioteca Digital', 'Novedades', 'Mi Perfil'],
  ADMIN: [
    'Dashboard',
    'Productores',
    'Productores inactivos',
    'Postulaciones',
    'Noticias',
    'Biblioteca Digital',
    'Mi Perfil',
  ],
  SUPERADMIN: [
    'Dashboard',
    'Productores',
    'Productores inactivos',
    'Postulaciones',
    'Administradores',
    'Noticias',
    'Biblioteca Digital',
    'Mi Perfil',
  ],
};

function userFor(rol: Rol): AuthUser {
  return { id: 1, usuario: 'tester', rol, slug: rol === 'PRODUCTOR' ? 'tester' : null };
}

function navLabels(container: HTMLElement): string[] {
  const nav = within(container).getByRole('navigation');
  return Array.from(nav.querySelectorAll('a, [aria-disabled="true"]')).map(
    (item) => item.textContent?.trim() ?? '',
  );
}

describe('getSidebarItems', () => {
  it.each(Object.keys(EXPECTED_LABELS) as Rol[])(
    'no incluye Acceso SELF para %s y conserva el resto del menú',
    (rol) => {
      const items = getSidebarItems(rol);

      expect(items.map((item) => item.label)).toEqual(EXPECTED_LABELS[rol]);
      expect(items.some((item) => item.label === 'Acceso SELF')).toBe(false);
      expect(items.some((item) => item.disabled)).toBe(false);
    },
  );
});

describe('menú de escritorio y móvil', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitialized: true,
    });
  });

  it.each(Object.keys(EXPECTED_LABELS) as Rol[])(
    'muestran los mismos elementos para %s',
    (rol) => {
      const user = userFor(rol);
      useAuthStore.setState({
        user,
        accessToken: 'token',
        isAuthenticated: true,
        isInitialized: true,
      });

      const desktop = render(
        <MemoryRouter>
          <AppSidebar />
        </MemoryRouter>,
      );
      const desktopLabels = navLabels(desktop.container);
      desktop.unmount();

      const mobile = render(
        <MemoryRouter>
          <AppSidebarPanel user={user} />
        </MemoryRouter>,
      );

      expect(desktopLabels).toEqual(EXPECTED_LABELS[rol]);
      expect(navLabels(mobile.container)).toEqual(desktopLabels);
      expect(mobile.container.textContent).not.toContain('Acceso SELF');
    },
  );
});
