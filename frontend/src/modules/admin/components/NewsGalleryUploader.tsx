/**
 * Gestor de galería de imágenes adicionales de una noticia (MAPS-019).
 * Combina imágenes ya persistidas con archivos pendientes; alta/baja individual.
 * Estas imágenes se muestran como carrusel solo en la vista completa (no en cards).
 */
import { useEffect, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { NewsGaleriaImagen } from '@/modules/admin/types/news';
import {
  NEWS_IMAGE_ACCEPT,
  validateNewsImageFile,
} from '@/modules/admin/components/NewsImageUploader';

export const MAX_GALERIA_IMAGENES = 10;

type Props = {
  persisted: NewsGaleriaImagen[];
  eliminar: number[];
  nuevas: File[];
  disabled?: boolean;
  onAddFiles: (files: File[]) => void;
  onRemovePersisted: (id: number) => void;
  onRemoveNueva: (index: number) => void;
};

export function NewsGalleryUploader({
  persisted,
  eliminar,
  nuevas,
  disabled = false,
  onAddFiles,
  onRemovePersisted,
  onRemoveNueva,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [nuevasUrls, setNuevasUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = nuevas.map((file) => URL.createObjectURL(file));
    setNuevasUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [nuevas]);

  const visiblesPersisted = persisted.filter((img) => !eliminar.includes(img.id));
  const total = visiblesPersisted.length + nuevas.length;
  const atMax = total >= MAX_GALERIA_IMAGENES;
  const hasImages = total > 0;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const disponibles = MAX_GALERIA_IMAGENES - total;
    const aceptados: File[] = [];
    let validationError: string | null = null;

    for (const file of files) {
      if (aceptados.length >= disponibles) {
        validationError = `La galería admite un máximo de ${MAX_GALERIA_IMAGENES} imágenes.`;
        break;
      }
      const fileError = validateNewsImageFile(file);
      if (fileError) {
        validationError = fileError;
        continue;
      }
      aceptados.push(file);
    }

    setError(validationError);
    if (aceptados.length > 0) onAddFiles(aceptados);
  }

  const addControl = !atMax ? (
    <label
      className={`flex h-[112px] w-[112px] shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-maps-border bg-white text-maps-muted transition hover:border-maps-brand hover:text-maps-brand ${
        disabled ? 'pointer-events-none opacity-60' : ''
      }`}
    >
      <ImagePlus size={18} strokeWidth={1.75} />
      <span className="text-[11px] font-medium">Agregar</span>
      <input
        type="file"
        accept={NEWS_IMAGE_ACCEPT}
        multiple
        disabled={disabled}
        onChange={handleChange}
        className="hidden"
        aria-label="Agregar imágenes a la galería"
      />
    </label>
  ) : null;

  return (
    <div className="flex flex-col gap-2">
      {hasImages ? (
        <>
          <span className="text-xs font-medium text-maps-muted">
            {total}/{MAX_GALERIA_IMAGENES} imágenes
          </span>
          <div className="flex flex-wrap gap-2">
            {visiblesPersisted.map((img) => (
              <div
                key={`p-${img.id}`}
                className="group relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-lg border border-maps-border bg-maps-surface"
              >
                <img src={img.url} alt="Imagen de galería" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemovePersisted(img.id)}
                  disabled={disabled}
                  title="Quitar imagen"
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-maps-muted shadow-card transition hover:text-rose-600 disabled:opacity-60"
                  aria-label="Quitar imagen de la galería"
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            ))}

            {nuevas.map((_, index) => (
              <div
                key={`n-${index}`}
                className="relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-lg border border-dashed border-maps-brand/50 bg-maps-surface"
              >
                {nuevasUrls[index] ? (
                  <img
                    src={nuevasUrls[index]}
                    alt="Imagen de galería nueva"
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => onRemoveNueva(index)}
                  disabled={disabled}
                  title="Quitar imagen"
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-maps-muted shadow-card transition hover:text-rose-600 disabled:opacity-60"
                  aria-label="Quitar imagen pendiente"
                >
                  <X size={12} strokeWidth={2} />
                </button>
              </div>
            ))}

            {addControl}
          </div>
        </>
      ) : (
        <label
          className={`inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed border-maps-border bg-white px-3 py-2 text-sm font-semibold text-maps-muted transition hover:border-maps-brand hover:text-maps-brand ${
            disabled ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <ImagePlus size={16} strokeWidth={1.75} />
          Agregar imágenes
          <input
            type="file"
            accept={NEWS_IMAGE_ACCEPT}
            multiple
            disabled={disabled}
            onChange={handleChange}
            className="hidden"
            aria-label="Agregar imágenes a la galería"
          />
        </label>
      )}

      {error ? (
        <span className="text-xs text-rose-600">{error}</span>
      ) : (
        <span className="text-[11px] text-maps-muted">
          Hasta {MAX_GALERIA_IMAGENES} imágenes · JPG, JPEG o PNG
        </span>
      )}
    </div>
  );
}
