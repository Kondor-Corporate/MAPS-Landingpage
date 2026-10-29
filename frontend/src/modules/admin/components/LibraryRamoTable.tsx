import { Inbox } from 'lucide-react';
import { RamoIcon } from '@/modules/admin/components/RamoIcon';
import { LibraryRamoStatusBadge } from '@/modules/admin/components/LibraryRamoStatusBadge';
import { LibraryRamoTipoBadge } from '@/modules/admin/components/LibraryRamoTipoBadge';
import { LibraryRamoTableActions } from '@/modules/admin/components/LibraryRamoTableActions';
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
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-maps-border bg-white px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-maps-brand-soft text-maps-brand">
          <Inbox size={22} strokeWidth={1.75} />
        </span>
        <p className="text-sm font-medium text-maps-heading">Sin resultados</p>
        <p className="text-xs text-maps-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-maps-border bg-white shadow-card">
      <div className="hidden overflow-x-auto md:block">
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
          <tbody>
            {ramos.map((ramo, idx) => (
              <tr
                key={ramo.id}
                className={[
                  'transition hover:bg-maps-surface/60',
                  idx > 0 ? 'border-t border-maps-border' : '',
                ].join(' ')}
              >
                <td className="whitespace-nowrap px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-maps-brand-soft text-maps-brand">
                      <RamoIcon icon={ramo.icono} size={18} />
                    </span>
                    <span className="text-sm font-semibold text-maps-heading">{ramo.nombre}</span>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-3.5">
                  <LibraryRamoTipoBadge tipo={ramo.tipo} />
                </td>
                <td className="max-w-xs px-6 py-3.5">
                  <p className="line-clamp-2 text-sm text-maps-body">{ramo.descripcion}</p>
                </td>
                <td className="whitespace-nowrap px-6 py-3.5">
                  {ramo.gdriveUrl ? (
                    <a
                      href={ramo.gdriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={ramo.gdriveUrl}
                      className="text-sm text-maps-brand underline-offset-2 hover:underline"
                    >
                      {truncateUrl(ramo.gdriveUrl)}
                    </a>
                  ) : (
                    <span className="text-sm text-maps-muted-soft">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-6 py-3.5">
                  <LibraryRamoStatusBadge activo={ramo.activo} />
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-right">
                  <LibraryRamoTableActions
                    ramo={ramo}
                    onEdit={onEdit}
                    onToggle={onToggle}
                    onDelete={onDelete}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col divide-y divide-maps-border md:hidden">
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
              <div className="flex items-center gap-1">
                <LibraryRamoStatusBadge activo={ramo.activo} />
                <LibraryRamoTableActions
                  ramo={ramo}
                  onEdit={onEdit}
                  onToggle={onToggle}
                  onDelete={onDelete}
                />
              </div>
            </div>
            <p className="text-sm text-maps-body">{ramo.descripcion}</p>
            {ramo.gdriveUrl ? (
              <a
                href={ramo.gdriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-xs text-maps-brand underline-offset-2 hover:underline"
                title={ramo.gdriveUrl}
              >
                {truncateUrl(ramo.gdriveUrl, 50)}
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
