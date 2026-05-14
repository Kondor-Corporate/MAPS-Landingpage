import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** Alineado con el enum `Rol` de Prisma en el backend. */
export type Rol = 'SUPERADMIN' | 'ADMIN' | 'PRODUCTOR';

export type AuthUser = {
  id: number;
  usuario: string;
  rol: Rol;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  isInitialized: boolean;
  isAuthenticated: boolean;
  login: (user: AuthUser, accessToken: string) => void;
  logout: () => void;
  updateToken: (accessToken: string) => void;
  setInitialized: (value: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isInitialized: false,
      isAuthenticated: false,
      login: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isInitialized: true,
        }),
      logout: () => {
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isInitialized: true,
        });
        void useAuthStore.persist.clearStorage();
      },
      updateToken: (accessToken) =>
        set((state) => ({
          accessToken,
          isAuthenticated: state.user != null,
        })),
      setInitialized: (value) => set({ isInitialized: value }),
    }),
    {
      name: 'maps-auth',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

export const getAuthState = () => useAuthStore.getState();
