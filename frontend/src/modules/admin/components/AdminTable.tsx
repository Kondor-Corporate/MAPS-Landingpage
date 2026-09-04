import { Inbox } from 'lucide-react';
import { AdminActionsMenu } from '@/modules/admin/components/AdminActionsMenu';
import { AdminStatusBadge } from '@/modules/admin/components/AdminStatusBadge';
import type { Admin } from '@/modules/admin/types/admin';
import { relativeTimeFromNow } from '@/shared/utils/relativeTime';

type Props = {
  admins: Admin[];
  onEdit: (admin: Admin) => void;
  onToggleEstado: (admin: Admin) => void;
  onResetPassword: (admin: Admin) => void;
  emptyMessage?: string;
  highlightedId?: number | null;
};

const COLUMNS = ['Usuario', 'Estado', 'Último acceso', 'Creado', 'Acciones'];

function formatCreatedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function lastAccessLabel(lastLoginAt: string | null): string {
  return lastLoginAt ? relativeTimeFromNow(lastLoginAt) : 'Nunca';
}

export function AdminTable({
  admins,
  onEdit,
  onToggleEstado,
  onResetPassword,
  emptyMessage = 'No encontramos administradores con esos criterios.',
  highlightedId = null,
}: Props) {
  if (admins.length === 0) {
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
            {admins.map((admin, idx) => (
              <tr
                key={admin.id}
                className={[
                  'transition hover:bg-maps-surface/60',
                  idx > 0 ? 'border-t border-maps-border' : '',
                  highlightedId === admin.id ? 'maps-admin-row-highlight' : '',
                ].join(' ')}
              >
                <td className="whitespace-nowrap px-6 py-3.5 text-sm font-semibold text-maps-heading">
                  {admin.usuario}
                </td>
                <td className="whitespace-nowrap px-6 py-3.5">
                  <AdminStatusBadge activo={admin.activo} />
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-sm text-maps-muted">
                  {lastAccessLabel(admin.lastLoginAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-sm text-maps-muted">
                  {formatCreatedAt(admin.createdAt)}
                </td>
                <td className="whitespace-nowrap px-6 py-3.5">
                  <AdminActionsMenu
                    admin={admin}
                    onEdit={onEdit}
                    onToggleEstado={onToggleEstado}
                    onResetPassword={onResetPassword}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col divide-y divide-maps-border lg:hidden">
        {admins.map((admin) => (
          <li
            key={admin.id}
            className={[
              'flex flex-col gap-3 p-4',
              highlightedId === admin.id ? 'maps-admin-row-highlight' : '',
            ].join(' ')}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-semibold text-maps-heading">
                  {admin.usuario}
                </span>
                <AdminStatusBadge activo={admin.activo} />
              </div>
              <AdminActionsMenu
                admin={admin}
                onEdit={onEdit}
                onToggleEstado={onToggleEstado}
                onResetPassword={onResetPassword}
              />
            </div>
            <p className="text-xs text-maps-muted">
              Último acceso: {lastAccessLabel(admin.lastLoginAt)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
