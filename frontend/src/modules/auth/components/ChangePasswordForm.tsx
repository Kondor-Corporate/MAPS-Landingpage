import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import { Modal } from '@/shared/components/Modal';
import { PasswordField } from '@/shared/components/PasswordField';
import { passwordPolicyError } from '@/shared/utils/passwordPolicy';
import type { ChangeMyPasswordBody } from '@/modules/auth/types';

export const PASSWORD_CHANGE_SUCCESS_REDIRECT_MS = 1400;

type Props = {
  open: boolean;
  onClose: () => void;
  changePassword: (body: ChangeMyPasswordBody) => Promise<void>;
  onSaved: () => void;
};

type FormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_FORM: FormState = { currentPassword: '', newPassword: '', confirmPassword: '' };

export function ChangePasswordForm({ open, onClose, changePassword, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitLockRef = useRef(false);
  const closeBlockedRef = useRef(false);
  const onSavedCalledRef = useRef(false);
  const onSavedRef = useRef(onSaved);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  onSavedRef.current = onSaved;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (redirectTimerRef.current !== null) {
        clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitError(null);
    setSubmitting(false);
    setSuccess(false);
    submitLockRef.current = false;
    closeBlockedRef.current = false;
    onSavedCalledRef.current = false;
    if (redirectTimerRef.current !== null) {
      clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    setErrors((prev) => {
      const next = { ...prev };
      const passwordError = form.newPassword ? passwordPolicyError(form.newPassword) : null;
      if (passwordError) next.newPassword = passwordError;
      else delete next.newPassword;

      if (form.confirmPassword) {
        if (!passwordError && form.newPassword !== form.confirmPassword) {
          next.confirmPassword = 'Las contraseñas no coinciden';
        } else {
          delete next.confirmPassword;
        }
      } else {
        delete next.confirmPassword;
      }
      return next;
    });
  }, [form.newPassword, form.confirmPassword]);

  const handleModalClose = useCallback(() => {
    if (closeBlockedRef.current) return;
    onClose();
  }, [onClose]);

  function finishSuccessRedirect() {
    if (!mountedRef.current || onSavedCalledRef.current) return;
    onSavedCalledRef.current = true;
    onSavedRef.current();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (success || submitting || submitLockRef.current) return;
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.currentPassword) nextErrors.currentPassword = 'Ingresá tu contraseña actual';
    const passwordError = passwordPolicyError(form.newPassword);
    if (passwordError) {
      nextErrors.newPassword = passwordError;
    } else if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submitLockRef.current = true;
    closeBlockedRef.current = true;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      if (!mountedRef.current) return;
      setSuccess(true);
      setSubmitError(null);
      redirectTimerRef.current = setTimeout(() => {
        redirectTimerRef.current = null;
        finishSuccessRedirect();
      }, PASSWORD_CHANGE_SUCCESS_REDIRECT_MS);
    } catch (err) {
      if (!mountedRef.current) return;
      closeBlockedRef.current = false;
      submitLockRef.current = false;
      setSubmitting(false);
      setSubmitError(getApiErrorMessage(err, 'No se pudo cambiar la contraseña'));
    }
  }

  function handleChange(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Modal
      isOpen={open}
      onClose={handleModalClose}
      maxWidth="max-w-md"
      showCloseButton={!success}
    >
      {success ? (
        <div
          className="flex flex-col items-center gap-4 px-6 py-10 text-center"
          role="status"
          aria-live="polite"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 size={28} strokeWidth={1.75} aria-hidden />
          </span>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold text-maps-heading">Contraseña actualizada</h2>
            <p className="text-sm text-maps-muted">
              Por seguridad, tenés que iniciar sesión nuevamente.
            </p>
          </div>
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-maps-heading">
            <Loader2 size={16} className="animate-spin" aria-hidden />
            Redirigiendo al inicio de sesión…
          </p>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col">
          <div className="flex flex-col gap-6 p-6">
            <header className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
                <ShieldCheck size={20} strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="text-lg font-bold text-maps-heading">Cambiar contraseña</h2>
                <p className="text-sm text-maps-muted">Necesitás tu contraseña actual.</p>
              </div>
            </header>

            {submitError ? (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                {submitError}
              </p>
            ) : null}

            <PasswordField
              label="Contraseña actual"
              autoComplete="current-password"
              value={form.currentPassword}
              onChange={(v) => handleChange('currentPassword', v)}
              error={errors.currentPassword}
            />
            <PasswordField
              label="Nueva contraseña"
              autoComplete="new-password"
              value={form.newPassword}
              onChange={(v) => handleChange('newPassword', v)}
              error={errors.newPassword}
            />
            <PasswordField
              label="Confirmar nueva contraseña"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(v) => handleChange('confirmPassword', v)}
              error={errors.confirmPassword}
            />
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-maps-border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={handleModalClose}
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
              {submitting ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </footer>
        </form>
      )}
    </Modal>
  );
}
