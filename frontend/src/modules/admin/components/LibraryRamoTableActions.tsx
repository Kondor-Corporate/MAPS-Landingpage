/** Botones de acción por fila: editar, activar/desactivar y eliminar. */
import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import type { Ramo } from '@/modules/admin/types/library';

type Props = {
  ramo: Ramo;
  onEdit: (ramo: Ramo) => void;
  onToggle: (ramo: Ramo) => void;
  onDelete: (ramo: Ramo) => void;
};

const baseBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-maps-muted transition hover:bg-maps-surface';

export function LibraryRamoTableActions({ ramo, onEdit, onToggle, onDelete }: Props) {
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={() => onEdit(ramo)}
        className={`${baseBtn} hover:text-maps-brand`}
        aria-label={`Editar ${ramo.nombre}`}
        title="Editar"
      >
        <Pencil size={16} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => onToggle(ramo)}
        className={`${baseBtn} hover:text-maps-brand`}
        aria-label={ramo.activo ? `Desactivar ${ramo.nombre}` : `Activar ${ramo.nombre}`}
        title={ramo.activo ? 'Desactivar' : 'Activar'}
      >
        {ramo.activo ? <Eye size={16} strokeWidth={1.75} /> : <EyeOff size={16} strokeWidth={1.75} />}
      </button>
      <button
        type="button"
        onClick={() => onDelete(ramo)}
        className={`${baseBtn} hover:bg-rose-50 hover:text-rose-600`}
        aria-label={`Eliminar ${ramo.nombre}`}
        title="Eliminar"
      >
        <Trash2 size={16} strokeWidth={1.75} />
      </button>
    </div>
  );
}
