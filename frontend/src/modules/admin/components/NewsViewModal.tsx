/** Modal de vista previa de solo lectura para una noticia del listado admin. */
import { Calendar, Pencil } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { NewsImage } from '@/shared/components/NewsImage';
import { CATEGORIA_LABEL, type News } from '@/modules/admin/types/news';
import { NewsAudienceBadge } from '@/modules/admin/components/NewsAudienceBadge';
import { NewsStatusBadge } from '@/modules/admin/components/NewsStatusBadge';
import { formatNewsFullDate } from '@/shared/utils/newsDate';

type Props = {
  isOpen: boolean;
  news: News | null;
  onClose: () => void;
  onEdit: (n: News) => void;
};

export function NewsViewModal({ isOpen, news, onClose, onEdit }: Props) {
  if (!news) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-3xl">
      <div className="flex flex-col">
        <NewsImage
          src={news.imagenPortada}
          categoryKey={news.categoria}
          className="h-56 w-full"
          iconSize={32}
        />

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
            {formatNewsFullDate(news.fechaPublicacion)}
          </div>

          <p className="whitespace-pre-line text-sm leading-relaxed text-maps-body">{news.cuerpo}</p>

          <div className="mt-2 flex justify-end border-t border-maps-border pt-4">
            <button
              type="button"
              onClick={() => {
                onEdit(news);
                onClose();
              }}
              title="Editar noticia"
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
