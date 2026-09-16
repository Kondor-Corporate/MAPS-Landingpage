/**
 * Selector de portada por archivo (MAPS-019).
 * Preview compacto con drag & drop, acciones en fila (Cambiar/Reencuadrar/Eliminar)
 * y editor de encuadre (posición + zoom) aplicado vía `object-position` en el preview.
 * La subida real la orquesta el formulario tras crear/editar la noticia.
 */
import { useEffect, useRef, useState } from 'react';
import { Crop, ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import {
  NEWS_COVER_ASPECT_RATIO,
  NewsCoverCropModal,
  type CoverCropValue,
} from '@/modules/admin/components/NewsCoverCropModal';
import { coverCropToImageStyle } from '@/shared/lib/coverCrop';

export const NEWS_IMAGE_ACCEPT = 'image/jpeg,image/png';
export const NEWS_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

/** Valida tipo y tamaño en cliente; devuelve mensaje de error o null. */
export function validateNewsImageFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return 'La imagen debe ser JPG, JPEG o PNG.';
  }
  if (file.size > NEWS_IMAGE_MAX_BYTES) {
    return 'El archivo supera el tamaño máximo de 10 MB.';
  }
  return null;
}

export type { CoverCropValue };

type Props = {
  /** URL de portada ya persistida (se muestra si no hay archivo pendiente). */
  previewUrl: string | null;
  /** Archivo seleccionado aún no subido (create, o reemplazo en edit). */
  pendingFile: File | null;
  /** Encuadre elegido para la portada (pendiente de soporte en backend). */
  crop: CoverCropValue | null;
  disabled?: boolean;
  onSelectFile: (file: File) => void;
  onRemove: () => void;
  onCropChange: (crop: CoverCropValue | null) => void;
};

export function NewsImageUploader({
  previewUrl,
  pendingFile,
  crop,
  disabled = false,
  onSelectFile,
  onRemove,
  onCropChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);

  useEffect(() => {
    if (!pendingFile) {
      setPendingUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const displayUrl = pendingUrl ?? previewUrl;

  function acceptFile(file: File) {
    const validationError = validateNewsImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    onCropChange(null);
    onSelectFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!file) return;
    acceptFile(file);
  }

  function handleRemove() {
    setError(null);
    onCropChange(null);
    onRemove();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) acceptFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={NEWS_IMAGE_ACCEPT}
        disabled={disabled}
        onChange={handleChange}
        className="hidden"
        aria-label="Seleccionar imagen de portada"
      />

      {displayUrl ? (
        <div className="flex flex-col gap-2">
          <div
            className={`relative w-full max-w-[420px] overflow-hidden rounded-xl border bg-maps-surface transition ${
              isDragOver ? 'border-maps-brand ring-2 ring-maps-brand/20' : 'border-maps-border'
            }`}
            // Mismo aspecto que el encuadre y las cards, para que la preview coincida 1:1.
            style={{ aspectRatio: String(NEWS_COVER_ASPECT_RATIO) }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <img
              src={displayUrl}
              alt="Portada de la noticia"
              className="h-full w-full object-cover"
              style={crop ? coverCropToImageStyle(crop) : { objectPosition: '50% 50%' }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              title="Cambiar imagen"
              className="inline-flex items-center gap-1.5 rounded-lg border border-maps-border bg-white px-2.5 py-1.5 text-xs font-semibold text-maps-body transition hover:bg-maps-surface disabled:opacity-60"
            >
              <RefreshCw size={13} strokeWidth={2} />
              Cambiar
            </button>
            <button
              type="button"
              onClick={() => setIsCropOpen(true)}
              disabled={disabled}
              title="Reencuadrar imagen"
              className="inline-flex items-center gap-1.5 rounded-lg border border-maps-border bg-white px-2.5 py-1.5 text-xs font-semibold text-maps-body transition hover:bg-maps-surface disabled:opacity-60"
            >
              <Crop size={13} strokeWidth={2} />
              Reencuadrar
            </button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              title="Eliminar imagen"
              className="inline-flex items-center gap-1.5 rounded-lg border border-maps-border bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
            >
              <Trash2 size={13} strokeWidth={2} />
              Eliminar
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`h-[140px] w-full max-w-[420px] rounded-xl border border-dashed transition ${
            isDragOver ? 'border-maps-brand bg-maps-brand-soft/40' : 'border-maps-border bg-white'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-maps-muted transition hover:text-maps-brand disabled:opacity-60"
          >
            <ImagePlus size={20} strokeWidth={1.75} />
            <span className="text-sm font-medium">Seleccionar imagen</span>
            <span className="text-[11px]">JPG, JPEG o PNG</span>
          </button>
        </div>
      )}

      {error ? (
        <span className="text-xs text-rose-600">{error}</span>
      ) : (
        <span className="text-[11px] text-maps-muted">JPG, JPEG o PNG · máximo 10 MB</span>
      )}

      <NewsCoverCropModal
        isOpen={isCropOpen}
        imageUrl={displayUrl}
        initialValue={crop}
        onCancel={() => setIsCropOpen(false)}
        onSave={(value) => {
          onCropChange(value);
          setIsCropOpen(false);
        }}
      />
    </div>
  );
}
