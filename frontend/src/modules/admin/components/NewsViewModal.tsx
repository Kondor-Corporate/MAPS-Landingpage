import { Calendar, Image as ImageIcon, Pencil } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import {
  CATEGORIA_LABEL,
  type News,
} from '@/modules/admin/types/news';
import { NewsAudienceBadge } from '@/modules/admin/components/NewsAudienceBadge';
import { NewsStatusBadge } from '@/modules/admin/components/NewsStatusBadge';

type Props = {
  isOpen: boolean;
  news: News | null;
  onClose: () => void;
  onEdit: (n: News) => void;
};

const FULL_DATE = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
});

export function NewsViewModal({ isOpen, news, onClose, onEdit }: Props) {
  if (!news) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex flex-col">
        {news.imagenPortada ? (
          <div className="h-56 w-full overflow-hidden bg-maps-surface">
            <img
              src={news.imagenPortada}
              alt={news.titulo}
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-maps-brand-soft to-white text-maps-brand">
            <ImageIcon size={32} strokeWidth={1.5} />
          </div>
        )}

        <div className="flex flex-col gap-4 px-8 py-6">
          <div className="flex flex-wrap items-center gap-2">
            <NewsStatusBadge estado={news.estado} />
            <NewsAudienceBadge audiencia={news.audiencia} />
            <span className="inline-flex items-center rounded-full bg-maps-surface px-2.5 py-0.5 text-xs font-medium text-maps-body">
              {CATEGORIA_LABEL[news.categoria]}
            </span>
          </div>

          <h2 className="text-2xl font-bold text-maps-heading">{news.titulo}</h2>

          <div className="inline-flex items-center gap-1.5 text-xs text-maps-muted">
            <Calendar size={14} strokeWidth={1.75} />
            {FULL_DATE.format(new Date(news.fechaPublicacion))}
          </div>

          <p className="whitespace-pre-line text-sm leading-relaxed text-maps-body">
            {news.cuerpo}
          </p>

          <div className="mt-2 flex justify-end border-t border-maps-border pt-4">
            <button
              type="button"
              onClick={() => {
                onEdit(news);
                onClose();
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-maps-brand-hover"
            >
              <Pencil size={14} strokeWidth={2} />
              Editar
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
