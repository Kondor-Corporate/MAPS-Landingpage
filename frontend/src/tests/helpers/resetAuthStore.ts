import { useAuthStore, type AuthUser } from '@/store/authStore';

const AUTH_STORAGE_KEY = 'maps-auth';

type AuthResetState = {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
};

/**
 * Deja el store anónimo (o con overrides en memoria) y borra `maps-auth`.
 * `clearStorage` va DESPUÉS de `setState` para que persist no reescriba la clave.
 */
export function resetAuthStore(overrides: Partial<AuthResetState> = {}) {
  useAuthStore.setState({
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isInitialized: false,
    ...overrides,
  });
  useAuthStore.persist.clearStorage();
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
