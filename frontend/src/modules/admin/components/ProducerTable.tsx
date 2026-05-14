import { Inbox } from 'lucide-react';
import { Avatar } from '@/shared/components/Avatar';
import { relativeTimeFromNow } from '@/shared/utils/relativeTime';
import { ProducerActionsMenu } from '@/modules/admin/components/ProducerActionsMenu';
import { ProducerStatusBadge } from '@/modules/admin/components/ProducerStatusBadge';
import type { Producer } from '@/modules/admin/types/producer';
import { producerNombreCompleto } from '@/modules/admin/types/producer';

type Props = {
  producers: Producer[];
  onView: (p: Producer) => void;
  onEdit: (p: Producer) => void;
  onToggleEstado: (p: Producer) => void;
  emptyMessage?: string;
};

const COLUMNS = ['Nombre', 'Estado', 'DNI', 'Últ. act. cuenta', 'Acciones'];

export function ProducerTable({
  producers,
  onView,
  onEdit,
  onToggleEstado,
  emptyMessage = 'No encontramos productores con esos criterios.',
}: Props) {
  if (producers.length === 0) {
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
      {/* Desktop table */}
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
          <tbody>
            {producers.map((p, idx) => {
              const name = producerNombreCompleto(p);
              return (
                <tr
                  key={p.id}
                  className={[
                    'transition hover:bg-maps-surface/60',
                    idx > 0 ? 'border-t border-maps-border' : '',
                  ].join(' ')}
                >
                  <td className="whitespace-nowrap px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={name} src={p.avatarUrl} size="md" />
                      <span className="text-sm font-semibold text-maps-heading">{name}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5">
                    <ProducerStatusBadge estado={p.estado} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-sm font-semibold text-maps-heading">
                    {p.dni}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-sm text-maps-muted">
                    {relativeTimeFromNow(p.ultimaActividad)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5">
                    <ProducerActionsMenu
                      producer={p}
                      onView={onView}
                      onEdit={onEdit}
                      onToggleEstado={onToggleEstado}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="flex flex-col divide-y divide-maps-border lg:hidden">
        {producers.map((p) => {
          const name = producerNombreCompleto(p);
          return (
            <li key={p.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3">
                <Avatar name={name} src={p.avatarUrl} size="md" />
                <div className="flex flex-1 flex-col">
                  <span className="text-sm font-semibold text-maps-heading">{name}</span>
                  <span className="text-xs text-maps-muted">DNI {p.dni}</span>
                </div>
                <ProducerStatusBadge estado={p.estado} />
              </div>
              <div className="flex items-center justify-between text-xs text-maps-muted">
                <span>Cuenta: {relativeTimeFromNow(p.ultimaActividad)}</span>
                <ProducerActionsMenu
                  producer={p}
                  onView={onView}
                  onEdit={onEdit}
                  onToggleEstado={onToggleEstado}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
