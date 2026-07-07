import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type Props = {
  to: string;
  label?: string;
};

export function DashboardBackLink({ to, label = 'Volver al dashboard' }: Props) {
  return (
    <Link
      to={to}
      className="inline-flex w-fit items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-medium text-maps-muted transition hover:text-maps-brand"
    >
      <ArrowLeft size={16} strokeWidth={1.75} aria-hidden />
      {label}
    </Link>
  );
}
