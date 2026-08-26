import { AlertTriangle } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import type { Ramo } from '@/modules/admin/types/library';

type Props = {
  isOpen: boolean;
  ramo: Ramo | null;
  isBusy?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function LibraryRamoDeleteModal({
  isOpen,
  ramo,
  isBusy = false,
  submitError,
  onClose,
  onConfirm,
}: Props) {
  if (!ramo) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle size={18} strokeWidth={1.75} />
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-maps-heading">Eliminar ramo</h3>
            <p className="text-sm text-maps-body">
              ¿Eliminar el ramo «{ramo.nombre}»? Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        {submitError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {submitError}
          </p>
        ) : null}
        <div className="flex justify-end gap-2 border-t border-maps-border pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-semibold text-maps-body transition hover:bg-maps-surface disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {isBusy ? 'Eliminando…' : 'Eliminar'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
