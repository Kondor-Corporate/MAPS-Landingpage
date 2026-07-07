/**
 * Campo de portada por URL https (MAPS-014).
 * Valida formato en cliente; el upload real queda pendiente para una fase de storage.
 */
import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  showError?: boolean;
};

function validateImageUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return 'No se permiten data URLs.';
  if (!trimmed.startsWith('https://')) return 'Debe comenzar con https://';
  try {
    new URL(trimmed);
    return null;
  } catch {
    return 'URL inválida.';
  }
}

export function NewsImageUploader({ value, onChange, showError = false }: Props) {
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  const validationError = useMemo(() => validateImageUrl(draft), [draft]);
  const displayUrl = value && !validationError ? value : null;

  function commitUrl(next: string) {
    setDraft(next);
    const err = validateImageUrl(next);
    if (err) {
      onChange(null);
      return;
    }
    onChange(next.trim() || null);
  }

  if (displayUrl) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative h-24 w-full overflow-hidden rounded-lg border border-maps-border bg-maps-surface">
          <img src={displayUrl} alt="Portada de la noticia" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => {
              setDraft('');
              onChange(null);
            }}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-maps-muted shadow-card transition hover:text-rose-600"
            aria-label="Quitar imagen"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <input
          type="url"
          value={draft}
          onChange={(e) => commitUrl(e.target.value)}
          placeholder="https://..."
          className="rounded-lg border border-maps-border bg-white px-3 py-2 text-xs text-maps-heading placeholder:text-maps-muted-soft focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="flex h-[42px] shrink-0 items-center justify-center rounded-lg border border-dashed border-maps-border bg-white px-3 text-maps-muted">
          <ImagePlus size={16} strokeWidth={1.75} />
        </span>
        <input
          type="url"
          value={draft}
          onChange={(e) => commitUrl(e.target.value)}
          placeholder="https://ejemplo.com/imagen.jpg"
          className="h-[42px] min-w-0 flex-1 rounded-lg border border-dashed border-maps-border bg-white px-3 text-sm text-maps-heading placeholder:text-maps-muted-soft focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
        />
      </div>
      {showError && validationError ? (
        <span className="text-xs text-rose-600">{validationError}</span>
      ) : null}
      <span className="text-[11px] text-maps-muted">URL opcional. Solo https://</span>
    </div>
  );
}

export { validateImageUrl };
