import { useMemo, useState } from 'react';
import { PostulacionesTable } from '@/modules/admin/components/PostulacionesTable';
import { useAdminPostulaciones } from '@/modules/admin/hooks/useAdminPostulaciones';
import { TablePagination } from '@/shared/components/TablePagination';

export function PostulacionesDashboard() {
  const { data, loading, error, refetch } = useAdminPostulaciones();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const hasSearch = search.trim() !== '';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data;
    return data.filter((p) =>
      [p.nombreCompleto, p.dni, p.matricula, p.localidad].some((field) =>
        field.toLowerCase().includes(term),
      ),
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  return (
    <div className="flex min-w-0 flex-col gap-6 px-4 py-5 sm:px-8 sm:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-maps-heading">Postulaciones</h1>
        <p className="text-sm text-maps-muted">
          Postulaciones recibidas desde la página pública.
        </p>
      </div>

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          <span>{error}</span>
          <button type="button" onClick={() => void refetch()} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      ) : null}

      <div className="flex">
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nombre, DNI, matrícula o localidad"
          className="w-full max-w-sm rounded-lg border border-maps-border bg-white px-3 py-2 text-sm text-maps-heading transition focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
        />
      </div>

      {loading ? (
        <div className="rounded-2xl border border-maps-border bg-white px-6 py-10 text-center text-sm text-maps-muted">
          Cargando postulaciones…
        </div>
      ) : !error || data.length > 0 ? (
        <PostulacionesTable
          postulaciones={paginated}
          emptyMessage={
            hasSearch
              ? 'No encontramos postulaciones con esos criterios.'
              : 'Todavía no hay postulaciones.'
          }
        />
      ) : null}

      {!loading && filtered.length > 0 ? (
        <TablePagination
          page={safePage}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}
    </div>
  );
}
