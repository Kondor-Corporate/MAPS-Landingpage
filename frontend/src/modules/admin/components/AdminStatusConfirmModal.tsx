import { ConfirmDialog } from '@/shared/components/ConfirmDialog';
import type { Admin } from '@/modules/admin/types/admin';

type Mode = 'deactivate' | 'reactivate';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  admin: Admin | null;
  mode: Mode;
  isBusy?: boolean;
  submitError?: string | null;
  onConfirm: (admin: Admin) => Promise<void>;
};

export function AdminStatusConfirmModal({
  isOpen,
  onClose,
  admin,
  mode,
  isBusy = false,
  submitError,
  onConfirm,
}: Props) {
  if (!admin) return null;
  const isDeactivate = mode === 'deactivate';

  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={() => onConfirm(admin)}
      title={isDeactivate ? 'Desactivar' : 'Reactivar'}
      description={
        isDeactivate ? (
          <>
            ¿Seguro querés desactivar a <strong className="text-maps-heading">{admin.usuario}</strong>?
            Pierde el acceso a la aplicación y se cierran sus sesiones activas.
          </>
        ) : (
          <>
            ¿Seguro querés reactivar a <strong className="text-maps-heading">{admin.usuario}</strong>?
            Vuelve a poder iniciar sesión. Las sesiones antiguas no se recuperan: tiene que entrar de
            nuevo.
          </>
        )
      }
      tone={isDeactivate ? 'danger' : 'brand'}
      busy={isBusy}
      error={submitError}
      confirmLabel={isDeactivate ? 'Desactivar' : 'Reactivar'}
      confirmLoadingLabel="Procesando…"
      ariaLabel={isDeactivate ? 'Desactivar administrador' : 'Reactivar administrador'}
    />
  );
}
