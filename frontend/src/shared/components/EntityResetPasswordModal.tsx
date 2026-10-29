import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { KeyRound } from 'lucide-react';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/Button';
import { PasswordField } from '@/shared/components/PasswordField';
import { passwordPolicyError } from '@/shared/utils/passwordPolicy';

type ResetPasswordPayload = {
  newPassword: string;
  confirmPassword: string;
};

type FormState = ResetPasswordPayload;

const EMPTY_FORM: FormState = { newPassword: '', confirmPassword: '' };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Identificador de la entidad (id, slug) usado como key para resetear el form al cambiar de entidad. */
  entityKey: string | number | null;
  entityLabel: string;
  /** Texto adicional debajo del header (p. ej. advertencia de cierre de sesión). Opcional. */
  description?: ReactNode;
  submitting?: boolean;
  submitError?: string | null;
  onSubmit: (payload: ResetPasswordPayload) => Promise<void>;
};

/** Modal genérico de "Restablecer contraseña", parametrizado por tipo de entidad (productor, admin, etc.). */
export function EntityResetPasswordModal({
  isOpen,
  onClose,
  entityKey,
  entityLabel,
  description,
  submitting = false,
  submitError,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setErrors({});
  }, [isOpen, entityKey]);

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

  if (entityKey === null) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submitLockRef.current) return;
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    const passwordError = passwordPolicyError(form.newPassword);
    if (passwordError) {
      nextErrors.newPassword = passwordError;
    } else if (form.newPassword !== form.confirmPassword) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    submitLockRef.current = true;
    try {
      await onSubmit({ newPassword: form.newPassword, confirmPassword: form.confirmPassword });
    } catch {
      /* error mostrado vía submitError prop */
    } finally {
      submitLockRef.current = false;
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md" ariaLabel="Restablecer contraseña">
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col">
        <div className="flex flex-col gap-6 p-6">
          <header className="flex items-center gap-3 pr-10">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
              <KeyRound size={20} strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-bold text-maps-heading">Restablecer contraseña</h2>
              <p className="text-sm text-maps-muted">{entityLabel}</p>
            </div>
          </header>

          {description ? <p className="text-sm text-maps-body">{description}</p> : null}

          {submitError ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {submitError}
            </p>
          ) : null}

          <PasswordField
            label="Nueva contraseña"
            required
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(v) => setForm((prev) => ({ ...prev, newPassword: v }))}
            error={errors.newPassword}
          />
          <PasswordField
            label="Confirmar nueva contraseña"
            required
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={(v) => setForm((prev) => ({ ...prev, confirmPassword: v }))}
            error={errors.confirmPassword}
          />
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-maps-border bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={submitting} className="sm:w-auto">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={submitting}
            loadingText="Restableciendo…"
            className="sm:w-auto"
          >
            Restablecer contraseña
          </Button>
        </footer>
      </form>
    </Modal>
  );
}
