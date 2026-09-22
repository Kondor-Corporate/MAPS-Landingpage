import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ProfileCertificationsList } from '@/shared/components/profile/ProfileCertificationsList';
import { ProfileHeaderCard } from '@/shared/components/profile/ProfileHeaderCard';
import { ProfileInfluenceMap } from '@/shared/components/profile/ProfileInfluenceMap';
import { ProfileSpecialtiesGrid } from '@/shared/components/profile/ProfileSpecialtiesGrid';
import { ProfileStatsCards } from '@/shared/components/profile/ProfileStatsCards';
import { ProfileTrajectorySection } from '@/shared/components/profile/ProfileTrajectorySection';
import { usePublicProducerProfile } from '@/modules/public-web/hooks/usePublicProducerProfile';

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="h-64 animate-pulse rounded-3xl bg-slate-200/60" />
      <div className="grid gap-8 lg:grid-cols-[1fr_390px]">
        <div className="flex flex-col gap-8">
          <div className="h-56 animate-pulse rounded-3xl bg-slate-200/60" />
          <div className="h-72 animate-pulse rounded-3xl bg-slate-200/60" />
        </div>
        <div className="flex flex-col gap-4">
          <div className="h-24 animate-pulse rounded-3xl bg-slate-200/60" />
          <div className="h-24 animate-pulse rounded-3xl bg-slate-200/60" />
          <div className="h-72 animate-pulse rounded-3xl bg-slate-200/60" />
          <div className="h-56 animate-pulse rounded-3xl bg-slate-200/60" />
        </div>
      </div>
    </div>
  );
}

export function ProducerProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const { profile, loading, error } = usePublicProducerProfile(slug);

  if (loading) {
    return (
      <article className="bg-maps-surface px-4 py-6 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-[1232px]">
          <ProfileSkeleton />
        </div>
      </article>
    );
  }

  if (!slug || error || !profile) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-maps-heading">Perfil no encontrado</h1>
        <p className="text-maps-body">
          No hay un asesor registrado con esta dirección. Verificá el enlace o volvé al inicio.
        </p>
        <Link
          to="/"
          className="inline-flex h-12 items-center justify-center rounded-lg bg-maps-brand px-6 text-sm font-bold text-white transition-colors hover:bg-maps-brand-hover"
        >
          Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <article className="bg-maps-surface px-4 py-6 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-[1232px]">
        <div className="flex flex-col gap-6 sm:gap-8">
          <Link
            to="/#mapa"
            className="inline-flex w-fit items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-maps-brand transition-colors hover:text-maps-brand-hover focus:outline-none focus:ring-2 focus:ring-maps-brand/40 focus:ring-offset-2"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver al mapa
          </Link>
          <ProfileHeaderCard profile={profile} variant="public" />

          <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1fr_390px]">
            <div className="flex flex-col gap-6 sm:gap-8">
              <ProfileTrajectorySection
                bio={profile.bio}
                emptyMessage="Sin información disponible."
              />
              <ProfileSpecialtiesGrid especialidades={profile.especialidades} />
            </div>
            <div className="flex flex-col gap-4">
              <ProfileStatsCards
                anosExperiencia={profile.anosExperiencia}
                clientesActivos={profile.clientesActivos}
              />
              <ProfileInfluenceMap profile={profile} />
              <ProfileCertificationsList
                certificaciones={profile.certificaciones}
                emptyMessage="No hay certificaciones disponibles."
              />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
