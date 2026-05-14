import { AlertTriangle, UserCheck } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
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
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start gap-4">
          <span
            className={[
              'flex h-12 w-12 items-center justify-center rounded-2xl',
              isDeactivate ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700',
            ].join(' ')}
          >
            {isDeactivate ? <AlertTriangle size={22} /> : <UserCheck size={22} />}
          </span>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-maps-heading">
              {isDeactivate ? 'Desactivar productor' : 'Reactivar productor'}
            </h2>
            <p className="mt-1 text-sm text-maps-body">
              {isDeactivate ? (
                <>
                  ¿Seguro querés desactivar a{' '}
                  <strong className="text-maps-heading">{label}</strong>? Dejará de aparecer en
                  el listado de activos hasta que se lo reactive.
                </>
              ) : (
                <>
                  ¿Seguro querés reactivar a{' '}
                  <strong className="text-maps-heading">{label}</strong>? Volverá al listado
                  principal de productores activos.
                </>
              )}
            </p>
          </div>
        </div>

        {submitError ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {submitError}
          </p>
        ) : null}

        <footer className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void onConfirm(producer)}
            className={[
              'rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-cta transition disabled:opacity-50',
              isDeactivate
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-maps-brand hover:bg-maps-brand-hover',
            ].join(' ')}
          >
            {isBusy
              ? 'Procesando…'
              : isDeactivate
                ? 'Desactivar'
                : 'Reactivar'}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
