import { AlertTriangle, UserCheck } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import type { Producer } from '@/modules/admin/types/producer';

type Mode = 'deactivate' | 'reactivate';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  producer: Producer | null;
  mode: Mode;
  onConfirm: (p: Producer) => void;
};

export function DeactivateConfirmModal({
  isOpen,
  onClose,
  producer,
  mode,
  onConfirm,
}: Props) {
  if (!producer) return null;
  const isDeactivate = mode === 'deactivate';

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
                  <strong className="text-maps-heading">{producer.nombre}</strong>? Dejará de
                  aparecer en el listado de activos hasta que se lo reactive.
                </>
              ) : (
                <>
                  ¿Seguro querés reactivar a{' '}
                  <strong className="text-maps-heading">{producer.nombre}</strong>? Volverá al
                  listado principal de productores activos.
                </>
              )}
            </p>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm(producer);
              onClose();
            }}
            className={[
              'rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-cta transition',
              isDeactivate
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-maps-brand hover:bg-maps-brand-hover',
            ].join(' ')}
          >
            {isDeactivate ? 'Desactivar' : 'Reactivar'}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
