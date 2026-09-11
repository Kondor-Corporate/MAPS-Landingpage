import { MapPin } from 'lucide-react';
import { SingleProducerMap } from '@/shared/components/map/SingleProducerMap';
import type { ProfileViewModel } from '@/shared/types/producerProfile';

type Props = {
  profile: Pick<ProfileViewModel, 'ciudad' | 'latitud' | 'longitud'>;
};

export function ProfileInfluenceMap({ profile }: Props) {
  const hasCoords = profile.latitud != null && profile.longitud != null;

  return (
    <section className="rounded-2xl border border-maps-border bg-white p-6 shadow-profile sm:p-8">
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
        <MapPin className="size-5 text-maps-brand" aria-hidden />
        Zona de influencia
      </h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-maps-border bg-slate-50">
        {hasCoords ? (
          <SingleProducerMap
            latitud={profile.latitud!}
            longitud={profile.longitud!}
            label={
              profile.ciudad
                ? `Mapa de zona de influencia en ${profile.ciudad}`
                : 'Mapa de zona de influencia'
            }
          />
        ) : (
          <div className="flex h-[192px] flex-col items-center justify-center gap-2 px-4 text-center sm:h-[220px]">
            <span className="flex size-12 items-center justify-center rounded-full bg-maps-brand/10 text-maps-brand">
              <MapPin className="size-6" aria-hidden />
            </span>
            <p className="text-sm text-slate-500">
              {profile.ciudad ?? 'Sin ubicación definida'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
