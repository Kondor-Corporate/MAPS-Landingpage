import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { UserPlus, UserRoundPen } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { PasswordField } from '@/shared/components/PasswordField';
import { passwordPolicyError } from '@/shared/utils/passwordPolicy';
import type { Admin, CreateAdminPayload, UpdateAdminUsuarioPayload } from '@/modules/admin/types/admin';

type BaseProps = {
  isOpen: boolean;
  onClose: () => void;
  submitting?: boolean;
  submitError?: string | null;
};

type Props =
  | (BaseProps & {
      mode: 'create';
      admin?: Admin | null;
      onSubmit: (input: CreateAdminPayload) => Promise<void>;
    })
  | (BaseProps & {
      mode: 'edit';
      admin?: Admin | null;
      onSubmit: (input: UpdateAdminUsuarioPayload) => Promise<void>;
    });

type FormState = {
  usuario: string;
  password: string;
  confirmPassword: string;
};

const EMPTY_FORM: FormState = { usuario: '', password: '', confirmPassword: '' };

function usuarioFieldError(raw: string): string | undefined {
  const value = raw.trim();
  if (!value) return 'Ingresá un usuario.';
  if (value.length < 3) return 'Mínimo 3 caracteres';
  if (value.length > 191) return 'Máximo 191 caracteres';
  if (/\s/.test(value)) return 'No puede contener espacios';
  return undefined;
}

function normalizeUsuario(value: string): string {
  return value.trim().toLowerCase();
}

export function AdminFormModal({
  isOpen,
  onClose,
  mode,
  admin,
  submitting = false,
  submitError,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const submitLockRef = useRef(false);
  const usuarioId = useId();
  const isCreate = mode === 'create';
  const usuarioChanged =
    !isCreate && Boolean(admin) && normalizeUsuario(form.usuario) !== normalizeUsuario(admin?.usuario ?? '');

  useEffect(() => {
    if (!isOpen) return;
    setForm(mode === 'edit' && admin ? { ...EMPTY_FORM, usuario: admin.usuario } : EMPTY_FORM);
    setErrors({});
  }, [isOpen, mode, admin]);

  useEffect(() => {
    if (!isCreate) return;
    setErrors((prev) => {
      const next = { ...prev };
      const passwordError = form.password ? passwordPolicyError(form.password) : null;
      if (passwordError) next.password = passwordError;
      else delete next.password;

      if (form.confirmPassword) {
        if (!passwordError && form.password !== form.confirmPassword) {
          next.confirmPassword = 'Las contraseñas no coinciden';
        } else {
          delete next.confirmPassword;
        }
      } else {
        delete next.confirmPassword;
      }
      return next;
    });
  }, [isCreate, form.password, form.confirmPassword]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting || submitLockRef.current) return;

    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    const usuarioError = usuarioFieldError(form.usuario);
    if (usuarioError) nextErrors.usuario = usuarioError;

    if (isCreate) {
      const passwordError = passwordPolicyError(form.password);
      if (passwordError) {
        nextErrors.password = passwordError;
      } else if (form.password !== form.confirmPassword) {
        nextErrors.confirmPassword = 'Las contraseñas no coinciden';
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submitLockRef.current = true;
    try {
      if (mode === 'create') {
        await onSubmit({
          usuario: form.usuario.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
        });
      } else {
        await onSubmit({ usuario: form.usuario.trim() });
      }
    } catch {
      /* error mostrado vía submitError */
    } finally {
      submitLockRef.current = false;
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      ariaLabel={isCreate ? 'Nuevo administrador' : 'Editar usuario'}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col">
        <div className="flex flex-col gap-6 p-6">
          <header className="flex items-center gap-3 pr-10">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
              {isCreate ? (
                <UserPlus size={20} strokeWidth={1.75} aria-hidden />
              ) : (
                <UserRoundPen size={20} strokeWidth={1.75} aria-hidden />
              )}
            </span>
            <div>
              <h2 className="text-xl font-bold text-maps-heading">
                {isCreate ? 'Nuevo administrador' : 'Editar usuario'}
              </h2>
              {!isCreate && admin ? (
                <p className="text-sm text-maps-muted">{admin.usuario}</p>
              ) : null}
            </div>
          </header>

          {submitError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {submitError}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5 text-sm">
            <label
              htmlFor={usuarioId}
              className="text-xs font-semibold uppercase tracking-wider text-maps-muted"
            >
              Usuario
              <span className="ml-0.5 text-rose-500">*</span>
            </label>
            <input
              id={usuarioId}
              type="text"
              autoComplete="username"
              value={form.usuario}
              onChange={(e) => {
                const usuario = e.target.value;
                setForm((prev) => ({ ...prev, usuario }));
                const next = usuarioFieldError(usuario);
                setErrors((prev) => {
                  const copy = { ...prev };
                  if (next) copy.usuario = next;
                  else delete copy.usuario;
                  return copy;
                });
              }}
              className="w-full rounded-lg border border-maps-border bg-white px-3 py-2 text-sm text-maps-heading transition focus:border-maps-brand focus:outline-none focus:ring-2 focus:ring-maps-brand/20"
            />
            {errors.usuario ? <span className="text-xs text-rose-600">{errors.usuario}</span> : null}
          </div>

          {usuarioChanged ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              Cambiar el usuario cambia el identificador de acceso. Se cierran las sesiones activas
              de esta cuenta; tendrá que iniciar sesión de nuevo con el usuario nuevo.
            </p>
          ) : null}

          {isCreate ? (
            <>
              <PasswordField
                label="Contraseña"
                required
                autoComplete="new-password"
                value={form.password}
                onChange={(v) => setForm((prev) => ({ ...prev, password: v }))}
                error={errors.password}
              />
              <PasswordField
                label="Confirmar contraseña"
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(v) => setForm((prev) => ({ ...prev, confirmPassword: v }))}
                error={errors.confirmPassword}
              />
            </>
          ) : null}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-maps-border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-11 w-full rounded-lg border border-maps-border bg-white px-4 py-2 text-sm font-medium text-maps-heading transition hover:bg-maps-surface disabled:opacity-50 sm:w-auto"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-11 w-full rounded-lg bg-maps-brand px-4 py-2 text-sm font-semibold text-white shadow-cta transition hover:bg-maps-brand-hover disabled:opacity-50 sm:w-auto"
          >
            {submitting ? 'Guardando…' : isCreate ? 'Crear administrador' : 'Guardar cambios'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
