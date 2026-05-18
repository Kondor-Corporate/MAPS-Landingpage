import { useAuth } from '@/modules/auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

/**
 * Navbar de la aplicación con botón de logout y perfil del usuario
 */
export function Navbar() {
  const { logout, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    // logout ya navega a '/', pero dejamos el loading por UX
  };

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsDropdownOpen(false);
  };

  const userInitials = user?.usuario
    ? user.usuario
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase()
    : '?';

  return (
    <nav className="sticky top-0 z-50 border-b border-maps-border bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="text-xl font-bold text-maps-brand">MAPS</div>
        </div>

        {/* Acciones del usuario - lado derecho */}
        <div className="flex items-center gap-4">
          {/* Usuario */}
          {user && (
            <div className="hidden flex-col items-end sm:flex">
              <p className="text-sm font-medium text-maps-heading">{user.usuario}</p>
              <p className="text-xs text-maps-muted capitalize">{user.rol}</p>
            </div>
          )}

          {/* Avatar / Dropdown */}
          <div className="relative">
            <button
              onClick={toggleDropdown}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-maps-brand text-sm font-semibold text-white transition hover:bg-maps-brand-hover focus:outline-none focus:ring-2 focus:ring-maps-brand focus:ring-offset-2"
              aria-label="Menú de usuario"
              aria-haspopup="true"
              aria-expanded={isDropdownOpen}
            >
              {userInitials}
            </button>

            {/* Dropdown menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-maps-border bg-white shadow-lg">
                {/* Header del dropdown */}
                <div className="border-b border-maps-border px-4 py-3 sm:hidden">
                  <p className="text-sm font-medium text-maps-heading">{user?.usuario}</p>
                  <p className="text-xs text-maps-muted capitalize">{user?.rol}</p>
                </div>

                {/* Opciones */}
                <div className="py-1">
                  <button
                    onClick={() => handleNavigate('/profile')}
                    className="block w-full px-4 py-2 text-left text-sm text-maps-body transition hover:bg-maps-border/50 hover:text-maps-heading"
                  >
                    Mi Perfil
                  </button>

                  <button
                    onClick={() => handleNavigate('/settings')}
                    className="block w-full px-4 py-2 text-left text-sm text-maps-body transition hover:bg-maps-border/50 hover:text-maps-heading"
                  >
                    Configuración
                  </button>

                  <div className="border-t border-maps-border" />

                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="block w-full px-4 py-2 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar Sesión'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cerrar dropdown si se hace click fuera */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </nav>
  );
}
