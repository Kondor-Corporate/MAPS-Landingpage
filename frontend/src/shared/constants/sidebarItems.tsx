import type { ComponentType, SVGProps } from 'react';
import type { Rol } from '@/store/authStore';
import { SELF_PORTAL_URL } from '@/shared/constants/dashboardLinks';

type IconProps = SVGProps<SVGSVGElement>;

const DashboardIcon: ComponentType<IconProps> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    {...props}
  >
    <rect x="2.5" y="2.5" width="6" height="6" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
    <rect x="11.5" y="2.5" width="6" height="6" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
    <rect x="2.5" y="11.5" width="6" height="6" rx="1.25" stroke="currentColor" strokeWidth="1.5" />
    <rect
      x="11.5"
      y="11.5"
      width="6"
      height="6"
      rx="1.25"
      stroke="currentColor"
      strokeWidth="1.5"
    />
  </svg>
);

const LibraryIcon: ComponentType<IconProps> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    {...props}
  >
    <path
      d="M3.5 4.25A1.75 1.75 0 0 1 5.25 2.5H9.5v15H5.25a1.75 1.75 0 0 1-1.75-1.75V4.25Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M10.5 2.5h4.25a1.75 1.75 0 0 1 1.75 1.75v11.5a1.75 1.75 0 0 1-1.75 1.75H10.5v-15Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="M5.5 6h2M5.5 9h2M12.5 6h2M12.5 9h2"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const ExternalIcon: ComponentType<IconProps> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    {...props}
  >
    <path
      d="M11.25 3.75h5v5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.25 3.75 9.5 10.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.5 11.5v3.25a1.75 1.75 0 0 1-1.75 1.75h-7.5a1.75 1.75 0 0 1-1.75-1.75v-7.5A1.75 1.75 0 0 1 5.25 5.5H8.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ProfileIcon: ComponentType<IconProps> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    {...props}
  >
    <circle cx="10" cy="7" r="3.25" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M3.75 17c0-3.107 2.798-5.625 6.25-5.625S16.25 13.893 16.25 17"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const ProducersIcon: ComponentType<IconProps> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    {...props}
  >
    <circle cx="7.5" cy="6.5" r="2.75" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="14" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M2.5 16c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M13 12.25c2.347.21 4.25 1.965 4.25 3.75"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const AdminsIcon: ComponentType<IconProps> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    {...props}
  >
    <path
      d="M10 2.5 4 5v4.5c0 3.5 2.4 6.7 6 8 3.6-1.3 6-4.5 6-8V5l-6-2.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path
      d="m7.5 10 1.75 1.75L12.75 8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const NewsIcon: ComponentType<IconProps> = (props) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    {...props}
  >
    <rect x="2.5" y="3.5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M15.5 7.5h2v6.75a1.75 1.75 0 0 1-1.75 1.75H15.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.5 7h7M5.5 10h7M5.5 13h4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

export type SidebarItem = {
  label: string;
  to: string;
  icon: ComponentType<IconProps>;
  external?: boolean;
  /** Sin URL real: entrada no navegable (p. ej. enlace externo pendiente). */
  disabled?: boolean;
};

function accesoSelfSidebarItem(): SidebarItem {
  const url = SELF_PORTAL_URL;
  if (url) {
    return { label: 'Acceso SELF', to: url, icon: ExternalIcon, external: true };
  }
  return {
    label: 'Acceso SELF',
    to: '',
    icon: ExternalIcon,
    disabled: true,
  };
}

const accesoSelfItem = accesoSelfSidebarItem();

const producerItems: SidebarItem[] = [
  { label: 'Dashboard', to: '/intranet/dashboard', icon: DashboardIcon },
  { label: 'Biblioteca Digital', to: '/intranet/biblioteca', icon: LibraryIcon },
  accesoSelfItem,
  { label: 'Mi Perfil', to: '/intranet/mi-perfil', icon: ProfileIcon },
];

const adminItems: SidebarItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: DashboardIcon },
  { label: 'Productores', to: '/admin/productores', icon: ProducersIcon },
  { label: 'Noticias', to: '/admin/noticias', icon: NewsIcon },
  { label: 'Biblioteca Digital', to: '/admin/biblioteca', icon: LibraryIcon },
  accesoSelfItem,
  { label: 'Mi Perfil', to: '/admin/mi-perfil', icon: ProfileIcon },
];

const superadminItems: SidebarItem[] = [
  { label: 'Dashboard', to: '/admin/dashboard', icon: DashboardIcon },
  { label: 'Productores', to: '/admin/productores', icon: ProducersIcon },
  { label: 'Administradores', to: '/admin/admins', icon: AdminsIcon },
  { label: 'Noticias', to: '/admin/noticias', icon: NewsIcon },
  { label: 'Biblioteca Digital', to: '/admin/biblioteca', icon: LibraryIcon },
  accesoSelfItem,
  { label: 'Mi Perfil', to: '/admin/mi-perfil', icon: ProfileIcon },
];

export function getSidebarItems(rol: Rol): SidebarItem[] {
  switch (rol) {
    case 'PRODUCTOR':
      return producerItems;
    case 'ADMIN':
      return adminItems;
    case 'SUPERADMIN':
      return superadminItems;
  }
}
