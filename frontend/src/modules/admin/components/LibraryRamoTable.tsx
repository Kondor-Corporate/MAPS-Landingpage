import { Eye, EyeOff, Pencil, Trash2 } from 'lucide-react';
import { RamoIcon } from '@/modules/admin/components/RamoIcon';
import { LibraryRamoStatusBadge } from '@/modules/admin/components/LibraryRamoStatusBadge';
import { LibraryRamoTipoBadge } from '@/modules/admin/components/LibraryRamoTipoBadge';
import type { Ramo } from '@/modules/admin/types/library';

type Props = {
  ramos: Ramo[];
  onEdit: (ramo: Ramo) => void;
  onToggle: (ramo: Ramo) => void;
  onDelete: (ramo: Ramo) => void;
  emptyMessage?: string;
};

const COLUMNS = ['Nombre', 'Tipo', 'Descripción', 'Link Drive', 'Estado', 'Acciones'];

function truncateUrl(url: string, max = 40): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max)}…`;
}

export function LibraryRamoTable({
  ramos,
  onEdit,
  onToggle,
  onDelete,
  emptyMessage = 'No hay ramos que coincidan con la búsqueda.',
}: Props) {
  if (ramos.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-maps-border bg-white px-6 py-14 text-center text-sm text-maps-muted">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-maps-border bg-white shadow-card">
      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full">
          <thead className="bg-maps-surface">
            <tr>
              {COLUMNS.map((col, idx) => (
                <th
                  key={col}
                  scope="col"
                  className={[
                    'px-6 py-3 text-xs font-semibold uppercase tracking-wider text-maps-muted',
                    idx === COLUMNS.length - 1 ? 'text-right' : 'text-left',
                  ].join(' ')}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-maps-border">
            {ramos.map((ramo) => (
              <tr key={ramo.id} className="hover:bg-maps-surface/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-maps-brand-soft text-maps-brand">
                      <RamoIcon icon={ramo.icono} size={18} />
                    </span>
                    <span className="text-sm font-semibold text-maps-heading">{ramo.nombre}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <LibraryRamoTipoBadge tipo={ramo.tipo} />
                </td>
                <td className="max-w-xs px-6 py-4">
                  <p className="line-clamp-2 text-sm text-maps-body">{ramo.descripcion}</p>
                </td>
                <td className="px-6 py-4">
                  {ramo.gdriveUrl ? (
                    <span
                      className="text-sm text-maps-brand"
                      title={ramo.gdriveUrl}
                    >
                      {truncateUrl(ramo.gdriveUrl)}
                    </span>
                  ) : (
                    <span className="text-sm text-maps-muted-soft">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <LibraryRamoStatusBadge activo={ramo.activo} />
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(ramo)}
                      aria-label={`Editar ${ramo.nombre}`}
                      className="rounded-lg p-2 text-maps-muted transition hover:bg-maps-surface hover:text-maps-brand"
                    >
                      <Pencil size={16} strokeWidth={1.75} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggle(ramo)}
                      aria-label={ramo.activo ? `Desactivar ${ramo.nombre}` : `Activar ${ramo.nombre}`}
                      className="rounded-lg p-2 text-maps-muted transition hover:bg-maps-surface hover:text-maps-brand"
                    >
                      {ramo.activo ? (
                        <Eye size={16} strokeWidth={1.75} />
                      ) : (
                        <EyeOff size={16} strokeWidth={1.75} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(ramo)}
                      aria-label={`Eliminar ${ramo.nombre}`}
                      className="rounded-lg p-2 text-maps-muted transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={16} strokeWidth={1.75} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-maps-border lg:hidden">
        {ramos.map((ramo) => (
          <li key={ramo.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-maps-brand-soft text-maps-brand">
                  <RamoIcon icon={ramo.icono} size={16} />
                </span>
                <div>
                  <p className="font-semibold text-maps-heading">{ramo.nombre}</p>
                  <LibraryRamoTipoBadge tipo={ramo.tipo} />
                </div>
              </div>
              <LibraryRamoStatusBadge activo={ramo.activo} />
            </div>
            <p className="text-sm text-maps-body">{ramo.descripcion}</p>
            {ramo.gdriveUrl ? (
              <p className="truncate text-xs text-maps-brand" title={ramo.gdriveUrl}>
                {truncateUrl(ramo.gdriveUrl, 50)}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(ramo)}
                className="flex-1 rounded-lg border border-maps-border py-2 text-sm font-medium text-maps-heading"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => onToggle(ramo)}
                className="rounded-lg border border-maps-border px-3 py-2 text-maps-muted"
                aria-label={ramo.activo ? 'Desactivar' : 'Activar'}
              >
                {ramo.activo ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              <button
                type="button"
                onClick={() => onDelete(ramo)}
                className="rounded-lg border border-rose-200 px-3 py-2 text-rose-600"
                aria-label="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
