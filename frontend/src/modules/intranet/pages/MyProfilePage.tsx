import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { useProducerProfile } from '@/modules/intranet/hooks/useProducerProfile';

/**
 * Redirige a la URL canónica `/intranet/perfil/:slug`. Si el slug ya está
 * cacheado en `authStore` (caso normal post-login) se redirige sin fetch;
 * sólo cae al hook si el slug no quedó persistido por sesiones viejas.
 */
export function MyProfilePage() {
  const slug = useAuthStore((s) => s.user?.slug ?? null);

  if (slug) {
    return <Navigate to={`/intranet/perfil/${slug}`} replace />;
  }

  return <MyProfileFallback />;
}

function MyProfileFallback() {
  const { profile, isLoading, error } = useProducerProfile();

  if (isLoading) {
    return (
      <div className="px-8 py-6">
        <p className="text-maps-muted">Cargando perfil…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="px-8 py-6">
        <h1 className="text-3xl font-bold text-maps-heading">Mi Perfil</h1>
        <p className="mt-2 text-maps-body">{error ?? 'Perfil no disponible.'}</p>
      </div>
    );
  }

  return <Navigate to={`/intranet/perfil/${profile.slug}`} replace />;
}
