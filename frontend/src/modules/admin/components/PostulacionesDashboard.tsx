import { useMemo, useRef, useState } from 'react';
import { PostulacionesTable } from '@/modules/admin/components/PostulacionesTable';
import { useAdminPostulaciones } from '@/modules/admin/hooks/useAdminPostulaciones';
import type { Postulacion } from '@/modules/admin/types/postulacion';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import { useAuthStore } from '@/store/authStore';
import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import {
  MapsFeedbackToastHost,
  useMapsFeedback,
} from '@/shared/components/MapsFeedbackToast';
import { TablePagination } from '@/shared/components/TablePagination';

export function PostulacionesDashboard() {
  const { data, loading, error, refetch, remove } = useAdminPostulaciones();
  const canDelete = useAuthStore((s) => s.user?.rol === 'SUPERADMIN');
  const { toast, dismiss, showSuccess } = useMapsFeedback();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [pendingDelete, setPendingDelete] = useState<Postulacion | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteLockRef = useRef(false);

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

  function requestDelete(postulacion: Postulacion) {
    setDeleteError(null);
    setPendingDelete(postulacion);
  }

  function closeDeleteConfirm() {
    if (deleting || deleteLockRef.current) return;
    setPendingDelete(null);
    setDeleteError(null);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete || deleting || deleteLockRef.current) return;
    deleteLockRef.current = true;
    setDeleting(true);
    setDeleteError(null);
    try {
      await remove(pendingDelete.id);
      setPendingDelete(null);
      showSuccess('Postulación eliminada');
    } catch (err) {
      setDeleteError(
        getApiErrorMessage(err, 'No se pudo eliminar la postulación. Intentá nuevamente.'),
      );
    } finally {
      deleteLockRef.current = false;
      setDeleting(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 px-4 py-5 sm:px-8 sm:py-6">
      <MapsFeedbackToastHost toast={toast} onDismiss={dismiss} />
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
          onDelete={canDelete ? requestDelete : undefined}
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

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        onClose={closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar esta postulación?"
        description={
          pendingDelete ? (
            <>
              Se eliminarán definitivamente los datos de{' '}
              <strong className="text-maps-heading">{pendingDelete.nombreCompleto}</strong>.
              <span className="mt-1 block">Esta acción no se puede deshacer.</span>
            </>
          ) : null
        }
        tone="danger"
        busy={deleting}
        error={deleteError}
        confirmLabel="Eliminar definitivamente"
        confirmLoadingLabel="Eliminando…"
        ariaLabel="Confirmar eliminación de postulación"
      />
    </div>
  );
}
