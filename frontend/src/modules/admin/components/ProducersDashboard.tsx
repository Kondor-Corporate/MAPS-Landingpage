import { useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useAdminProducers } from '@/modules/admin/hooks/useAdminProducers';
import { useProducerFilters } from '@/modules/admin/hooks/useProducerFilters';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import { ProducersGreeting } from '@/modules/admin/components/ProducersGreeting';
import { ProducersToolbar } from '@/modules/admin/components/ProducersToolbar';
import { ProducerTable } from '@/modules/admin/components/ProducerTable';
import { TablePagination } from '@/shared/components/TablePagination';
import { ProducerFilterModal } from '@/modules/admin/components/ProducerFilterModal';
import { ProducerFormModal } from '@/modules/admin/components/ProducerFormModal';
import { ProducerViewModal } from '@/modules/admin/components/ProducerViewModal';
import { DeactivateConfirmModal } from '@/modules/admin/components/DeactivateConfirmModal';
import type { Producer, ProducerFormSubmit } from '@/modules/admin/types/producer';

type Scope = 'active' | 'inactive';

type Props = {
  scope: Scope;
};

const TITLE_BY_SCOPE: Record<Scope, string> = {
  active: 'Listado de Productores',
  inactive: 'Productores Inactivos',
};

export function ProducersDashboard({ scope }: Props) {
  const user = useAuthStore((s) => s.user);
  const greetingName = user?.rol === 'SUPERADMIN' ? 'SuperAdmin' : 'Admin';

  const {
    data: producers,
    loading,
    error,
    refetch,
    create,
    update,
    uploadCertificacion,
    deleteCertificacion,
    activate,
    deactivate,
  } = useAdminProducers(scope);

  const filtersHook = useProducerFilters();
  const { search, setSearch, filters, setFilter, reset, apply, activeCount } = filtersHook;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [filterOpen, setFilterOpen] = useState(false);
  const [viewing, setViewing] = useState<Producer | null>(null);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<Producer | null>(null);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [toggleBusy, setToggleBusy] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => apply(producers), [apply, producers]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const totalProductores = producers.length;

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3800);
  }

  function handleNew() {
    setFormError(null);
    setEditing(null);
    setCreating(true);
  }

  function handleEdit(p: Producer) {
    setFormError(null);
    setViewing(null);
    setCreating(false);
    setEditing(p);
  }

  function handleToggleEstado(p: Producer) {
    setToggleError(null);
    setConfirming(p);
  }

  async function confirmToggle(p: Producer) {
    setToggleBusy(true);
    setToggleError(null);
    try {
      if (p.estado === 'ACTIVO') {
        await deactivate(p.id);
        flash('Productor desactivado');
      } else {
        await activate(p.id);
        flash('Productor reactivado');
      }
      setConfirming(null);
    } catch (err) {
      setToggleError(getApiErrorMessage(err));
    } finally {
      setToggleBusy(false);
    }
  }

  async function handleCreate(input: ProducerFormSubmit) {
    setFormSubmitting(true);
    setFormError(null);
    try {
      await create({
        ...input,
        activo: true,
      });
      flash('Productor creado');
      setCreating(false);
      setPage(1);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleUpdate(input: ProducerFormSubmit) {
    if (!editing) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      await update(editing.id, input);
      flash('Cambios guardados');
      setEditing(null);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setFormSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <ProducersGreeting name={greetingName} totalProductores={totalProductores} />

      {toast ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {toast}
        </p>
      ) : null}

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          <span>{error}</span>
          <button type="button" onClick={() => void refetch()} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      ) : null}

      <ProducersToolbar
        title={TITLE_BY_SCOPE[scope]}
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onFilterClick={() => setFilterOpen(true)}
        onNewClick={handleNew}
        filterBadge={activeCount}
        newButtonHint={scope === 'inactive' ? 'Crear nuevo productor (quedará Activo)' : undefined}
      />

      {loading ? (
        <div className="rounded-2xl border border-maps-border bg-white px-6 py-10 text-center text-sm text-maps-muted">
          Cargando productores…
        </div>
      ) : (
        <ProducerTable
          producers={paginated}
          onView={(p) => setViewing(p)}
          onEdit={handleEdit}
          onToggleEstado={handleToggleEstado}
        />
      )}

      {!loading && filtered.length > 0 ? (
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

      <ProducerFilterModal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        initialFilters={filters}
        onApply={(next) => {
          (Object.keys(next) as (keyof typeof next)[]).forEach((k) => setFilter(k, next[k]));
          setPage(1);
        }}
        onReset={() => {
          reset();
          setPage(1);
        }}
        hideEstado
      />

      <ProducerFormModal
        isOpen={creating}
        mode="create"
        submitError={formError}
        submitting={formSubmitting}
        onClose={() => {
          if (!formSubmitting) setCreating(false);
        }}
        onSubmit={handleCreate}
      />

      <ProducerFormModal
        isOpen={editing !== null}
        mode="edit"
        producer={editing ? producers.find((p) => p.id === editing.id) ?? editing : null}
        submitError={formError}
        submitting={formSubmitting}
        onClose={() => {
          if (!formSubmitting) setEditing(null);
        }}
        onSubmit={handleUpdate}
        onUploadCertificacion={async (file, nombre) => {
          if (!editing) return;
          await uploadCertificacion(editing.id, file, nombre);
        }}
        onDeleteCertificacion={async (certId) => {
          if (!editing) return;
          await deleteCertificacion(editing.id, certId);
        }}
      />

      <ProducerViewModal
        isOpen={viewing !== null}
        producer={viewing}
        onClose={() => setViewing(null)}
        onEdit={(p) => handleEdit(p)}
      />

      <DeactivateConfirmModal
        isOpen={confirming !== null}
        producer={confirming}
        mode={confirming?.estado === 'ACTIVO' ? 'deactivate' : 'reactivate'}
        isBusy={toggleBusy}
        submitError={toggleError}
        onClose={() => {
          if (!toggleBusy) setConfirming(null);
        }}
        onConfirm={confirmToggle}
      />
    </div>
  );
}
