import { useMemo, useRef, useState } from 'react';

import { getApiErrorMessage } from '@/modules/admin/lib/apiError';

import { useAdminLibrary } from '@/modules/admin/hooks/useAdminLibrary';

import { LibraryHeader } from '@/modules/admin/components/LibraryHeader';

import { LibraryToolbar } from '@/modules/admin/components/LibraryToolbar';

import { LibraryRamoTable } from '@/modules/admin/components/LibraryRamoTable';

import { LibraryRamoFormModal } from '@/modules/admin/components/LibraryRamoFormModal';

import { LibraryRamoDeleteModal } from '@/modules/admin/components/LibraryRamoDeleteModal';

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

  const [formSubmitting, setFormSubmitting] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);

  const [actionBusy, setActionBusy] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const actionLockRef = useRef(false);

  function flash(message: string) {
    setSuccess(message);
    window.setTimeout(() => setSuccess(null), 3500);
  }



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
        flash('Ramo actualizado correctamente');

      } else {

        await create(input);
        flash('Ramo creado correctamente');

      }

      setFormModal((s) => ({ ...s, open: false }));

    } catch (err) {

      setFormError(getApiErrorMessage(err));

    } finally {

      setFormSubmitting(false);

    }

  }



  async function handleToggle(ramo: Ramo) {
    if (actionLockRef.current) return;
    const action = ramo.activo ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Querés ${action} “${ramo.nombre}”?`)) return;

    actionLockRef.current = true;
    setActionBusy(true);

    setActionError(null);

    try {

      await toggleActivo(ramo.id, !ramo.activo);
      flash(ramo.activo ? 'Ramo desactivado' : 'Ramo activado');

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
      flash('Ramo eliminado');

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

      {actionError ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          {actionError}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900" role="status">
          {success}
        </p>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-maps-border bg-white px-6 py-10 text-center text-sm text-maps-muted">
          Cargando ramos…
        </div>
      ) : (
        <LibraryRamoTable
          ramos={filtered}
          onEdit={openEdit}
          onToggle={handleToggle}
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
