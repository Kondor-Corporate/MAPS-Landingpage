/** Confirmación antes de eliminar permanentemente una noticia (hard delete). */
import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import type { News } from '@/modules/admin/types/news';

type Props = {
  isOpen: boolean;
  news: News | null;
  isBusy?: boolean;
  onClose: () => void;
  onConfirm: (n: News) => void;
};

export function NewsDeleteConfirmModal({ isOpen, news, isBusy = false, onClose, onConfirm }: Props) {
  if (!news) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div
        className="flex flex-col gap-5 p-6"
        role="alertdialog"
        aria-labelledby="delete-news-title"
        aria-describedby="delete-news-desc"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100">
            <AlertTriangle size={20} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <h3 id="delete-news-title" className="text-base font-semibold text-maps-heading">
              Eliminar noticia
            </h3>
            <p id="delete-news-desc" className="text-sm leading-relaxed text-maps-body">
              Esta acción no se puede deshacer. Se eliminará permanentemente:
            </p>
            <p
              className="truncate rounded-lg bg-maps-surface px-3 py-2 text-sm font-semibold text-maps-heading"
              title={news.titulo}
            >
              {news.titulo}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-maps-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            title="Cancelar eliminación"
            className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-semibold text-maps-body transition hover:bg-maps-surface disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onConfirm(news)}
            title="Confirmar eliminación"
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {isBusy ? 'Eliminando…' : 'Eliminar noticia'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
