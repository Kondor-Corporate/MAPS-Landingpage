import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
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
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Eliminar ramo"
      description={
        <>
          ¿Eliminar el ramo «{ramo.nombre}»? Esta acción no se puede deshacer.
        </>
      }
      tone="danger"
      busy={isBusy}
      error={submitError}
      confirmLabel="Eliminar"
      confirmLoadingLabel="Eliminando…"
      ariaLabel="Eliminar ramo"
    />
  );
}
