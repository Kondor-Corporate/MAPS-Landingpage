import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminFormModal } from '@/modules/admin/components/AdminFormModal';
import { AdminResetPasswordModal } from '@/modules/admin/components/AdminResetPasswordModal';
import { AdminStatusConfirmModal } from '@/modules/admin/components/AdminStatusConfirmModal';
import { AdminTable } from '@/modules/admin/components/AdminTable';
import { AdminsToolbar } from '@/modules/admin/components/AdminsToolbar';
import { SuperadminAccountCard } from '@/modules/admin/components/SuperadminAccountCard';
import { useAdminAdmins } from '@/modules/admin/hooks/useAdminAdmins';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import type {
  Admin,
  AdminStatusFilter,
  CreateAdminPayload,
  ResetAdminPasswordPayload,
  UpdateAdminUsuarioPayload,
} from '@/modules/admin/types/admin';
import {
  MapsFeedbackToastHost,
  useMapsFeedback,
} from '@/shared/components/MapsFeedbackToast';
import { TablePagination } from '@/shared/components/TablePagination';
import { useAuthStore } from '@/store/authStore';

const SUCCESS_TOAST_MS = 3200;
const ROW_HIGHLIGHT_MS = 1100;

export function AdminsDashboard() {
  const sessionUser = useAuthStore((s) => s.user);

  const {
    data: admins,
    loading,
    error,
    refetch,
    create,
    updateUsuario,
    setActivo,
    resetPassword,
  } = useAdminAdmins();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminStatusFilter>('TODOS');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [confirming, setConfirming] = useState<Admin | null>(null);
  const [resettingPassword, setResettingPassword] = useState<Admin | null>(null);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [toggleBusy, setToggleBusy] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const toggleLockRef = useRef(false);

  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const { toast, dismiss, showSuccess } = useMapsFeedback(SUCCESS_TOAST_MS);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  const highlightTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    },
    [],
  );

  const hasListCriteria = search.trim() !== '' || statusFilter !== 'TODOS';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return admins.filter((admin) => {
      if (statusFilter === 'ACTIVOS' && !admin.activo) return false;
      if (statusFilter === 'INACTIVOS' && admin.activo) return false;
      if (term && !admin.usuario.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [admins, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  function markHighlighted(id: number) {
    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }
    setHighlightedId(id);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedId(null);
      highlightTimerRef.current = null;
    }, ROW_HIGHLIGHT_MS);
  }

  function handleNew() {
    setFormError(null);
    setEditing(null);
    setCreating(true);
  }

  function handleEdit(admin: Admin) {
    setFormError(null);
    setCreating(false);
    setEditing(admin);
  }

  function handleToggleEstado(admin: Admin) {
    setToggleError(null);
    setConfirming(admin);
  }

  function handleResetPassword(admin: Admin) {
    setResetError(null);
    setResettingPassword(admin);
  }

  async function handleCreate(input: CreateAdminPayload) {
    setFormSubmitting(true);
    setFormError(null);
    try {
      const created = await create(input);
      setCreating(false);
      setPage(1);
      showSuccess('Administrador creado');
      markHighlighted(created.id);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleUpdate(input: UpdateAdminUsuarioPayload) {
    if (!editing) return;
    setFormSubmitting(true);
    setFormError(null);
    try {
      const id = editing.id;
      await updateUsuario(id, input);
      setEditing(null);
      showSuccess('Usuario actualizado');
      markHighlighted(id);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setFormSubmitting(false);
    }
  }

  async function confirmToggle(admin: Admin) {
    if (toggleLockRef.current) return;
    toggleLockRef.current = true;
    setToggleBusy(true);
    setToggleError(null);
    try {
      if (admin.activo) {
        await setActivo(admin.id, false);
        setConfirming(null);
        showSuccess('Administrador desactivado');
      } else {
        await setActivo(admin.id, true);
        setConfirming(null);
        showSuccess('Administrador reactivado');
      }
      markHighlighted(admin.id);
    } catch (err) {
      setToggleError(getApiErrorMessage(err));
    } finally {
      toggleLockRef.current = false;
      setToggleBusy(false);
    }
  }

  async function confirmResetPassword(payload: ResetAdminPasswordPayload) {
    if (!resettingPassword) return;
    setResetSubmitting(true);
    setResetError(null);
    try {
      const id = resettingPassword.id;
      await resetPassword(id, payload);
      setResettingPassword(null);
      showSuccess('Contraseña restablecida');
      markHighlighted(id);
    } catch (err) {
      setResetError(getApiErrorMessage(err));
    } finally {
      setResetSubmitting(false);
    }
  }

  const editingAdmin = editing ? (admins.find((row) => row.id === editing.id) ?? editing) : null;

  return (
    <div className="flex min-w-0 flex-col gap-6 px-4 py-5 sm:px-8 sm:py-6">
      <MapsFeedbackToastHost toast={toast} onDismiss={dismiss} />

      <h1 className="text-3xl font-bold text-maps-heading">Administradores</h1>

      {sessionUser?.rol === 'SUPERADMIN' ? (
        <SuperadminAccountCard usuario={sessionUser.usuario} />
      ) : null}

      {error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          <span>{error}</span>
          <button type="button" onClick={() => void refetch()} className="font-semibold underline">
            Reintentar
          </button>
        </div>
      ) : null}

      <AdminsToolbar
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusFilterChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        onNewClick={handleNew}
      />

      {loading ? (
        <div className="rounded-2xl border border-maps-border bg-white px-6 py-10 text-center text-sm text-maps-muted">
          Cargando administradores…
        </div>
      ) : !error || admins.length > 0 ? (
        <AdminTable
          admins={paginated}
          highlightedId={highlightedId}
          emptyMessage={
            hasListCriteria
              ? 'No encontramos administradores con esos criterios.'
              : 'Todavía no hay administradores. Podés crear el primero desde “Nuevo administrador”.'
          }
          onEdit={handleEdit}
          onToggleEstado={handleToggleEstado}
          onResetPassword={handleResetPassword}
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

      <AdminFormModal
        isOpen={creating}
        mode="create"
        submitError={formError}
        submitting={formSubmitting}
        onClose={() => {
          if (!formSubmitting) setCreating(false);
        }}
        onSubmit={handleCreate}
      />

      <AdminFormModal
        isOpen={editing !== null}
        mode="edit"
        admin={editingAdmin}
        submitError={formError}
        submitting={formSubmitting}
        onClose={() => {
          if (!formSubmitting) setEditing(null);
        }}
        onSubmit={handleUpdate}
      />

      <AdminStatusConfirmModal
        isOpen={confirming !== null}
        admin={confirming}
        mode={confirming?.activo ? 'deactivate' : 'reactivate'}
        isBusy={toggleBusy}
        submitError={toggleError}
        onClose={() => {
          if (!toggleBusy) setConfirming(null);
        }}
        onConfirm={confirmToggle}
      />

      <AdminResetPasswordModal
        isOpen={resettingPassword !== null}
        admin={resettingPassword}
        submitting={resetSubmitting}
        submitError={resetError}
        onClose={() => {
          if (!resetSubmitting) setResettingPassword(null);
        }}
        onSubmit={confirmResetPassword}
      />
    </div>
  );
}
