import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import type { Ramo } from '@/modules/admin/types/library';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  ramo: Ramo | null;
  isBusy?: boolean;
  submitError?: string | null;
  onConfirm: (ramo: Ramo) => Promise<void>;
};

export function LibraryRamoToggleConfirmModal({
  isOpen,
  onClose,
  ramo,
  isBusy = false,
  submitError,
  onConfirm,
}: Props) {
  if (!ramo) return null;
  const isDeactivate = ramo.activo;

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => onConfirm(ramo)}
      title={isDeactivate ? 'Desactivar ramo' : 'Activar ramo'}
      description={
        <>
          ¿Querés {isDeactivate ? 'desactivar' : 'activar'}{' '}
          <strong className="text-maps-heading">«{ramo.nombre}»</strong>?
        </>
      }
      tone={isDeactivate ? 'danger' : 'brand'}
      busy={isBusy}
      error={submitError}
      confirmLabel={isDeactivate ? 'Desactivar' : 'Activar'}
      confirmLoadingLabel="Procesando…"
      ariaLabel={isDeactivate ? 'Desactivar ramo' : 'Activar ramo'}
    />
  );
}
