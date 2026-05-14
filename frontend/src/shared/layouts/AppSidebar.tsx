import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useLogout } from '@/modules/auth/hooks/useLogout';
import { getSidebarItems, type SidebarItem } from '@/shared/constants/sidebarItems';
import { getInitials } from '@/shared/utils/initials';
import { useAuthStore, type AuthUser, type Rol } from '@/store/authStore';

const ROLE_LABEL: Record<Rol, string> = {
  PRODUCTOR: 'Productor',
  ADMIN: 'Admin',
  SUPERADMIN: 'SuperAdmin',
};

const LogoutIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M8.75 16.25H4.75A1.75 1.75 0 0 1 3 14.5v-9A1.75 1.75 0 0 1 4.75 3.75h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="m13.25 13.25 3.5-3.25-3.5-3.25"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.5 10H8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function SidebarLink({ item }: { item: SidebarItem }) {
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <span
        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-maps-muted"
        aria-disabled="true"
        title="Próximamente"
      >
        <Icon className="shrink-0 opacity-70" />
        <span>{item.label}</span>
      </span>
    );
  }

  if (item.external) {
    return (
      <a
        href={item.to}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-maps-body transition-colors hover:bg-maps-surface hover:text-maps-heading"
      >
        <Icon className="shrink-0" />
        <span>{item.label}</span>
      </a>
    );
  }

  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) =>
        [
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-maps-brand-soft text-maps-brand'
            : 'text-maps-body hover:bg-maps-surface hover:text-maps-heading',
        ].join(' ')
      }
    >
      <Icon className="shrink-0" />
      <span>{item.label}</span>
    </NavLink>
  );
}

type AppSidebarPanelProps = {
  user: AuthUser;
  /** Accesorio al final de la fila del encabezado (p. ej. botón cerrar en drawer móvil). */
  headerTrailing?: ReactNode;
};

/**
 * Contenido interior del sidebar (misma fuente de items que desktop vía `getSidebarItems`).
 */
export function AppSidebarPanel({ user, headerTrailing }: AppSidebarPanelProps) {
  const logout = useLogout();
  const items = getSidebarItems(user.rol);
  const roleLabel = ROLE_LABEL[user.rol];

  return (
    <>
      <div className="flex items-center gap-3 border-b border-maps-border px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-maps-brand text-base font-bold text-white">
          M
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-sm font-bold leading-tight text-maps-heading">
            MAPS Asesores
          </span>
          <span className="text-xs leading-tight text-maps-muted">
            Portal de Productores
          </span>
        </div>
        {headerTrailing ? (
          <div className="flex shrink-0 items-center justify-end">{headerTrailing}</div>
        ) : null}
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <SidebarLink key={`${item.label}-${item.to}`} item={item} />
        ))}
      </nav>

      <div className="border-t border-maps-border px-4 py-4">
        <div className="flex items-center gap-3 pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-maps-brand-soft text-sm font-bold text-maps-brand">
            {getInitials(user.usuario)}
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-maps-heading">
              {user.usuario}
            </span>
            <span className="truncate text-xs text-maps-muted">{roleLabel}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-maps-body transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <LogoutIcon />
          <span>Cerrar Sesión</span>
        </button>
      </div>
    </>
  );
}

export function AppSidebar() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-maps-border bg-white lg:flex">
      <AppSidebarPanel user={user} />
    </aside>
  );
}
