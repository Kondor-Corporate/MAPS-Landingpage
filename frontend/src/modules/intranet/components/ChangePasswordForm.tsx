import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { getApiErrorMessage } from '@/modules/admin/lib/apiError';
import { Modal } from '@/shared/components/Modal';
import { PasswordField } from '@/shared/components/PasswordField';
import { passwordPolicyError } from '@/shared/utils/passwordPolicy';
import type { ChangeMyPasswordBody } from '@/modules/intranet/types/producerProfile';

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
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitError(null);
  }, [open]);

  // Validación en tiempo real: feedback a medida que se escribe, sin esperar al submit.
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submitLockRef.current) return;
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
    setSubmitting(true);
    setSubmitError(null);
    try {
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      });
      onSaved();
      onClose();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'No se pudo cambiar la contraseña'));
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  }

  function handleChange(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Modal isOpen={open} onClose={() => {
      if (!submitting) onClose();
    }} maxWidth="max-w-md">
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col">
        <div className="flex flex-col gap-6 p-6">
          <header className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
              <ShieldCheck size={20} strokeWidth={1.75} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-maps-heading">Cambiar contraseña</h2>
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
            {submitting ? 'Guardando…' : 'Cambiar contraseña'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
