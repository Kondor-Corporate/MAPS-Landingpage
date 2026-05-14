import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

const MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
};

export function NewsImageUploader({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handlePick(file: File | null) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('La imagen no puede superar los 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      onChange(result);
    };
    reader.onerror = () => setError('No se pudo leer la imagen.');
    reader.readAsDataURL(file);
  }

  if (value) {
    return (
      <div className="flex flex-col gap-2">
        <div className="relative h-24 w-full overflow-hidden rounded-lg border border-maps-border bg-maps-surface">
          <img src={value} alt="Portada de la noticia" className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-maps-muted shadow-card transition hover:text-rose-600"
            aria-label="Quitar imagen"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="text-left text-xs text-maps-brand hover:text-maps-brand-hover"
        >
          Reemplazar imagen
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-[42px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-maps-border bg-white text-sm font-medium text-maps-body transition hover:border-maps-brand hover:text-maps-brand"
      >
        <ImagePlus size={16} strokeWidth={1.75} />
        Subir Imagen
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
      />
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
      <span className="text-[11px] text-maps-muted">PNG, JPG o WEBP. Máx. 2 MB.</span>
    </div>
  );
}
