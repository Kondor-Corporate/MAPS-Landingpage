import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Map, { Marker, Popup, type MapRef } from 'react-map-gl/maplibre';
import { MapPinIcon } from '@/shared/components/map/MapPinIcon';
import { LA_PLATA_VIEW, MAP_STYLE } from '@/shared/components/map/mapStyle';
import { useProducersMap } from '@/modules/public-web/hooks/useProducersMap';
import { geocodeQuery } from '@/shared/lib/geocode';

const DEFAULT_VIEW = LA_PLATA_VIEW;

type GeocodeStatus = 'idle' | 'loading' | 'not-found' | 'error';

export function FindAdvisorMap() {
  const mapRef = useRef<MapRef | null>(null);
  const { producers, loading, error: loadError } = useProducersMap();
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<GeocodeStatus>('idle');
  const boundsFitted = useRef(false);

  const activeProducer = useMemo(
    () => producers.find((p) => p.slug === activeSlug) ?? null,
    [activeSlug, producers],
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
      mapRef.current?.flyTo({
        center: [result.longitude, result.latitude],
        zoom: 13,
        duration: 1200,
        essential: true,
      });
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section id="mapa" className="grid grid-cols-1 lg:grid-cols-[704px_1fr]">
      <div className="flex items-center bg-white px-6 sm:px-10 lg:px-16 py-12 sm:py-16 lg:py-32">
        <div className="flex max-w-[560px] flex-col gap-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-maps-brand-soft text-maps-brand">
            <MapPinIcon className="h-6 w-6" />
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold leading-tight lg:leading-[48px] tracking-[-0.9px] text-maps-heading">
            Encuentra a tu Asesor
          </h2>

          <p className="text-lg leading-[29px] text-maps-muted">
            Utiliza nuestro mapa interactivo para encontrar el asesor más
            cercano a tu ubicación y recibir atención personalizada.
          </p>

          <form
            className="mt-4 flex h-16 items-stretch overflow-hidden rounded-xl border border-maps-border bg-white shadow-card"
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
              placeholder="Ingresa tu ciudad"
              className="flex-1 bg-transparent px-2 text-base text-maps-heading placeholder:text-maps-muted-soft focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === 'loading' || !query.trim()}
              className="m-2 inline-flex min-w-[100px] items-center justify-center rounded-lg bg-maps-brand px-6 text-base font-bold text-white transition-colors hover:bg-maps-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'loading' ? 'Buscando…' : 'Buscar'}
            </button>
          </form>

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
          {loadError && (
            <p className="text-sm text-red-600">{loadError}</p>
          )}
          {!loading && !loadError && producers.length === 0 && (
            <p className="text-sm text-maps-muted">
              Aún no hay asesores geolocalizados en el mapa.
            </p>
          )}
        </div>
      </div>

      <div className="relative min-h-[300px] sm:min-h-[400px] lg:min-h-[600px] overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-[5] flex items-center justify-center bg-slate-100/80">
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
          {producers.map((producer) => (
            <Marker
              key={producer.slug}
              longitude={producer.longitud}
              latitude={producer.latitud}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setActiveSlug(producer.slug);
              }}
            >
              <button
                type="button"
                aria-label={producer.nombreCompleto}
                className="flex h-9 w-9 -translate-y-1 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-maps-brand text-white shadow-floating transition-transform hover:scale-110"
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
              closeOnClick={false}
              onClose={() => setActiveSlug(null)}
              className="maps-popup"
            >
              <p className="text-sm font-bold text-maps-heading">
                {activeProducer.nombreCompleto}
              </p>
              {activeProducer.tituloProfesional && (
                <p className="text-xs text-maps-muted">
                  {activeProducer.tituloProfesional}
                </p>
              )}
              {activeProducer.ciudad && (
                <p className="text-xs text-maps-muted">{activeProducer.ciudad}</p>
              )}
              <Link
                to={`/productor/${activeProducer.slug}`}
                className="mt-2 inline-block text-xs font-semibold text-maps-brand hover:underline"
              >
                Ver perfil
              </Link>
            </Popup>
          )}
        </Map>

        <div className="absolute right-6 top-6 z-[10] flex flex-col gap-2">
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
              <path
                d="M1 1h12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
