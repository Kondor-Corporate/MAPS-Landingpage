import { ShieldCheck } from 'lucide-react';
import { AdminStatusBadge } from '@/modules/admin/components/AdminStatusBadge';

type Props = {
  usuario: string;
};

export function SuperadminAccountCard({ usuario }: Props) {
  return (
    <section
      aria-label="Cuenta principal"
      className="rounded-2xl border border-maps-brand/25 bg-maps-brand-soft/50 px-5 py-4 shadow-card"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-maps-brand text-white">
          <ShieldCheck size={20} strokeWidth={1.75} aria-hidden />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-maps-brand">
            Cuenta principal
          </p>
          <p className="truncate text-base font-bold text-maps-heading">{usuario}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm text-maps-body">Superadministrador</span>
            <AdminStatusBadge activo />
          </div>
        </div>
      </div>
    </section>
  );
}
