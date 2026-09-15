import { useEffect, useRef, useState } from 'react';
import { FaLink, FaLinkedinIn, FaWhatsapp } from 'react-icons/fa';
import { getNewsShareUrl, getPublicNewsUrl } from '@/shared/lib/newsShare';

type NewsShareActionsProps = {
  slug?: string;
  title: string;
  /** `editorial` reproduce la estética sobria del detalle de noticia (docs/Noticia MAPS.html). */
  variant?: 'default' | 'editorial';
};

export function NewsShareActions({ slug, title, variant = 'default' }: NewsShareActionsProps) {
  const editorial = variant === 'editorial';
  const resetTimer = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [showManualCopy, setShowManualCopy] = useState(false);
  const articleUrl = slug ? getPublicNewsUrl(slug) : '';

  useEffect(
    () => () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    },
    [],
  );

  const handleShare = (platform: 'whatsapp' | 'linkedin') => {
    const destination = getNewsShareUrl(platform, title, articleUrl);
    if (!destination) return;
    window.open(destination, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    if (!articleUrl) return;
    setShowManualCopy(false);

    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(articleUrl);
      setCopied(true);
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setShowManualCopy(true);
    }
  };

  if (!articleUrl) return null;

  const buttonClassName = editorial
    ? 'flex min-h-11 items-center justify-center gap-2 rounded-[3px] border border-maps-border bg-white px-4 py-2.5 text-sm font-semibold text-maps-heading transition-colors hover:border-maps-brand hover:text-maps-brand-hover'
    : undefined;

  return (
    <div className="flex flex-col gap-2">
      {!editorial ? (
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-maps-muted">
          Compartir
        </p>
      ) : null}
      <div className={editorial ? 'flex flex-wrap gap-2.5' : 'grid gap-2 sm:grid-cols-3'}>
        <button
          type="button"
          onClick={() => handleShare('whatsapp')}
          aria-label="Compartir por WhatsApp"
          className={
            buttonClassName ??
            'flex min-h-11 items-center justify-center gap-2.5 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100'
          }
        >
          <FaWhatsapp size={16} />
          WhatsApp
        </button>
        <button
          type="button"
          onClick={() => handleShare('linkedin')}
          aria-label="Compartir por LinkedIn"
          className={
            buttonClassName ??
            'flex min-h-11 items-center justify-center gap-2.5 rounded-lg bg-sky-50 px-3.5 py-2.5 text-sm font-semibold text-sky-700 transition-colors hover:bg-sky-100'
          }
        >
          <FaLinkedinIn size={16} />
          LinkedIn
        </button>
        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label={copied ? 'Enlace copiado' : 'Copiar enlace'}
          className={
            buttonClassName ??
            'flex min-h-11 items-center justify-center gap-2.5 rounded-lg bg-maps-surface px-3.5 py-2.5 text-sm font-semibold text-maps-muted transition-colors hover:bg-maps-border/40'
          }
        >
          <FaLink size={13} />
          {copied ? '¡Enlace copiado!' : 'Copiar enlace'}
        </button>
      </div>
      <p className="min-h-5 text-xs text-maps-muted" role="status" aria-live="polite">
        {copied ? 'El enlace de esta noticia se copió al portapapeles.' : null}
      </p>
      {showManualCopy ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p>No pudimos copiar automáticamente. Seleccioná y copiá este enlace:</p>
          <input
            type="text"
            readOnly
            value={articleUrl}
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Enlace de la noticia para copiar manualmente"
            className="mt-2 w-full rounded border border-amber-300 bg-white px-2 py-2 text-maps-heading"
          />
        </div>
      ) : null}
    </div>
  );
}
