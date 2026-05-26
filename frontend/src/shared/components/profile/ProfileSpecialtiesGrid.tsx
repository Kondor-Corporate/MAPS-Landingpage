import {
  Car,
  Heart,
  Home,
  Laptop,
  LayoutGrid,
  PawPrint,
  Plane,
  Shield,
  Umbrella,
} from 'lucide-react';
import type { ProducerSpecialty } from '@/shared/types/producerProfile';

const ICONS: Record<string, typeof Heart> = {
  'salud-integral': Heart,
  automotores: Car,
  'riesgos-art': Shield,
  'hogar-pyme': Home,
  'vida-ahorro': Umbrella,
  viajero: Plane,
  mascotas: PawPrint,
  'ciber-risk': Laptop,
};

type Props = {
  especialidades: ProducerSpecialty[];
  emptyMessage?: string;
};

export function ProfileSpecialtiesGrid({ especialidades, emptyMessage }: Props) {
  if (especialidades.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0px_4px_20px_-2px_rgba(0,0,0,0.05)]">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
          <LayoutGrid className="size-5 text-maps-brand" aria-hidden />
          Especialidades y servicios
        </h2>
        <p className="mt-6 text-sm text-slate-500">
          {emptyMessage ?? 'Aún no hay especialidades registradas.'}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-100 bg-white p-8 shadow-[0px_4px_20px_-2px_rgba(0,0,0,0.05)]">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <LayoutGrid className="size-5 text-maps-brand" aria-hidden />
        Especialidades y servicios
      </h2>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {especialidades.map((esp) => {
          const Icon = ICONS[esp.clave] ?? Shield;
          return (
            <li
              key={esp.clave}
              className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-4 text-center"
            >
              <span className="flex size-10 items-center justify-center text-maps-brand">
                <Icon className="size-6" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-slate-900">{esp.label}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
