/**
 * Formulario de alta/edición de Noticias en el panel admin.
 * Agrupa campos editoriales, audiencia, portada (upload), galería y acciones de guardado.
 * Las imágenes se recolectan como operaciones pendientes y se aplican tras crear/editar.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CATEGORIA_OPTIONS,
  type NewsAudiencia,
  type NewsCategoria,
  type NewsEstado,
  type NewsGaleriaImagen,
  type NewsInput,
} from '@/modules/admin/types/news';
import { NewsAudienceCard } from '@/modules/admin/components/NewsAudienceCard';
import { NewsGalleryUploader } from '@/modules/admin/components/NewsGalleryUploader';
import { NewsImageUploader, type CoverCropValue } from '@/modules/admin/components/NewsImageUploader';
import { NewsPublishActionsCard } from '@/modules/admin/components/NewsPublishActionsCard';
import { NewsRichTextEditor } from '@/modules/admin/components/NewsRichTextEditor';
import { MapsSelect } from '@/shared/components/MapsSelect';

export type NewsFormState = {
  titulo: string;
  categoria: NewsCategoria | '';
  audiencia: NewsAudiencia;
  cuerpo: string;
  imagenPortada: string | null;
  portadaFile: File | null;
  removePortada: boolean;
  /**
   * Encuadre elegido para la portada (posición + zoom). Se aplica en el
   * frontend vía `object-position` para el preview del formulario.
   * Pendiente: el backend todavía no persiste esta propiedad, por lo que no
   * se respeta fuera de esta sesión de edición (cards públicas, otras
   * sesiones de admin). Ver docs/worklog/MAPS-019-galeria-imagenes-noticias.md.
   */
  portadaCrop: CoverCropValue | null;
  galeria: NewsGaleriaImagen[];
  galeriaNuevas: File[];
  galeriaEliminar: number[];
  estado: NewsEstado;
  ultimaModificacion: string;
};

/** Operaciones de imágenes pendientes que el padre aplica tras persistir el texto. */
export type NewsImageOps = {
  portadaFile: File | null;
  removePortada: boolean;
  galeriaNuevas: File[];
  galeriaEliminar: number[];
};

export const EMPTY_FORM: NewsFormState = {
  titulo: '',
  categoria: '',
  audiencia: 'PRODUCTORES',
  cuerpo: '',
  imagenPortada: null,
  portadaFile: null,
  removePortada: false,
  portadaCrop: null,
  galeria: [],
  galeriaNuevas: [],
  galeriaEliminar: [],
  estado: 'BORRADOR',
  ultimaModificacion: new Date().toISOString(),
};

type Props = {
  mode: 'create' | 'edit';
  state: NewsFormState;
  isSubmitting?: boolean;
  onChange: (next: NewsFormState) => void;
  onSubmit: (input: NewsInput, images: NewsImageOps) => Promise<void>;
  onUnpublish?: () => Promise<void>;
  onCancelEdit?: () => void;
};

type Errors = Partial<Record<'titulo' | 'categoria' | 'cuerpo', string>>;

function validate(state: NewsFormState): Errors {
  const errors: Errors = {};
  if (state.titulo.trim().length < 5) {
    errors.titulo = 'El título debe tener al menos 5 caracteres.';
  }
  if (!state.categoria) {
    errors.categoria = 'Seleccioná una categoría.';
  }
  if (state.cuerpo.trim().length < 20) {
    errors.cuerpo = 'El cuerpo debe tener al menos 20 caracteres.';
  }
  return errors;
}

export function NewsForm({
  mode,
  state,
  isSubmitting = false,
  onChange,
  onSubmit,
  onUnpublish,
  onCancelEdit,
}: Props) {
  const [showErrors, setShowErrors] = useState(false);
  const actionLockRef = useRef(false);

  const errors = useMemo(() => validate(state), [state]);

  useEffect(() => {
    setShowErrors(false);
  }, [mode]);

  function patch(partial: Partial<NewsFormState>) {
    onChange({
      ...state,
      ...partial,
      ultimaModificacion: new Date().toISOString(),
    });
  }

  async function tryCommit(estado: NewsEstado) {
    if (isSubmitting || actionLockRef.current) return;
    const currentErrors = validate(state);
    setShowErrors(true);
    if (Object.keys(currentErrors).length > 0) return;

    actionLockRef.current = true;
    const now = new Date().toISOString();
    try {
      await onSubmit(
        {
          titulo: state.titulo.trim(),
          categoria: state.categoria as NewsCategoria,
          audiencia: state.audiencia,
          cuerpo: state.cuerpo.trim(),
          estado,
          fechaPublicacion: now,
        },
        {
          portadaFile: state.portadaFile,
          // Un archivo nuevo reemplaza; solo se quita si no hay reemplazo.
          removePortada: state.removePortada && !state.portadaFile,
          galeriaNuevas: state.galeriaNuevas,
          galeriaEliminar: state.galeriaEliminar,
        },
      );
      setShowErrors(false);
    } finally {
      actionLockRef.current = false;
    }
  }

  async function tryUnpublish() {
    if (!onUnpublish || isSubmitting || actionLockRef.current) return;
    actionLockRef.current = true;
    try {
      await onUnpublish();
      setShowErrors(false);
    } finally {
      actionLockRef.current = false;
    }
  }

  const categoriaOptions = CATEGORIA_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]" aria-busy={isSubmitting}>
      <section className={`flex flex-col gap-4 rounded-2xl border border-maps-border bg-white p-4 shadow-card sm:p-6 ${isSubmitting ? 'pointer-events-none opacity-70' : ''}`}>
        <h2 className="text-base font-semibold text-maps-heading">Contenido de la Noticia</h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="news-titulo" className="text-sm font-medium text-maps-heading">
            Título de la noticia
          </label>
          <input
            id="news-titulo"
            type="text"
            value={state.titulo}
            onChange={(e) => patch({ titulo: e.target.value })}
            placeholder="Ej: Nueva circular de cumplimiento 2024"
            disabled={isSubmitting}
            className="rounded-xl border border-maps-border bg-white px-3 py-2.5 text-sm text-maps-heading placeholder:text-maps-muted-soft focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20 disabled:opacity-60"
          />
          {showErrors && errors.titulo ? (
            <span className="text-xs text-rose-600">{errors.titulo}</span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="news-categoria" className="text-sm font-medium text-maps-heading">
              Categoría
            </label>
            <MapsSelect
              id="news-categoria"
              value={state.categoria}
              onChange={(value) => patch({ categoria: value as NewsCategoria | '' })}
              options={categoriaOptions}
              placeholder="Seleccionar..."
              disabled={isSubmitting}
              hasError={showErrors && Boolean(errors.categoria)}
            />
            {showErrors && errors.categoria ? (
              <span className="text-xs text-rose-600">{errors.categoria}</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-maps-heading">Imagen de portada</span>
            <NewsImageUploader
              previewUrl={state.removePortada ? null : state.imagenPortada}
              pendingFile={state.portadaFile}
              crop={state.portadaCrop}
              disabled={isSubmitting}
              onSelectFile={(file) => patch({ portadaFile: file, removePortada: false })}
              onRemove={() => patch({ portadaFile: null, removePortada: true, portadaCrop: null })}
              onCropChange={(crop) => patch({ portadaCrop: crop })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-maps-heading">
            Galería de imágenes <span className="font-normal text-maps-muted">(opcional)</span>
          </span>
          <NewsGalleryUploader
            persisted={state.galeria}
            eliminar={state.galeriaEliminar}
            nuevas={state.galeriaNuevas}
            disabled={isSubmitting}
            onAddFiles={(files) => patch({ galeriaNuevas: [...state.galeriaNuevas, ...files] })}
            onRemovePersisted={(id) =>
              patch({ galeriaEliminar: [...state.galeriaEliminar, id] })
            }
            onRemoveNueva={(index) =>
              patch({ galeriaNuevas: state.galeriaNuevas.filter((_, i) => i !== index) })
            }
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-maps-heading">Cuerpo de la noticia</span>
          <NewsRichTextEditor value={state.cuerpo} onChange={(value) => patch({ cuerpo: value })} />
          {showErrors && errors.cuerpo ? (
            <span className="text-xs text-rose-600">{errors.cuerpo}</span>
          ) : null}
        </div>
      </section>

      <aside className={`flex flex-col gap-4 ${isSubmitting ? 'pointer-events-none opacity-70' : ''}`}>
        <NewsAudienceCard value={state.audiencia} onChange={(audiencia) => patch({ audiencia })} />
        <NewsPublishActionsCard
          mode={mode}
          estado={state.estado}
          ultimaModificacion={state.ultimaModificacion}
          isSubmitting={isSubmitting}
          onPublish={() => void tryCommit('PUBLICADO')}
          onSaveDraft={() => void tryCommit('BORRADOR')}
          onUnpublish={onUnpublish ? () => void tryUnpublish() : undefined}
          onCancelEdit={onCancelEdit}
        />
      </aside>
    </div>
  );
}
