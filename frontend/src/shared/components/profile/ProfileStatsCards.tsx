import { Calendar, Users } from 'lucide-react';

type Props = {
  anosExperiencia: number | null;
  clientesActivos: number | null;
};

export function ProfileStatsCards({ anosExperiencia, clientesActivos }: Props) {
  if (anosExperiencia == null && clientesActivos == null) return null;

  return (
    <section className="flex flex-col gap-4">
      {anosExperiencia != null && (
        <div className="relative flex items-center gap-4 rounded-2xl border border-maps-border bg-white p-6 shadow-profile">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-maps-brand/10 text-maps-brand">
            <Calendar className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{anosExperiencia}+ Años</p>
            <p className="text-xs font-medium uppercase tracking-[0.6px] text-slate-500">
              Experiencia
            </p>
          </div>
        </div>
      )}
      {clientesActivos != null && (
        <div className="relative flex items-center gap-4 rounded-2xl border border-maps-border bg-white p-6 shadow-profile">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-maps-brand/10 text-maps-brand">
            <Users className="size-5" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-extrabold text-slate-900">{clientesActivos}+</p>
            <p className="text-xs font-medium uppercase tracking-[0.6px] text-slate-500">
              Clientes activos
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
