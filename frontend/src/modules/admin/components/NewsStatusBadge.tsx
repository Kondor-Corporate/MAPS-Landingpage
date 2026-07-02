import { ESTADO_LABEL, type NewsEstado } from '@/modules/admin/types/news';

type Props = {
  estado: NewsEstado;
};

const STYLES: Record<NewsEstado, { bg: string; text: string; dot: string }> = {
  PUBLICADO: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
  },
  BORRADOR: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
  },
  DESPUBLICADA: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    dot: 'bg-slate-400',
  },
};

export function NewsStatusBadge({ estado }: Props) {
  const style = STYLES[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {ESTADO_LABEL[estado]}
    </span>
  );
}
