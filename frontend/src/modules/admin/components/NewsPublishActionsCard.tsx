import { Save, Send } from 'lucide-react';
import { ESTADO_LABEL, type NewsEstado } from '@/modules/admin/types/news';
import { relativeTimeFromNow } from '@/shared/utils/relativeTime';

type Props = {
  mode: 'create' | 'edit';
  estado: NewsEstado;
  ultimaModificacion: string;
  isSubmitting?: boolean;
  onPublish: () => void;
  onSaveDraft: () => void;
  onCancelEdit?: () => void;
};

const ESTADO_COLOR: Record<NewsEstado, string> = {
  PUBLICADO: 'text-emerald-700',
  BORRADOR: 'text-amber-700',
};

export function NewsPublishActionsCard({
  mode,
  estado,
  ultimaModificacion,
  isSubmitting = false,
  onPublish,
  onSaveDraft,
  onCancelEdit,
}: Props) {
  const isEdit = mode === 'edit';

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-maps-border bg-white p-5 shadow-card">
      <div className="text-sm font-semibold text-maps-heading">Acciones de Publicación</div>

      <button
        type="button"
        onClick={onPublish}
        disabled={isSubmitting}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-maps-brand px-4 py-2.5 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send size={16} strokeWidth={1.75} />
        {isEdit ? 'Actualizar y Publicar' : 'Publicar Ahora'}
      </button>

      <button
        type="button"
        onClick={onSaveDraft}
        disabled={isSubmitting}
        className="inline-flex items-center justify-center gap-2 rounded-lg border border-maps-border bg-white px-4 py-2.5 text-sm font-semibold text-maps-body transition hover:bg-maps-surface disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save size={16} strokeWidth={1.75} />
        {isEdit ? 'Guardar cambios' : 'Guardar Borrador'}
      </button>

      {isEdit && onCancelEdit ? (
        <button
          type="button"
          onClick={onCancelEdit}
          className="text-xs text-maps-muted underline-offset-2 hover:text-maps-heading hover:underline"
        >
          Cancelar edición
        </button>
      ) : null}

      <div className="border-t border-maps-border pt-3 text-xs text-maps-muted">
        Estado: <span className={`font-semibold ${ESTADO_COLOR[estado]}`}>{ESTADO_LABEL[estado]}</span>
        <span className="mx-1.5">·</span>
        Último cambio: {relativeTimeFromNow(ultimaModificacion)}
      </div>
    </div>
  );
}
