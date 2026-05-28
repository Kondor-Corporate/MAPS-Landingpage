import { useMemo, useState } from 'react';
import {
  CATEGORIA_OPTIONS,
  type NewsAudiencia,
  type NewsCategoria,
  type NewsEstado,
  type NewsInput,
} from '@/modules/admin/types/news';
import { NewsAudienceCard } from '@/modules/admin/components/NewsAudienceCard';
import { NewsImageUploader } from '@/modules/admin/components/NewsImageUploader';
import { NewsPublishActionsCard } from '@/modules/admin/components/NewsPublishActionsCard';
import { NewsRichTextEditor } from '@/modules/admin/components/NewsRichTextEditor';

export type NewsFormState = {
  titulo: string;
  categoria: NewsCategoria | '';
  audiencia: NewsAudiencia;
  cuerpo: string;
  imagenPortada: string | null;
  estado: NewsEstado;
  ultimaModificacion: string;
};

export const EMPTY_FORM: NewsFormState = {
  titulo: '',
  categoria: '',
  audiencia: 'PRODUCTORES',
  cuerpo: '',
  imagenPortada: null,
  estado: 'BORRADOR',
  ultimaModificacion: new Date().toISOString(),
};

type Props = {
  mode: 'create' | 'edit';
  state: NewsFormState;
  onChange: (next: NewsFormState) => void;
  onSubmit: (input: NewsInput) => void;
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

export function NewsForm({ mode, state, onChange, onSubmit, onCancelEdit }: Props) {
  const [showErrors, setShowErrors] = useState(false);

  const errors = useMemo(() => validate(state), [state]);

  function patch(partial: Partial<NewsFormState>) {
    onChange({
      ...state,
      ...partial,
      ultimaModificacion: new Date().toISOString(),
    });
  }

  function tryCommit(estado: NewsEstado) {
    setShowErrors(true);
    if (Object.keys(errors).length > 0) return;
    const now = new Date().toISOString();
    const fechaPublicacion =
      estado === 'PUBLICADO' && state.estado !== 'PUBLICADO' ? now : undefined;
    onSubmit({
      titulo: state.titulo.trim(),
      categoria: state.categoria as NewsCategoria,
      audiencia: state.audiencia,
      cuerpo: state.cuerpo.trim(),
      imagenPortada: state.imagenPortada,
      estado,
      fechaPublicacion: fechaPublicacion ?? state.ultimaModificacion,
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      {/* Columna izquierda — Contenido */}
      <section className="flex flex-col gap-4 rounded-2xl border border-maps-border bg-white p-6 shadow-card">
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
            className="rounded-lg border border-maps-border bg-white px-3 py-2.5 text-sm text-maps-heading placeholder:text-maps-muted-soft focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
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
            <select
              id="news-categoria"
              value={state.categoria}
              onChange={(e) => patch({ categoria: e.target.value as NewsCategoria | '' })}
              className="rounded-lg border border-maps-border bg-white px-3 py-2.5 text-sm text-maps-heading focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
            >
              <option value="">Seleccionar...</option>
              {CATEGORIA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {showErrors && errors.categoria ? (
              <span className="text-xs text-rose-600">{errors.categoria}</span>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-maps-heading">Imagen de portada</span>
            <NewsImageUploader
              value={state.imagenPortada}
              onChange={(dataUrl) => patch({ imagenPortada: dataUrl })}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-maps-heading">Cuerpo de la noticia</span>
          <NewsRichTextEditor value={state.cuerpo} onChange={(value) => patch({ cuerpo: value })} />
          {showErrors && errors.cuerpo ? (
            <span className="text-xs text-rose-600">{errors.cuerpo}</span>
          ) : null}
        </div>
      </section>

      {/* Columna derecha — Sidebar */}
      <aside className="flex flex-col gap-4">
        <NewsAudienceCard value={state.audiencia} onChange={(audiencia) => patch({ audiencia })} />
        <NewsPublishActionsCard
          mode={mode}
          estado={state.estado}
          ultimaModificacion={state.ultimaModificacion}
          onPublish={() => tryCommit('PUBLICADO')}
          onSaveDraft={() => tryCommit('BORRADOR')}
          onCancelEdit={onCancelEdit}
        />
      </aside>
    </div>
  );
}
