import { useMemo, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useProducers } from '@/modules/admin/hooks/useProducers';
import { useProducerFilters } from '@/modules/admin/hooks/useProducerFilters';
import { ProducersGreeting } from '@/modules/admin/components/ProducersGreeting';
import { ProducersToolbar } from '@/modules/admin/components/ProducersToolbar';
import { ProducerTable } from '@/modules/admin/components/ProducerTable';
import { ProducersPagination } from '@/modules/admin/components/ProducersPagination';
import { ProducerFilterModal } from '@/modules/admin/components/ProducerFilterModal';
import { ProducerFormModal } from '@/modules/admin/components/ProducerFormModal';
import { ProducerViewModal } from '@/modules/admin/components/ProducerViewModal';
import { DeactivateConfirmModal } from '@/modules/admin/components/DeactivateConfirmModal';
import type { Producer } from '@/modules/admin/types/producer';

type Scope = 'all' | 'active' | 'inactive';

type Props = {
  scope: Scope;
};

const TITLE_BY_SCOPE: Record<Scope, string> = {
  all: 'Listado de Productores',
  active: 'Listado de Productores',
  inactive: 'Productores Inactivos',
};

export function ProducersDashboard({ scope }: Props) {
  const user = useAuthStore((s) => s.user);
  const greetingName = user?.rol === 'SUPERADMIN' ? 'SuperAdmin' : 'Admin';

  const producers = useProducers((s) => s.producers);
  const addProducer = useProducers((s) => s.addProducer);
  const updateProducer = useProducers((s) => s.updateProducer);
  const setEstado = useProducers((s) => s.setEstado);

  const filtersHook = useProducerFilters();
  const { search, setSearch, filters, setFilter, reset, apply, activeCount } = filtersHook;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [filterOpen, setFilterOpen] = useState(false);
  const [viewing, setViewing] = useState<Producer | null>(null);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirming, setConfirming] = useState<Producer | null>(null);

  const scoped = useMemo(() => {
    if (scope === 'active') return producers.filter((p) => p.estado === 'ACTIVO');
    if (scope === 'inactive') return producers.filter((p) => p.estado === 'INACTIVO');
    return producers;
  }, [producers, scope]);

  const filtered = useMemo(() => apply(scoped), [apply, scoped]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const totalProductores = producers.length;

  function handleNew() {
    setEditing(null);
    setCreating(true);
  }

  function handleEdit(p: Producer) {
    setViewing(null);
    setCreating(false);
    setEditing(p);
  }

  function handleToggleEstado(p: Producer) {
    setConfirming(p);
  }

  function confirmToggle(p: Producer) {
    setEstado(p.id, p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO');
  }

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <ProducersGreeting name={greetingName} totalProductores={totalProductores} />

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
        newButtonHint={
          scope === 'inactive'
            ? 'Crear nuevo productor (quedará Activo)'
            : undefined
        }
      />

      <ProducerTable
        producers={paginated}
        onView={(p) => setViewing(p)}
        onEdit={handleEdit}
        onToggleEstado={handleToggleEstado}
      />

      {filtered.length > 0 ? (
        <ProducersPagination
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
        hideEstado={scope !== 'all'}
      />

      <ProducerFormModal
        isOpen={creating}
        mode="create"
        onClose={() => setCreating(false)}
        onSubmit={(input) => {
          addProducer(input);
          setPage(1);
        }}
      />

      <ProducerFormModal
        isOpen={editing !== null}
        mode="edit"
        producer={editing}
        onClose={() => setEditing(null)}
        onSubmit={(input) => {
          if (editing) updateProducer(editing.id, input);
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
        onClose={() => setConfirming(null)}
        onConfirm={confirmToggle}
      />
    </div>
  );
}
