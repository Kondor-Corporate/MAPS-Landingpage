/** Tabla del listado admin con miniatura, badges y acciones por fila. */
import { Inbox } from 'lucide-react';
import { NewsImage } from '@/shared/components/NewsImage';
import { CATEGORIA_LABEL, type News } from '@/modules/admin/types/news';
import { NewsAudienceBadge } from '@/modules/admin/components/NewsAudienceBadge';
import { NewsStatusBadge } from '@/modules/admin/components/NewsStatusBadge';
import { NewsTableActions } from '@/modules/admin/components/NewsTableActions';
import { formatNewsTableDate } from '@/shared/utils/newsDate';

type Props = {
  news: News[];
  onView: (n: News) => void;
  onEdit: (n: News) => void;
  onDelete: (n: News) => void;
  onUnpublish?: (n: News) => void;
  emptyMessage?: string;
};

const COLUMNS = ['Noticia', 'Fecha', 'Audiencia', 'Estado', 'Acciones'];

function Thumbnail({ item, index }: { item: News; index: number }) {
  return (
    <NewsImage
      src={item.imagenPortada}
      categoryKey={item.categoria}
      categoryIndex={index}
      className="h-12 w-16 shrink-0 rounded-md"
      iconSize={16}
    />
  );
}

export function RecentNewsTable({
  news,
  onView,
  onEdit,
  onDelete,
  onUnpublish,
  emptyMessage = 'No hay noticias que coincidan con los filtros aplicados.',
}: Props) {
  if (news.length === 0) {
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
            {news.map((n, idx) => (
              <tr
                key={n.id}
                className={[
                  'transition hover:bg-maps-surface/60',
                  idx > 0 ? 'border-t border-maps-border' : '',
                ].join(' ')}
              >
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-3">
                    <Thumbnail item={n} index={idx} />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold text-maps-heading">
                        {n.titulo}
                      </span>
                      <span className="text-xs text-maps-muted">
                        Categoría {CATEGORIA_LABEL[n.categoria]}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-sm text-maps-muted">
                  {formatNewsTableDate(n.fechaPublicacion)}
                </td>
                <td className="whitespace-nowrap px-6 py-3.5">
                  <NewsAudienceBadge audiencia={n.audiencia} />
                </td>
                <td className="whitespace-nowrap px-6 py-3.5">
                  <NewsStatusBadge estado={n.estado} />
                </td>
                <td className="whitespace-nowrap px-6 py-3.5 text-right">
                  <NewsTableActions
                    news={n}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onUnpublish={onUnpublish}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col divide-y divide-maps-border md:hidden">
        {news.map((n, idx) => (
          <li key={n.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start gap-3">
              <Thumbnail item={n} index={idx} />
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold text-maps-heading">{n.titulo}</span>
                <span className="text-xs text-maps-muted">
                  Categoría {CATEGORIA_LABEL[n.categoria]} · {formatNewsTableDate(n.fechaPublicacion)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <NewsAudienceBadge audiencia={n.audiencia} />
                <NewsStatusBadge estado={n.estado} />
              </div>
              <NewsTableActions
                news={n}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onUnpublish={onUnpublish}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
