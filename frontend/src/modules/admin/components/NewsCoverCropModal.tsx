/**
 * Editor de reencuadre de portada (MAPS-019 UX).
 * Permite elegir qué parte de la imagen se muestra como portada (paneo + zoom)
 * sin recortar/regenerar el archivo original.
 *
 * El resultado se persiste como `CoverCrop` (paneo + zoom + `area` = croppedArea en %)
 * y se reproduce con la misma transformación CSS en la preview del admin y en las
 * cards públicas (ver `shared/lib/coverCrop.ts`). Así modal, preview y web coinciden.
 */
import { useCallback, useEffect, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { Modal } from '@/shared/components/Modal';
import type { CoverCrop } from '@/shared/lib/coverCrop';

// Relación real usada por las cards públicas de noticias (PublicNewsCard):
// contenedor de 1200px, grid de 3 columnas con gap-7 (28px) y alto fijo de imagen de 195px.
const CARD_COLUMN_WIDTH = (1200 - 28 * 2) / 3;
export const NEWS_COVER_ASPECT_RATIO = CARD_COLUMN_WIDTH / 195;

/** @deprecated Alias del tipo canónico `CoverCrop`. */
export type CoverCropValue = CoverCrop;

type Props = {
  isOpen: boolean;
  imageUrl: string | null;
  initialValue: CoverCrop | null;
  onCancel: () => void;
  onSave: (value: CoverCrop) => void;
};

export function NewsCoverCropModal({ isOpen, imageUrl, initialValue, onCancel, onSave }: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<Area | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCrop({ x: initialValue?.x ?? 0, y: initialValue?.y ?? 0 });
    setZoom(initialValue?.zoom ?? 1);
    setCroppedAreaPercent(null);
  }, [isOpen, initialValue]);

  const handleCropComplete = useCallback((croppedArea: Area) => {
    setCroppedAreaPercent(croppedArea);
  }, []);

  function handleSave() {
    if (!croppedAreaPercent) return;
    onSave({
      x: crop.x,
      y: crop.y,
      zoom,
      // `croppedArea` (%) del original: única fuente de verdad para reproducir el crop.
      area: {
        x: croppedAreaPercent.x,
        y: croppedAreaPercent.y,
        width: croppedAreaPercent.width,
        height: croppedAreaPercent.height,
      },
    });
  }

  if (!isOpen || !imageUrl) return null;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} maxWidth="max-w-2xl" ariaLabel="Reencuadrar imagen de portada">
      <div className="flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1 pr-8">
          <h2 className="text-lg font-bold text-maps-heading">Reencuadrar portada</h2>
          <p className="text-sm text-maps-body">
            Arrastrá y hacé zoom para elegir qué parte de la imagen se mostrará como portada.
          </p>
        </div>

        <div className="relative h-[320px] w-full overflow-hidden rounded-xl bg-maps-heading/90 sm:h-[380px]">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={NEWS_COVER_ASPECT_RATIO}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="flex items-center gap-3">
          <label htmlFor="news-cover-crop-zoom" className="text-xs font-medium text-maps-heading">
            Zoom
          </label>
          <input
            id="news-cover-crop-zoom"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-maps-brand"
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-maps-border pt-4">
          <button
            type="button"
            onClick={onCancel}
            title="Cancelar reencuadre"
            className="rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-semibold text-maps-body transition hover:bg-maps-surface"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!croppedAreaPercent}
            title="Guardar encuadre"
            className="rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-maps-brand-hover disabled:opacity-60"
          >
            Guardar encuadre
          </button>
        </div>
      </div>
    </Modal>
  );
}
