import { Mail, ShieldCheck, User } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const ROL_LABEL: Record<string, string> = {
  ADMIN: 'Administrador',
  SUPERADMIN: 'Super administrador',
  PRODUCTOR: 'Productor',
};

export function AdminProfilePage() {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    return (
      <div className="px-8 py-6">
        <h1 className="text-2xl font-bold text-maps-heading">Mi Perfil</h1>
        <p className="mt-2 text-maps-body">No hay sesión activa.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-2xl font-bold text-maps-heading">Mi Perfil</h1>

      <section className="rounded-2xl border border-maps-border bg-white p-6 shadow-card sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex size-14 items-center justify-center rounded-full bg-maps-brand-soft text-maps-brand">
            <User className="size-6" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xl font-bold text-maps-heading">{user.usuario}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-maps-brand/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-maps-brand">
              <ShieldCheck className="size-3" aria-hidden />
              {ROL_LABEL[user.rol] ?? user.rol}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <InfoRow icon={<Mail className="size-4" aria-hidden />} label="Email" value={user.usuario} />
          <InfoRow
            icon={<ShieldCheck className="size-4" aria-hidden />}
            label="Rol"
            value={ROL_LABEL[user.rol] ?? user.rol}
          />
        </dl>

        <p className="mt-6 text-sm text-maps-muted">
          Las cuentas de administrador no tienen un perfil público asociado. Si necesitás
          modificar tu cuenta (cambio de contraseña, contacto), pedíselo al superadministrador.
        </p>
      </section>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-maps-border bg-maps-surface/40 p-3">
      <span className="mt-0.5 flex size-8 items-center justify-center rounded-lg bg-white text-maps-brand">
        {icon}
      </span>
      <div className="flex flex-col">
        <dt className="text-xs font-semibold uppercase tracking-wider text-maps-muted">{label}</dt>
        <dd className="text-sm font-medium text-maps-heading">{value}</dd>
      </div>
    </div>
  );
}
