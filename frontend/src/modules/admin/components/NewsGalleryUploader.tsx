/**
 * Gestor de galería de imágenes adicionales de una noticia (MAPS-019 + reordenamiento).
 * Combina imágenes ya persistidas con archivos pendientes en una sola lista ordenable;
 * alta/baja individual sin cambios. El orden se expresa como tokens `p:<id>` (persistida)
 * o `n:<key>` (pendiente) y se resuelve a ids reales recién al guardar (ver NewsForm/useAdminNews).
 */
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, X } from 'lucide-react';
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
  nuevaKeys: string[];
  order: string[];
  disabled?: boolean;
  onAddFiles: (files: File[]) => void;
  onRemovePersisted: (id: number) => void;
  onRemoveNueva: (index: number) => void;
  onReorder: (nextOrder: string[]) => void;
};

export function NewsGalleryUploader({
  persisted,
  eliminar,
  nuevas,
  nuevaKeys,
  order,
  disabled = false,
  onAddFiles,
  onRemovePersisted,
  onRemoveNueva,
  onReorder,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [dragToken, setDragToken] = useState<string | null>(null);
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

  const persistedById = new Map(visiblesPersisted.map((img) => [img.id, img]));
  const nuevaIndexByKey = new Map(nuevaKeys.map((key, index) => [key, index]));

  // El padre mantiene `order` en sincro; se filtra por las claves siguen vigentes
  // y se agregan al final las que faltaran (defensivo, no debería ocurrir).
  const knownTokens = new Set(order);
  const resolvedOrder = [
    ...order.filter(
      (token) =>
        (token.startsWith('p:') && persistedById.has(Number(token.slice(2)))) ||
        (token.startsWith('n:') && nuevaIndexByKey.has(token.slice(2))),
    ),
    ...visiblesPersisted
      .map((img) => `p:${img.id}`)
      .filter((token) => !knownTokens.has(token)),
    ...nuevaKeys.map((key) => `n:${key}`).filter((token) => !knownTokens.has(token)),
  ];

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

  function moveToken(token: string, direction: -1 | 1) {
    const index = resolvedOrder.indexOf(token);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= resolvedOrder.length) return;
    const next = [...resolvedOrder];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onReorder(next);
  }

  function handleDrop(targetToken: string) {
    if (!dragToken || dragToken === targetToken) {
      setDragToken(null);
      return;
    }
    const next = resolvedOrder.filter((token) => token !== dragToken);
    const targetIndex = next.indexOf(targetToken);
    next.splice(targetIndex, 0, dragToken);
    onReorder(next);
    setDragToken(null);
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
            {total}/{MAX_GALERIA_IMAGENES} imágenes · arrastrá para reordenar
          </span>
          <div className="flex flex-wrap gap-2">
            {resolvedOrder.map((token, index) => {
              const isPersisted = token.startsWith('p:');
              const url = isPersisted
                ? persistedById.get(Number(token.slice(2)))?.url
                : nuevasUrls[nuevaIndexByKey.get(token.slice(2)) ?? -1];

              return (
                <div
                  key={token}
                  draggable={!disabled}
                  onDragStart={() => setDragToken(token)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(token)}
                  onDragEnd={() => setDragToken(null)}
                  className={`group relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-lg border bg-maps-surface transition ${
                    isPersisted ? 'border-maps-border' : 'border-dashed border-maps-brand/50'
                  } ${dragToken === token ? 'opacity-50' : ''}`}
                >
                  {url ? (
                    <img
                      src={url}
                      alt={`Imagen de galería, posición ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : null}

                  <span className="absolute left-1 top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/60 px-1 text-[10px] font-semibold text-white">
                    {index + 1}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      isPersisted
                        ? onRemovePersisted(Number(token.slice(2)))
                        : onRemoveNueva(nuevaIndexByKey.get(token.slice(2)) ?? -1)
                    }
                    disabled={disabled}
                    title="Quitar imagen"
                    className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-maps-muted shadow-card transition hover:text-rose-600 disabled:opacity-60"
                    aria-label="Quitar imagen de la galería"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/50 px-1 py-1 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => moveToken(token, -1)}
                      disabled={disabled || index === 0}
                      title="Mover antes"
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-white disabled:opacity-30"
                      aria-label="Mover imagen antes"
                    >
                      <ArrowLeft size={12} strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveToken(token, 1)}
                      disabled={disabled || index === resolvedOrder.length - 1}
                      title="Mover después"
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-white disabled:opacity-30"
                      aria-label="Mover imagen después"
                    >
                      <ArrowRight size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              );
            })}

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
