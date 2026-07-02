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
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle size={18} strokeWidth={1.75} />
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-maps-heading">Eliminar noticia</h3>
            <p className="text-sm text-maps-body">
              Vas a eliminar <span className="font-semibold">"{news.titulo}"</span>. Esta acción no
              se puede deshacer.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-maps-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-semibold text-maps-body transition hover:bg-maps-surface disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onConfirm(news)}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-60"
          >
            {isBusy ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
