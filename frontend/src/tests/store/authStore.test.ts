import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { resetAuthStore } from '@/tests/helpers/resetAuthStore';

describe('authStore', () => {
  beforeEach(() => {
    resetAuthStore();
  });

  it('estado inicial', () => {
    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.accessToken).toBeNull();
    expect(s.isAuthenticated).toBe(false);
    expect(s.isInitialized).toBe(false);
  });

  it('login asigna usuario, token y marca autenticado', () => {
    const user = { id: 1, usuario: 'admin', rol: 'ADMIN' as const, slug: null };
    useAuthStore.getState().login(user, 'jwt-1');

    const s = useAuthStore.getState();
    expect(s.user).toEqual(user);
    expect(s.accessToken).toBe('jwt-1');
    expect(s.isAuthenticated).toBe(true);
    expect(s.isInitialized).toBe(true);
  });

  it('logout limpia sesión y mantiene isInitialized true', () => {
    useAuthStore.getState().login({ id: 1, usuario: 'a', rol: 'ADMIN', slug: null }, 'tok');
    useAuthStore.getState().logout();

    const s = useAuthStore.getState();
    expect(s.user).toBeNull();
    expect(s.accessToken).toBeNull();
    expect(s.isAuthenticated).toBe(false);
    expect(s.isInitialized).toBe(true);
  });

  it('updateToken solo cambia accessToken', () => {
    const user = {
      id: 2,
      usuario: 'p',
      rol: 'PRODUCTOR' as const,
      slug: 'productor-prueba',
    };
    useAuthStore.getState().login(user, 'old');
    useAuthStore.getState().updateToken('new');

    const s = useAuthStore.getState();
    expect(s.accessToken).toBe('new');
    expect(s.user).toEqual(user);
    expect(s.isAuthenticated).toBe(true);
  });

  it('setInitialized actualiza la bandera', () => {
    useAuthStore.getState().setInitialized(true);
    expect(useAuthStore.getState().isInitialized).toBe(true);
  });

  it('partialize: accessToken no se persiste en localStorage', () => {
    const user = { id: 1, usuario: 'admin', rol: 'ADMIN' as const, slug: null };
    useAuthStore.getState().login(user, 'secret-access');

    const raw = localStorage.getItem('maps-auth');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { state: Record<string, unknown> };
    expect(parsed.state.user).toEqual(user);
    expect(parsed.state.accessToken).toBeUndefined();
  });

  it('rehidratación restaura user desde localStorage', async () => {
    localStorage.setItem(
      'maps-auth',
      JSON.stringify({
        state: {
          user: { id: 9, usuario: 'restored', rol: 'SUPERADMIN', slug: null },
        },
        version: 0,
      }),
    );

    await useAuthStore.persist.rehydrate();

    expect(useAuthStore.getState().user).toEqual({
      id: 9,
      usuario: 'restored',
      rol: 'SUPERADMIN',
      slug: null,
    });
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
