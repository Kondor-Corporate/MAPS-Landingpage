import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
  closeButtonVariant?: 'light' | 'dark';
  ariaLabel?: string;
};

export function Modal({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-5xl',
  closeButtonVariant = 'light',
  ariaLabel = 'Contenido emergente',
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const closeButtonClass =
    closeButtonVariant === 'dark'
      ? 'bg-black/35 text-white border border-white/25 backdrop-blur-sm hover:bg-black/50'
      : 'bg-white text-maps-muted border border-maps-border shadow-card hover:bg-maps-surface hover:text-maps-heading';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
        role="presentation"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`relative flex max-h-[min(90vh,880px)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${maxWidth}`}
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className={`absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-maps-brand/30 ${closeButtonClass}`}
          aria-label="Cerrar modal"
          title="Cerrar"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M15 5L5 15M5 5L15 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="maps-modal-scroll min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
