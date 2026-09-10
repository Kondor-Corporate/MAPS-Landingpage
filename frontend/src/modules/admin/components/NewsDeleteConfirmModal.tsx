/** Confirmación antes de eliminar permanentemente una noticia (hard delete). */
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
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
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => onConfirm(news)}
      title="Eliminar noticia"
      description={
        <>
          Esta acción no se puede deshacer. Se eliminará permanentemente:{' '}
          <strong className="text-maps-heading">«{news.titulo}»</strong>
        </>
      }
      tone="danger"
      busy={isBusy}
      confirmLabel="Eliminar noticia"
      confirmLoadingLabel="Eliminando…"
      ariaLabel="Eliminar noticia"
    />
  );
}
