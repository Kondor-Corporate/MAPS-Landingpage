import { useRef } from 'react';
import { AlertTriangle, UserCheck } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import type { Admin } from '@/modules/admin/types/admin';

type Mode = 'deactivate' | 'reactivate';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  admin: Admin | null;
  mode: Mode;
  isBusy?: boolean;
  submitError?: string | null;
  onConfirm: (admin: Admin) => Promise<void>;
};

export function AdminStatusConfirmModal({
  isOpen,
  onClose,
  admin,
  mode,
  isBusy = false,
  submitError,
  onConfirm,
}: Props) {
  const confirmLockRef = useRef(false);

  if (!admin) return null;

  const isDeactivate = mode === 'deactivate';

  async function handleConfirm() {
    if (!admin || isBusy || confirmLockRef.current) return;
    confirmLockRef.current = true;
    try {
      await onConfirm(admin);
    } catch {
      /* error mostrado vía submitError */
    } finally {
      confirmLockRef.current = false;
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      ariaLabel={isDeactivate ? 'Desactivar administrador' : 'Reactivar administrador'}
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex items-start gap-4">
          <span
            className={[
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
              isDeactivate ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700',
            ].join(' ')}
          >
            {isDeactivate ? (
              <AlertTriangle size={22} aria-hidden />
            ) : (
              <UserCheck size={22} aria-hidden />
            )}
          </span>
          <div className="flex-1 pr-8">
            <h2 className="text-lg font-bold text-maps-heading">
              {isDeactivate ? 'Desactivar' : 'Reactivar'}
            </h2>
            <p className="mt-1 text-sm text-maps-body">
              {isDeactivate ? (
                <>
                  ¿Seguro querés desactivar a{' '}
                  <strong className="text-maps-heading">{admin.usuario}</strong>? Pierde el acceso a
                  la aplicación y se cierran sus sesiones activas.
                </>
              ) : (
                <>
                  ¿Seguro querés reactivar a{' '}
                  <strong className="text-maps-heading">{admin.usuario}</strong>? Vuelve a poder
                  iniciar sesión. Las sesiones antiguas no se recuperan: tiene que entrar de nuevo.
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

        <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="min-h-11 rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void handleConfirm()}
            className={[
              'min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-cta transition disabled:opacity-50',
              isDeactivate
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-maps-brand hover:bg-maps-brand-hover',
            ].join(' ')}
          >
            {isBusy ? 'Procesando…' : isDeactivate ? 'Desactivar' : 'Reactivar'}
          </button>
        </footer>
      </div>
    </Modal>
  );
}
