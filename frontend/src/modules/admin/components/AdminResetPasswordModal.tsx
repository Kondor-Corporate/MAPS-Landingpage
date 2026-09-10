import { EntityResetPasswordModal } from '@/shared/components/EntityResetPasswordModal';
import type { Admin, ResetAdminPasswordPayload } from '@/modules/admin/types/admin';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  admin: Admin | null;
  submitting?: boolean;
  submitError?: string | null;
  onSubmit: (payload: ResetAdminPasswordPayload) => Promise<void>;
};

export function AdminResetPasswordModal({
  isOpen,
  onClose,
  admin,
  submitting = false,
  submitError,
  onSubmit,
}: Props) {
  return (
    <EntityResetPasswordModal
      isOpen={isOpen}
      onClose={onClose}
      entityKey={admin?.id ?? null}
      entityLabel={admin?.usuario ?? ''}
      description={
        admin ? (
          <>
            Vas a restablecer la contraseña de <strong className="text-maps-heading">{admin.usuario}</strong>.
            La contraseña anterior deja de funcionar y se cierran sus sesiones activas.
          </>
        ) : null
      }
      submitting={submitting}
      submitError={submitError}
      onSubmit={onSubmit}
    />
  );
}
