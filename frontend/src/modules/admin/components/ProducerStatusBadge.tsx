import type { ProducerEstado } from '@/modules/admin/types/producer';

type Props = {
  estado: ProducerEstado;
};

const STYLES: Record<ProducerEstado, { bg: string; text: string; label: string }> = {
  ACTIVO: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    label: 'Activo',
  },
  INACTIVO: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    label: 'Inactivo',
  },
};

export function ProducerStatusBadge({ estado }: Props) {
  const style = STYLES[estado];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}
