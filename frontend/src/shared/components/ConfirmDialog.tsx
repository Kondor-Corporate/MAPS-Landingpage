import { useRef } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';

export type ConfirmDialogTone = 'danger' | 'success' | 'brand';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: ReactNode;
  tone?: ConfirmDialogTone;
  icon?: ReactNode;
  confirmLabel?: string;
  confirmLoadingLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  error?: string | null;
  ariaLabel?: string;
};

const TONE_ICON_WRAP: Record<ConfirmDialogTone, string> = {
  danger: 'bg-rose-50 text-rose-600',
  success: 'bg-emerald-50 text-emerald-700',
  brand: 'bg-maps-brand-soft text-maps-brand',
};

const TONE_DEFAULT_ICON: Record<ConfirmDialogTone, ReactNode> = {
  danger: <AlertTriangle size={22} aria-hidden />,
  success: <CheckCircle2 size={22} aria-hidden />,
  brand: <CheckCircle2 size={22} aria-hidden />,
};

const TONE_CONFIRM_VARIANT: Record<ConfirmDialogTone, 'destructive' | 'primary'> = {
  danger: 'destructive',
  success: 'primary',
  brand: 'primary',
};

/**
 * Modal de confirmación genérico (tono, ícono, título, descripción, acción) reutilizado
 * para todas las confirmaciones simples de la app: desactivar/reactivar entidades,
 * eliminar registros, activar/desactivar ramos, etc.
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  tone = 'danger',
  icon,
  confirmLabel = 'Confirmar',
  confirmLoadingLabel = 'Procesando…',
  cancelLabel = 'Cancelar',
  busy = false,
  error,
  ariaLabel,
}: Props) {
  const confirmLockRef = useRef(false);

  async function handleConfirm() {
    if (busy || confirmLockRef.current) return;
    confirmLockRef.current = true;
    try {
      await onConfirm();
    } finally {
      confirmLockRef.current = false;
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" ariaLabel={ariaLabel ?? title}>
      <div className="flex flex-col gap-5 p-6" role="alertdialog" aria-describedby="confirm-dialog-desc">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONE_ICON_WRAP[tone]}`}
          >
            {icon ?? TONE_DEFAULT_ICON[tone]}
          </span>
          <div className="flex-1 pr-8">
            <h2 className="text-lg font-bold text-maps-heading">{title}</h2>
            <p id="confirm-dialog-desc" className="mt-1 text-sm text-maps-body">
              {description}
            </p>
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
            {error}
          </p>
        ) : null}

        <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={TONE_CONFIRM_VARIANT[tone]}
            loading={busy}
            loadingText={confirmLoadingLabel}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel}
          </Button>
        </footer>
      </div>
    </Modal>
  );
}
