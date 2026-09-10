import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import type { Producer } from '@/modules/admin/types/producer';
import { producerNombreCompleto } from '@/modules/admin/types/producer';

type Mode = 'deactivate' | 'reactivate';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  producer: Producer | null;
  mode: Mode;
  isBusy?: boolean;
  submitError?: string | null;
  onConfirm: (p: Producer) => Promise<void>;
};

export function DeactivateConfirmModal({
  isOpen,
  onClose,
  producer,
  mode,
  isBusy = false,
  submitError,
  onConfirm,
}: Props) {
  if (!producer) return null;
  const isDeactivate = mode === 'deactivate';
  const label = producerNombreCompleto(producer);

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => onConfirm(producer)}
      title={isDeactivate ? 'Desactivar productor' : 'Reactivar productor'}
      description={
        isDeactivate ? (
          <>
            ¿Seguro querés desactivar a <strong className="text-maps-heading">{label}</strong>?
            Dejará de aparecer en el listado de activos hasta que se lo reactive.
          </>
        ) : (
          <>
            ¿Seguro querés reactivar a <strong className="text-maps-heading">{label}</strong>?
            Volverá al listado principal de productores activos.
          </>
        )
      }
      tone={isDeactivate ? 'danger' : 'brand'}
      busy={isBusy}
      error={submitError}
      confirmLabel={isDeactivate ? 'Desactivar' : 'Reactivar'}
      confirmLoadingLabel="Procesando…"
      ariaLabel={isDeactivate ? 'Desactivar productor' : 'Reactivar productor'}
    />
  );
}
