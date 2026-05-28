import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { ProducerProfileForm } from '@/modules/intranet/components/ProducerProfileForm';
import { ProfileCertificationsList } from '@/shared/components/profile/ProfileCertificationsList';
import { ProfileHeaderCard } from '@/shared/components/profile/ProfileHeaderCard';
import { ProfileInfluenceMap } from '@/shared/components/profile/ProfileInfluenceMap';
import { ProfileSpecialtiesGrid } from '@/shared/components/profile/ProfileSpecialtiesGrid';
import { ProfileStatsCards } from '@/shared/components/profile/ProfileStatsCards';
import { ProfileTrajectorySection } from '@/shared/components/profile/ProfileTrajectorySection';
import { useProducerProfile } from '@/modules/intranet/hooks/useProducerProfile';
import { useAuthStore } from '@/store/authStore';

export function ProducerProfileViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const userSlug = useAuthStore((s) => s.user?.slug ?? null);

  // Guard temprano: si el usuario ya tiene slug en sesión y el slug pedido no
  // coincide, cortamos antes del fetch del perfil.
  if (slug && userSlug && slug !== userSlug) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <ProducerProfileViewInner slug={slug} userSlug={userSlug} />;
}

function ProducerProfileViewInner({
  slug,
  userSlug,
}: {
  slug: string | undefined;
  userSlug: string | null;
}) {
  const {
    profile,
    isLoading,
    error,
    updateProfile,
    uploadCertificacion,
    deleteCertificacion,
  } = useProducerProfile();
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 px-4 py-8 sm:px-8">
        <div className="h-40 animate-pulse rounded-2xl bg-maps-border/40" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-64 animate-pulse rounded-2xl bg-maps-border/40 lg:col-span-2" />
          <div className="h-64 animate-pulse rounded-2xl bg-maps-border/40" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="px-8 py-6">
        <h1 className="text-xl font-bold text-maps-heading">Mi Perfil</h1>
        <p className="mt-2 text-maps-body">{error ?? 'No se encontró el perfil.'}</p>
      </div>
    );
  }

  // Guard tardío: si no había slug en el store (sesión vieja) y el del URL no
  // coincide con el del perfil real, mandamos a unauthorized.
  if (slug && slug !== profile.slug) {
    return <Navigate to="/unauthorized" replace />;
  }
  if (userSlug && userSlug !== profile.slug) {
    return <Navigate to="/unauthorized" replace />;
  }

  const publicProfileUrl = `/productor/${profile.slug}`;

  return (
    <div className="flex flex-col gap-6 bg-maps-surface px-4 py-6 sm:px-8 sm:py-8">
      {toast && (
        <div
          className="fixed bottom-6 right-6 z-40 rounded-lg bg-maps-dark px-4 py-3 text-sm font-medium text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-maps-heading">Mi Perfil</h1>
        <a
          href={publicProfileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-maps-border bg-white px-4 text-sm font-semibold text-maps-heading transition hover:bg-maps-surface"
        >
          <ExternalLink className="h-4 w-4 text-maps-brand" aria-hidden />
          Ver mi perfil público
        </a>
      </div>

      <ProfileHeaderCard profile={profile} onEdit={() => setEditOpen(true)} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <ProfileTrajectorySection
            bio={profile.bio}
            onEdit={() => setEditOpen(true)}
          />
          <ProfileSpecialtiesGrid especialidades={profile.especialidades} />
        </div>
        <div className="flex flex-col gap-6">
          <ProfileStatsCards
            anosExperiencia={profile.anosExperiencia}
            clientesActivos={profile.clientesActivos}
          />
          <ProfileInfluenceMap profile={profile} />
          <ProfileCertificationsList certificaciones={profile.certificaciones} />
        </div>
      </div>

      <ProducerProfileForm
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSaved={() => {
          setToast('Perfil actualizado correctamente');
          setTimeout(() => setToast(null), 3000);
        }}
        updateProfile={updateProfile}
        uploadCertificacion={uploadCertificacion}
        deleteCertificacion={deleteCertificacion}
      />
    </div>
  );
}
