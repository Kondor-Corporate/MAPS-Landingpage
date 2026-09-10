import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';

export type MapsFeedbackVariant = 'success' | 'error';

type ToastState = {
  id: number;
  message: string;
  variant: MapsFeedbackVariant;
};

type ToastProps = {
  message: string;
  variant: MapsFeedbackVariant;
  onDismiss: () => void;
  leaving?: boolean;
};

const EXIT_MS = 180;

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function MapsFeedbackToast({ message, variant, onDismiss, leaving = false }: ToastProps) {
  const isSuccess = variant === 'success';

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-floating',
        leaving ? 'maps-feedback-toast-leave' : 'maps-feedback-toast',
        isSuccess
          ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
          : 'border-rose-200 bg-rose-50 text-rose-900',
      ].join(' ')}
    >
      {isSuccess ? (
        <CheckCircle2 size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-emerald-600" />
      ) : (
        <XCircle size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-rose-600" />
      )}
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-current opacity-60 transition hover:opacity-100"
        aria-label="Cerrar notificación"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

export function useMapsFeedback(autoCloseMs = 3800) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timerRef = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    setToast(null);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(
    (message: string, variant: MapsFeedbackVariant) => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      setToast({ id: Date.now(), message, variant });
      timerRef.current = window.setTimeout(() => {
        setToast(null);
        timerRef.current = null;
      }, autoCloseMs);
    },
    [autoCloseMs],
  );

  const showSuccess = useCallback((message: string) => show(message, 'success'), [show]);
  const showError = useCallback((message: string) => show(message, 'error'), [show]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    },
    [],
  );

  return { toast, dismiss, showSuccess, showError };
}

type HostProps = {
  toast: ToastState | null;
  onDismiss: () => void;
};

export function MapsFeedbackToastHost({ toast, onDismiss }: HostProps) {
  const [visible, setVisible] = useState<ToastState | null>(toast);
  const [leaving, setLeaving] = useState(false);
  const visibleRef = useRef<ToastState | null>(toast);

  useEffect(() => {
    if (toast) {
      visibleRef.current = toast;
      setVisible(toast);
      setLeaving(false);
      return;
    }

    if (!visibleRef.current) return undefined;

    if (prefersReducedMotion()) {
      visibleRef.current = null;
      setVisible(null);
      setLeaving(false);
      return;
    }

    setLeaving(true);
    const timeoutId = window.setTimeout(() => {
      visibleRef.current = null;
      setVisible(null);
      setLeaving(false);
    }, EXIT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-toast flex flex-col items-stretch sm:inset-x-auto sm:bottom-6 sm:right-6 sm:items-end">
      <MapsFeedbackToast
        key={visible.id}
        message={visible.message}
        variant={visible.variant}
        leaving={leaving}
        onDismiss={onDismiss}
      />
    </div>
  );
}
