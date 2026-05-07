import { useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import { TablePagination } from '@/shared/components/TablePagination';
import { useNews } from '@/modules/admin/hooks/useNews';
import { useNewsFilters } from '@/modules/admin/hooks/useNewsFilters';
import { NewsHeader } from '@/modules/admin/components/NewsHeader';
import { NewsTabs, type NewsTab } from '@/modules/admin/components/NewsTabs';
import {
  EMPTY_FORM,
  NewsForm,
  type NewsFormState,
} from '@/modules/admin/components/NewsForm';
import { RecentNewsTable } from '@/modules/admin/components/RecentNewsTable';
import { NewsFilterModal } from '@/modules/admin/components/NewsFilterModal';
import { NewsViewModal } from '@/modules/admin/components/NewsViewModal';
import { NewsDeleteConfirmModal } from '@/modules/admin/components/NewsDeleteConfirmModal';
import type { News, NewsInput } from '@/modules/admin/types/news';

function newsToFormState(n: News): NewsFormState {
  return {
    titulo: n.titulo,
    categoria: n.categoria,
    audiencia: n.audiencia,
    cuerpo: n.cuerpo,
    imagenPortada: n.imagenPortada,
    estado: n.estado,
    ultimaModificacion: n.ultimaModificacion,
  };
}

export function NewsManagementDashboard() {
  const news = useNews((s) => s.news);
  const addNews = useNews((s) => s.addNews);
  const updateNews = useNews((s) => s.updateNews);
  const removeNews = useNews((s) => s.removeNews);

  const filtersHook = useNewsFilters();
  const { filters, setFilter, reset, apply, activeCount } = filtersHook;

  const [activeTab, setActiveTab] = useState<NewsTab>('crear');
  const [formState, setFormState] = useState<NewsFormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<News | null>(null);

  const [viewing, setViewing] = useState<News | null>(null);
  const [deleting, setDeleting] = useState<News | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const filtered = useMemo(() => apply(news), [apply, news]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  function handleEdit(n: News) {
    setEditing(n);
    setFormState(newsToFormState(n));
    setActiveTab('crear');
  }

  function handleCancelEdit() {
    setEditing(null);
    setFormState({ ...EMPTY_FORM, ultimaModificacion: new Date().toISOString() });
  }

  function handleSubmit(input: NewsInput) {
    if (editing) {
      updateNews(editing.id, input);
    } else {
      addNews(input);
      setPage(1);
    }
    setEditing(null);
    setFormState({ ...EMPTY_FORM, ultimaModificacion: new Date().toISOString() });
  }

  function handleConfirmDelete(n: News) {
    if (editing && editing.id === n.id) {
      handleCancelEdit();
    }
    removeNews(n.id);
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <NewsHeader />
      <NewsTabs active={activeTab} onChange={setActiveTab} />

      {activeTab === 'crear' ? (
        <NewsForm
          mode={editing ? 'edit' : 'create'}
          state={formState}
          onChange={setFormState}
          onSubmit={handleSubmit}
          onCancelEdit={editing ? handleCancelEdit : undefined}
        />
      ) : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-maps-heading">Noticias Recientes</h2>
          <button
            type="button"
            onClick={() => setFilterOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-maps-border bg-white px-3 py-2 text-sm font-medium text-maps-body shadow-card transition hover:bg-maps-surface"
          >
            <Filter size={14} strokeWidth={1.75} />
            Filtrar
            {activeCount > 0 ? (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-maps-brand px-1.5 text-[11px] font-semibold text-white">
                {activeCount}
              </span>
            ) : null}
          </button>
        </div>

        <RecentNewsTable
          news={paginated}
          onView={(n) => setViewing(n)}
          onEdit={handleEdit}
          onDelete={(n) => setDeleting(n)}
        />

        {filtered.length > pageSize ? (
          <TablePagination
            page={safePage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(1);
            }}
          />
        ) : null}
      </section>

      <NewsFilterModal
        isOpen={filterOpen}
        initialFilters={filters}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          (Object.keys(next) as (keyof typeof next)[]).forEach((k) => setFilter(k, next[k]));
          setPage(1);
        }}
        onReset={() => {
          reset();
          setPage(1);
        }}
      />

      <NewsViewModal
        isOpen={viewing !== null}
        news={viewing}
        onClose={() => setViewing(null)}
        onEdit={handleEdit}
      />

      <NewsDeleteConfirmModal
        isOpen={deleting !== null}
        news={deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
