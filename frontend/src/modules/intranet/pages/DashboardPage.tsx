import { AccessCard } from '@/shared/components/AccessCard';
import { DashboardGreeting } from '@/shared/components/DashboardGreeting';
import { RecentNewsGrid } from '@/shared/components/RecentNewsGrid';
import { BIBLIOTECA_INTRANET_PATH, SELF_PORTAL_URL } from '@/shared/constants/dashboardLinks';

const ShieldIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M6 1.5 2 3v2.7c0 2.1 1.4 4 4 4.8 2.6-.8 4-2.7 4-4.8V3l-4-1.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

const BookIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path
      d="M2.25 2.5h3.25v7.25H3a.75.75 0 0 1-.75-.75V2.5ZM6.5 2.5h3.25v6.5a.75.75 0 0 1-.75.75H6.5V2.5Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  </svg>
);

export function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 px-8 py-6">
      <DashboardGreeting name="Productor" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AccessCard
          variant="self"
          title="Acceso al Portal SELF"
          description="Cotizá, emití y gestioná pólizas directamente en el sistema de Federación Patronal."
          ctaLabel="Ingresar al Portal"
          href={SELF_PORTAL_URL}
          badge="Federación Patronal"
          badgeIcon={<ShieldIcon />}
        />
        <AccessCard
          variant="library"
          title="Biblioteca Digital"
          description="Accedé a manuales, formularios y material comercial actualizado."
          ctaLabel="Ingresar a la Biblioteca"
          href={BIBLIOTECA_INTRANET_PATH}
          badge="Recursos"
          badgeIcon={<BookIcon />}
        />
      </div>

      <RecentNewsGrid />
    </div>
  );
}
