import { useMemo, useRef, useState } from 'react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import { useAdminLibrary } from '@/modules/admin/hooks/useAdminLibrary';
import { LibraryHeader } from '@/modules/admin/components/LibraryHeader';
import { LibraryToolbar } from '@/modules/admin/components/LibraryToolbar';
import { LibraryRamoTable } from '@/modules/admin/components/LibraryRamoTable';
import { LibraryRamoFormModal } from '@/modules/admin/components/LibraryRamoFormModal';
import { LibraryRamoDeleteModal } from '@/modules/admin/components/LibraryRamoDeleteModal';
import { LibraryRamoToggleConfirmModal } from '@/modules/admin/components/LibraryRamoToggleConfirmModal';
import { MapsFeedbackToastHost, useMapsFeedback } from '@/shared/components/MapsFeedbackToast';
import type { Ramo, RamoInput } from '@/modules/admin/types/library';

type FormModalState = {
  open: boolean;
  mode: 'create' | 'edit';
  ramo: Ramo | null;
};

export function LibraryManagementDashboard() {
  const { data: ramos, loading, error, refetch, create, update, toggleActivo, remove } =
    useAdminLibrary();

  const [search, setSearch] = useState('');
  const [formModal, setFormModal] = useState<FormModalState>({
    open: false,
    mode: 'create',
    ramo: null,
  });
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; ramo: Ramo | null }>({
    open: false,
    ramo: null,
  });
  const [toggleModal, setToggleModal] = useState<{ open: boolean; ramo: Ramo | null }>({
    open: false,
    ramo: null,
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const actionLockRef = useRef(false);

  const { toast, dismiss, showSuccess } = useMapsFeedback();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = [...ramos].sort((a, b) => a.orden - b.orden);
    if (!q) return list;
    return list.filter((r) => r.nombre.toLowerCase().includes(q));
  }, [ramos, search]);

  function openCreate() {
    setFormError(null);
    setFormModal({ open: true, mode: 'create', ramo: null });
  }

  function openEdit(ramo: Ramo) {
    setFormError(null);
    setFormModal({ open: true, mode: 'edit', ramo });
  }

  async function handleFormSubmit(input: RamoInput) {
    setFormSubmitting(true);
    setFormError(null);
    try {
      if (formModal.mode === 'edit' && formModal.ramo) {
        await update(formModal.ramo.id, input);
        showSuccess('Ramo actualizado correctamente');
      } else {
        await create(input);
        showSuccess('Ramo creado correctamente');
      }
      setFormModal((s) => ({ ...s, open: false }));
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleToggleConfirm(ramo: Ramo) {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setActionBusy(true);
    setActionError(null);
    try {
      await toggleActivo(ramo.id, !ramo.activo);
      showSuccess(ramo.activo ? 'Ramo desactivado' : 'Ramo activado');
      setToggleModal({ open: false, ramo: null });
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteModal.ramo || actionLockRef.current) return;
    actionLockRef.current = true;
    setActionBusy(true);
    setActionError(null);
    try {
      await remove(deleteModal.ramo.id);
      showSuccess('Ramo eliminado');
      setDeleteModal({ open: false, ramo: null });
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      actionLockRef.current = false;
      setActionBusy(false);
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-8 px-4 py-5 sm:px-8 sm:py-6">
      <MapsFeedbackToastHost toast={toast} onDismiss={dismiss} />

      <LibraryHeader />
      <LibraryToolbar search={search} onSearchChange={setSearch} onNewClick={openCreate} />

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="font-semibold underline"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-maps-border bg-white px-6 py-10 text-center text-sm text-maps-muted">
          Cargando ramos…
        </div>
      ) : (
        <LibraryRamoTable
          ramos={filtered}
          onEdit={openEdit}
          onToggle={(r) => setToggleModal({ open: true, ramo: r })}
          onDelete={(r) => setDeleteModal({ open: true, ramo: r })}
        />
      )}

      <LibraryRamoFormModal
        isOpen={formModal.open}
        mode={formModal.mode}
        ramo={formModal.ramo}
        submitError={formError}
        submitting={formSubmitting}
        onClose={() => {
          if (!formSubmitting) setFormModal((s) => ({ ...s, open: false }));
        }}
        onSubmit={handleFormSubmit}
      />
      <LibraryRamoToggleConfirmModal
        isOpen={toggleModal.open}
        ramo={toggleModal.ramo}
        isBusy={actionBusy}
        submitError={actionError}
        onClose={() => {
          if (!actionBusy) setToggleModal({ open: false, ramo: null });
        }}
        onConfirm={handleToggleConfirm}
      />
      <LibraryRamoDeleteModal
        isOpen={deleteModal.open}
        ramo={deleteModal.ramo}
        isBusy={actionBusy}
        submitError={actionError}
        onClose={() => {
          if (!actionBusy) setDeleteModal({ open: false, ramo: null });
        }}
        onConfirm={() => void handleDeleteConfirm()}
      />
    </div>
  );
}
