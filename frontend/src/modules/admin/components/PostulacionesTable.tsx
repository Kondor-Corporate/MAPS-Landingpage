import { Inbox } from 'lucide-react';
import type { Postulacion, PostulacionSituacion } from '@/modules/admin/types/postulacion';
import { formatDateShort } from '@/shared/utils/date';

type Props = {
  postulaciones: Postulacion[];
  emptyMessage?: string;
};

const COLUMNS = ['Nombre completo', 'DNI', 'Teléfono', 'Matrícula', 'Localidad', 'Situación', 'Recibida'];

const SITUACION_LABEL: Record<PostulacionSituacion, string> = {
  PRODUCTOR_NUEVO: 'Productor nuevo',
  TRABAJA_CON_OTRAS: 'Trabaja con otras compañías',
};

function SituacionBadge({ situacion }: { situacion: PostulacionSituacion }) {
  const isNuevo = situacion === 'PRODUCTOR_NUEVO';
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
        isNuevo ? 'bg-maps-brand-soft text-maps-brand' : 'bg-amber-100 text-amber-800',
      ].join(' ')}
    >
      {SITUACION_LABEL[situacion]}
    </span>
  );
}

export function PostulacionesTable({
  postulaciones,
  emptyMessage = 'Todavía no hay postulaciones.',
}: Props) {
  if (postulaciones.length === 0) {
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
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-maps-muted"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {postulaciones.map((p, idx) => (
              <tr
                key={p.id}
                className={['transition hover:bg-maps-surface/60', idx > 0 ? 'border-t border-maps-border' : ''].join(
                  ' ',
                )}
              >
                <td className="whitespace-nowrap px-6 py-3.5 text-sm font-semibold text-maps-heading">
                  {p.nombreCompleto}
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-sm text-maps-muted">{p.dni}</td>
                <td className="whitespace-nowrap px-6 py-3.5 text-sm text-maps-muted">
                  {p.telefono}
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-sm text-maps-muted">
                  {p.matricula}
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-sm text-maps-muted">
                  {p.localidad}
                </td>
                <td className="whitespace-nowrap px-6 py-3.5">
                  <SituacionBadge situacion={p.situacion} />
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-sm text-maps-muted">
                  {formatDateShort(p.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col divide-y divide-maps-border md:hidden">
        {postulaciones.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-maps-heading">
                {p.nombreCompleto}
              </span>
              <SituacionBadge situacion={p.situacion} />
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-maps-muted">
              <div>
                <dt className="font-semibold text-maps-body">DNI</dt>
                <dd>{p.dni}</dd>
              </div>
              <div>
                <dt className="font-semibold text-maps-body">Teléfono</dt>
                <dd>{p.telefono}</dd>
              </div>
              <div>
                <dt className="font-semibold text-maps-body">Matrícula</dt>
                <dd>{p.matricula}</dd>
              </div>
              <div>
                <dt className="font-semibold text-maps-body">Localidad</dt>
                <dd>{p.localidad}</dd>
              </div>
              <div>
                <dt className="font-semibold text-maps-body">Recibida</dt>
                <dd>{formatDateShort(p.createdAt)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
