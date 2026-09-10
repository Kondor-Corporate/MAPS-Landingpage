import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, Crosshair, MessageCircle } from 'lucide-react';
import Map, { Marker, Popup, type MapRef } from 'react-map-gl/maplibre';
import { MapPinIcon } from '@/shared/components/map/MapPinIcon';
import { LA_PLATA_VIEW, MAP_STYLE } from '@/shared/components/map/mapStyle';
import { useProducersMap } from '@/modules/public-web/hooks/useProducersMap';
import type { MapProducer } from '@/modules/public-web/types/producerMap';
import { geocodeQuery } from '@/shared/lib/geocode';
import { distanceKm, formatDistance } from '@/shared/lib/distance';
import { getInitials } from '@/shared/utils/initials';

const DEFAULT_VIEW = LA_PLATA_VIEW;
const NEARBY_LIST_SIZE = 4;


type GeocodeStatus = 'idle' | 'loading' | 'not-found' | 'error';
type GeolocStatus = 'idle' | 'loading' | 'unsupported' | 'denied' | 'error';

type UserLocation = {
  latitude: number;
  longitude: number;
  /** Etiqueta humana para mostrar de dónde vino la ubicación. */
  label: string;
};

export type ProducerWithDistance = MapProducer & { distanceKm: number | null };

export function FindAdvisorMap() {
  const mapRef = useRef<MapRef | null>(null);
  const { producers, loading, error: loadError } = useProducersMap();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<GeocodeStatus>('idle');
  const [geoStatus, setGeoStatus] = useState<GeolocStatus>('idle');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const boundsFitted = useRef(false);

  const sortedProducers: ProducerWithDistance[] = useMemo(() => {
    if (!userLocation) {
      return producers.map((p) => ({ ...p, distanceKm: null }));
    }
    return producers
      .map((p) => ({
        ...p,
        distanceKm: distanceKm(userLocation, { latitude: p.latitud, longitude: p.longitud }),
      }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [producers, userLocation]);

  const nearby = useMemo(
    () => (userLocation ? sortedProducers.slice(0, NEARBY_LIST_SIZE) : []),
    [sortedProducers, userLocation],
  );


  const activeProducer = useMemo(
    () => sortedProducers.find((p) => p.slug === activeSlug) ?? null,
    [activeSlug, sortedProducers],
  );

  useEffect(() => {
    if (loading || producers.length === 0 || boundsFitted.current) return;
    const map = mapRef.current?.getMap();
    if (!map) return;

    if (producers.length === 1) {
      map.flyTo({
        center: [producers[0].longitud, producers[0].latitud],
        zoom: 13,
        duration: 800,
      });
    } else {
      let minLng = Infinity;
      let minLat = Infinity;
      let maxLng = -Infinity;
      let maxLat = -Infinity;
      for (const p of producers) {
        minLng = Math.min(minLng, p.longitud);
        minLat = Math.min(minLat, p.latitud);
        maxLng = Math.max(maxLng, p.longitud);
        maxLat = Math.max(maxLat, p.latitud);
      }
      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 48, duration: 800, maxZoom: 14 },
      );
    }
    boundsFitted.current = true;
  }, [loading, producers]);

  const focusOnLocation = (loc: UserLocation, openClosest = true) => {
    setUserLocation(loc);
    const closest = producers
      .map((p) => ({ p, d: distanceKm(loc, { latitude: p.latitud, longitude: p.longitud }) }))
      .sort((a, b) => a.d - b.d)[0];

    const center: [number, number] = closest && openClosest
      ? [closest.p.longitud, closest.p.latitud]
      : [loc.longitude, loc.latitude];

    mapRef.current?.flyTo({
      center,
      zoom: 13,
      duration: 1000,
      essential: true,
    });

    if (openClosest && closest) {
      setActiveSlug(closest.p.slug);
    }
  };

  const handleZoom = (delta: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (delta > 0) map.zoomIn({ duration: 250 });
    else map.zoomOut({ duration: 250 });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q || status === 'loading') return;

    setStatus('loading');
    try {
      const result = await geocodeQuery(q);
      if (!result) {
        setStatus('not-found');
        return;
      }
      focusOnLocation({
        latitude: result.latitude,
        longitude: result.longitude,
        label: q,
      });
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  const handleUseMyLocation = () => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('unsupported');
      return;
    }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        focusOnLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          label: 'Mi ubicación',
        });
        setGeoStatus('idle');
      },
      (err) => {
        setGeoStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  };

  const handlePickProducer = (producer: ProducerWithDistance) => {
    setActiveSlug(producer.slug);
    mapRef.current?.flyTo({
      center: [producer.longitud, producer.latitud],
      zoom: 14,
      duration: 800,
    });
  };

  return (
    <section
      id="mapa"
      className="grid min-w-0 scroll-mt-[70px] grid-cols-1 lg:grid-cols-[420px_1fr] xl:grid-cols-[704px_1fr]"
    >
      <div className="flex min-w-0 items-center bg-white px-6 sm:px-10 lg:px-8 xl:px-16 py-12 sm:py-16 lg:py-16 xl:py-32">
        <div className="flex min-w-0 w-full max-w-[560px] flex-col gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
            <MapPinIcon className="h-6 w-6" />
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold leading-tight lg:leading-[48px] tracking-[-0.9px] text-maps-heading">
            Encontrá a tu asesor
          </h2>

          <p className="text-lg leading-[29px] text-maps-muted">
            Buscá por ciudad o usá desde tu ubicación actual y vamos a mostrarte para elegir los
            asesores más cercanos.
          </p>

          <form
            className="mt-4 flex min-w-0 flex-col gap-2 rounded-xl border border-maps-border bg-white p-2 shadow-card transition focus-within:border-maps-brand focus-within:ring-2 focus-within:ring-maps-brand/20 min-[420px]:h-16 min-[420px]:flex-row min-[420px]:items-stretch min-[420px]:gap-0"
            onSubmit={handleSearch}
          >
            <span className="flex w-9 items-center justify-center text-maps-muted-soft">
              <MapPinIcon className="h-[18px] w-[18px]" />
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (status !== 'idle' && status !== 'loading') setStatus('idle');
              }}
              placeholder="Ingresá tu ciudad"
              className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-base text-maps-heading placeholder:text-maps-muted-soft focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !query.trim()}
              className="inline-flex min-h-11 min-w-[100px] items-center justify-center rounded-lg bg-maps-brand px-6 text-base font-bold text-white transition-colors hover:bg-maps-brand-hover disabled:cursor-not-allowed disabled:opacity-60 min-[420px]:m-0"
            >
              {status === 'loading' ? 'Buscando…' : 'Buscar'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoStatus === 'loading'}
            className="inline-flex h-11 w-fit items-center gap-2 rounded-lg border border-maps-border bg-white px-4 text-sm font-semibold text-maps-heading transition hover:bg-maps-surface disabled:opacity-60"
          >
            <Crosshair className="h-4 w-4 text-maps-brand" aria-hidden />
            {geoStatus === 'loading' ? 'Obteniendo ubicación…' : 'Usar mi ubicación'}
          </button>

          {status === 'not-found' && (
            <p className="text-sm text-maps-muted">
              No encontramos esa ubicación. Probá con otra ciudad.
            </p>
          )}
          {status === 'error' && (
            <p className="text-sm text-red-600">
              Hubo un problema al buscar. Intentá de nuevo en un momento.
            </p>
          )}
          {geoStatus === 'denied' && (
            <p className="text-sm text-amber-700">
              Necesitamos permiso para acceder a tu ubicación. Habilitalo desde
              el navegador o usá la búsqueda por ciudad.
            </p>
          )}
          {geoStatus === 'unsupported' && (
            <p className="text-sm text-maps-muted">
              Tu navegador no soporta geolocalización.
            </p>
          )}
          {geoStatus === 'error' && (
            <p className="text-sm text-red-600">
              No pudimos obtener tu ubicación. Probá de nuevo.
            </p>
          )}
          {loadError && <p className="text-sm text-red-600">{loadError}</p>}
          {!loading && !loadError && producers.length === 0 && (
            <p className="text-sm text-maps-muted">
              Aún no hay asesores geolocalizados en el mapa.
            </p>
          )}

          {nearby.length > 0 && (
            <div className="mt-4 rounded-xl border border-maps-border bg-white p-4 shadow-card">
              <p className="break-words text-xs font-bold uppercase tracking-wide text-maps-muted">
                Más cercanos a {userLocation?.label}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {nearby.map((p) => (
                  <li key={p.slug}>
                    <button
                      type="button"
                      onClick={() => handlePickProducer(p)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition ${
                        p.slug === activeSlug
                          ? 'border-maps-brand bg-maps-brand-soft/40'
                          : 'border-transparent hover:border-maps-border hover:bg-maps-surface'
                      }`}
                    >
                      <ProducerAvatar producer={p} size="sm" />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-bold text-maps-heading">
                          {p.nombreCompleto}
                        </span>
                        {p.ciudad && (
                          <span className="truncate text-xs text-maps-muted">
                            {p.ciudad}
                          </span>
                        )}
                      </span>
                      {p.distanceKm != null && (
                        <span className="shrink-0 text-xs font-semibold text-maps-brand">
                          {formatDistance(p.distanceKm)}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="relative min-h-[380px] min-w-0 sm:min-h-[460px] lg:min-h-[600px]">
        {loading && (
          <div className="absolute inset-0 z-map-loading flex items-center justify-center bg-slate-100/80">
            <p className="text-sm font-medium text-maps-muted">Cargando mapa…</p>
          </div>
        )}

        <Map
          ref={mapRef}
          initialViewState={DEFAULT_VIEW}
          mapStyle={MAP_STYLE}
          style={{ position: 'absolute', inset: 0 }}
          attributionControl={{ compact: true }}
          dragRotate={false}
          touchZoomRotate
        >
          {userLocation && (
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="center"
            >
              <span
                aria-label={`Ubicación: ${userLocation.label}`}
                className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-amber-500 shadow-floating"
              />
            </Marker>
          )}

          {sortedProducers.map((producer) => (
            <Marker
              key={producer.slug}
              longitude={producer.longitud}
              latitude={producer.latitud}
              anchor="bottom"
            >
              <button
                type="button"
                aria-label={`Ver asesor ${producer.nombreCompleto}${
                  producer.distanceKm != null
                    ? `, a ${formatDistance(producer.distanceKm)}`
                    : ''
                }`}
                onClick={(event) => {
                  event.stopPropagation();
                  setActiveSlug(producer.slug);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveSlug(producer.slug);
                  }
                }}
                className={`flex h-9 w-9 -translate-y-1 cursor-pointer items-center justify-center rounded-full border-2 border-white text-white shadow-floating transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-maps-brand focus-visible:ring-offset-2 ${
                  producer.slug === activeSlug
                    ? 'scale-110 bg-maps-brand-hover'
                    : 'bg-maps-brand'
                }`}
              >
                <MapPinIcon className="h-5 w-5" />
              </button>
            </Marker>
          ))}

          {activeProducer && (
            <Popup
              longitude={activeProducer.longitud}
              latitude={activeProducer.latitud}
              anchor="bottom"
              offset={36}
              closeButton
              closeOnClick
              onClose={() => setActiveSlug(null)}
              className="maps-popup"
              maxWidth="min(320px, calc(100vw - 32px))"
            >
              <ProducerPopupCard producer={activeProducer} />
            </Popup>
          )}
        </Map>

        <div
          className={`absolute right-3 top-3 z-map-controls flex-col gap-2 sm:right-6 sm:top-6 ${
            activeProducer ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <button
            type="button"
            aria-label="Acercar"
            onClick={() => handleZoom(1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-maps-heading shadow-floating hover:bg-maps-surface"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M7 1v12M1 7h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Alejar"
            onClick={() => handleZoom(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-maps-heading shadow-floating hover:bg-maps-surface"
          >
            <svg width="14" height="2" viewBox="0 0 14 2" fill="none">
              <path d="M1 1h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}

function ProducerAvatar({
  producer,
  size,
}: {
  producer: MapProducer;
  size: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-10 w-10 text-xs' : 'h-14 w-14 text-base';
  if (producer.foto) {
    return (
      <img
        src={producer.foto}
        alt={producer.nombreCompleto}
        className={`${dim} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-maps-brand-soft font-bold text-maps-brand`}
    >
      {getInitials(producer.nombreCompleto)}
    </span>
  );
}

export function ProducerPopupCard({ producer }: { producer: ProducerWithDistance }) {
  const waLink = producer.whatsapp
    ? `https://wa.me/${producer.whatsapp.replace(/\D/g, '')}`
    : null;
  const specialties = producer.especialidades.slice(0, 3);

  return (
    <div className="flex max-w-full min-w-0 flex-col gap-3 p-1">
      <div className="flex items-start gap-3">
        <ProducerAvatar producer={producer} size="md" />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold text-maps-heading">
              {producer.nombreCompleto}
            </p>
            {producer.verificado && (
              <BadgeCheck
                className="h-4 w-4 shrink-0 text-maps-brand"
                aria-label="Asesor verificado"
              />
            )}
          </div>
          {producer.tituloProfesional && (
            <p className="truncate text-xs text-maps-muted">
              {producer.tituloProfesional}
            </p>
          )}
          {producer.ciudad && (
            <p className="truncate text-xs text-maps-muted">{producer.ciudad}</p>
          )}
          {producer.distanceKm != null && (
            <p className="mt-0.5 text-xs font-semibold text-maps-brand">
              A {formatDistance(producer.distanceKm)}
            </p>
          )}
        </div>
      </div>

      {specialties.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {specialties.map((s) => (
            <li
              key={s.clave}
              className="rounded-full bg-maps-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-maps-brand"
            >
              {s.label}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 pt-1 min-[420px]:flex-row min-[420px]:items-center">
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-maps-whatsapp px-3 py-2 text-sm font-bold text-white hover:opacity-90"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden />
            WhatsApp
          </a>
        )}
        <Link
          to={`/productor/${producer.slug}`}
          className={`inline-flex min-h-11 items-center justify-center rounded-lg bg-maps-brand px-3 py-2 text-sm font-bold text-white hover:bg-maps-brand-hover ${
            waLink ? '' : 'flex-1'
          }`}
        >
          Ver perfil
        </Link>
      </div>
    </div>
  );
}
