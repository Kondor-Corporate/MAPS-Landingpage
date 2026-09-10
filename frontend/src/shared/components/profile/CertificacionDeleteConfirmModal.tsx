import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import type { ProducerCertificacion } from '@/shared/types/producerProfile';

type Props = {
  isOpen: boolean;
  certificacion: ProducerCertificacion | null;
  isBusy?: boolean;
  submitError?: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function CertificacionDeleteConfirmModal({
  isOpen,
  certificacion,
  isBusy = false,
  submitError,
  onClose,
  onConfirm,
}: Props) {
  if (!certificacion) return null;

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Eliminar certificación"
      description={
        <>
          ¿Eliminar la certificación «{certificacion.nombre}»? Esta acción no se puede deshacer.
        </>
      }
      tone="danger"
      busy={isBusy}
      error={submitError}
      confirmLabel="Eliminar"
      confirmLoadingLabel="Eliminando…"
      ariaLabel="Eliminar certificación"
    />
  );
}
