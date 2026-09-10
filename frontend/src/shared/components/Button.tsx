import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'icon';
export type ButtonSize = 'sm' | 'md';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Texto a mostrar mientras `loading` es true. Si se omite, se mantiene el texto original junto al spinner. */
  loadingText?: ReactNode;
  fullWidth?: boolean;
  icon?: ReactNode;
};

const BASE =
  'inline-flex items-center justify-center rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-maps-brand/30 focus:ring-offset-1';

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-xs gap-1.5',
  md: 'min-h-11 px-4 py-2 text-sm gap-2',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-maps-brand text-white shadow-cta hover:bg-maps-brand-hover',
  secondary:
    'border border-maps-border bg-white text-maps-heading font-medium hover:bg-maps-surface',
  destructive: 'bg-rose-600 text-white hover:bg-rose-700',
  ghost: 'bg-transparent text-maps-muted font-medium hover:bg-maps-border/40 hover:text-maps-heading',
  icon: 'bg-transparent text-maps-muted hover:bg-maps-surface hover:text-maps-heading',
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'size-8',
  md: 'size-9',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    fullWidth = false,
    icon,
    disabled,
    children,
    className,
    type = 'button',
    ...rest
  },
  ref,
) {
  const isIcon = variant === 'icon';

  const classes = [
    BASE,
    isIcon ? `${ICON_SIZE_CLASSES[size]} rounded-lg p-0` : SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    fullWidth && !isIcon ? 'w-full' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (isIcon) {
    return (
      <button ref={ref} type={type} disabled={disabled || loading} className={classes} {...rest}>
        {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : (icon ?? children)}
      </button>
    );
  }

  return (
    <button ref={ref} type={type} disabled={disabled || loading} className={classes} {...rest}>
      <span className="relative inline-grid">
        {/* Sizers invisibles: reservan el ancho máximo entre estado normal y loading */}
        <span className="invisible col-start-1 row-start-1 inline-flex items-center justify-center gap-2 whitespace-nowrap">
          {icon}
          {children}
        </span>
        {loadingText ? (
          <span className="invisible col-start-1 row-start-1 inline-flex items-center justify-center gap-2 whitespace-nowrap">
            <Loader2 className="size-4" aria-hidden />
            {loadingText}
          </span>
        ) : null}
        <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2 whitespace-nowrap">
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {loadingText ?? children}
            </>
          ) : (
            <>
              {icon}
              {children}
            </>
          )}
        </span>
      </span>
    </button>
  );
});
