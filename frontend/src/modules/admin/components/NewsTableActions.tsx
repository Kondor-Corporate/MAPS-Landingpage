import { Eye, Pencil, Trash2 } from 'lucide-react';
import type { News } from '@/modules/admin/types/news';

type Props = {
  news: News;
  onView: (n: News) => void;
  onEdit: (n: News) => void;
  onDelete: (n: News) => void;
};

const baseBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-maps-muted transition hover:bg-maps-surface';

export function NewsTableActions({ news, onView, onEdit, onDelete }: Props) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onView(news)}
        className={`${baseBtn} hover:text-maps-brand`}
        aria-label={`Ver "${news.titulo}"`}
        title="Ver"
      >
        <Eye size={16} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => onEdit(news)}
        className={`${baseBtn} hover:text-maps-brand`}
        aria-label={`Editar "${news.titulo}"`}
        title="Editar"
      >
        <Pencil size={16} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => onDelete(news)}
        className={`${baseBtn} hover:bg-rose-50 hover:text-rose-600`}
        aria-label={`Eliminar "${news.titulo}"`}
        title="Eliminar"
      >
        <Trash2 size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}
