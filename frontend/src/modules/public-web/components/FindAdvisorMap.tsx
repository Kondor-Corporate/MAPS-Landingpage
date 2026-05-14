import { useMemo, useRef, useState } from 'react';
import Map, { Marker, Popup, type MapRef } from 'react-map-gl/maplibre';

const PinIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10 1.667c-3.682 0-6.667 2.985-6.667 6.667 0 4.583 6.667 10 6.667 10s6.667-5.417 6.667-10c0-3.682-2.985-6.667-6.667-6.667Zm0 9.166a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"
    />
  </svg>
);

type Advisor = {
  id: string;
  name: string;
  role: string;
  longitude: number;
  latitude: number;
  highlighted?: boolean;
};

const DEFAULT_VIEW = {
  longitude: -58.3816,
  latitude: -34.6037,
  zoom: 12,
};

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

const ADVISORS: Advisor[] = [
  {
    id: 'carlos-rivera',
    name: 'Carlos Rivera',
    role: 'Asesor · 1.2 km de distancia',
    longitude: -58.3816,
    latitude: -34.6037,
    highlighted: true,
  },
  {
    id: 'lucia-fernandez',
    name: 'Lucía Fernández',
    role: 'Asesora · Palermo',
    longitude: -58.4302,
    latitude: -34.5889,
  },
  {
    id: 'martin-ibanez',
    name: 'Martín Ibáñez',
    role: 'Asesor · Belgrano',
    longitude: -58.4583,
    latitude: -34.5627,
  },
  {
    id: 'sofia-paz',
    name: 'Sofía Paz',
    role: 'Asesora · San Telmo',
    longitude: -58.3731,
    latitude: -34.6212,
  },
];

type GeocodeStatus = 'idle' | 'loading' | 'not-found' | 'error';

async function geocode(query: string) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: Array<{ lat: string; lon: string }> = await res.json();
  if (!data.length) return null;
  return {
    longitude: parseFloat(data[0].lon),
    latitude: parseFloat(data[0].lat),
  };
}

export function FindAdvisorMap() {
  const mapRef = useRef<MapRef | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<GeocodeStatus>('idle');

  const activeAdvisor = useMemo(() => ADVISORS.find((a) => a.id === activeId) ?? null, [activeId]);

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
      const result = await geocode(q);
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
            <PinIcon className="h-6 w-6" />
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-[36px] font-bold leading-tight lg:leading-[48px] tracking-[-0.9px] text-maps-heading">
            Encuentra a tu Asesor
          </h2>

          <p className="text-lg leading-[29px] text-maps-muted">
            Utiliza nuestro mapa interactivo para encontrar el asesor más cercano a tu ubicación y
            recibir atención personalizada.
          </p>

          <form
            className="mt-4 flex h-16 items-stretch overflow-hidden rounded-xl border border-maps-border bg-white shadow-card"
            onSubmit={handleSearch}
          >
            <span className="flex w-9 items-center justify-center text-maps-muted-soft">
              <PinIcon className="h-[18px] w-[18px]" />
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
        </div>
      </div>

      <div className="relative min-h-[300px] sm:min-h-[400px] lg:min-h-[600px] overflow-hidden">
        <Map
          ref={mapRef}
          initialViewState={DEFAULT_VIEW}
          mapStyle={MAP_STYLE}
          style={{ position: 'absolute', inset: 0 }}
          attributionControl={{ compact: true }}
          dragRotate={false}
          touchZoomRotate
        >
          {ADVISORS.map((advisor) => (
            <Marker
              key={advisor.id}
              longitude={advisor.longitude}
              latitude={advisor.latitude}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setActiveId(advisor.id);
              }}
            >
              <button
                type="button"
                aria-label={advisor.name}
                className={`flex h-9 w-9 -translate-y-1 cursor-pointer items-center justify-center rounded-full border-2 border-white text-white shadow-floating transition-transform hover:scale-110 ${
                  advisor.highlighted ? 'bg-maps-brand' : 'bg-maps-dark'
                }`}
              >
                <PinIcon className="h-5 w-5" />
              </button>
            </Marker>
          ))}

          {activeAdvisor && (
            <Popup
              longitude={activeAdvisor.longitude}
              latitude={activeAdvisor.latitude}
              anchor="bottom"
              offset={36}
              closeButton
              closeOnClick={false}
              onClose={() => setActiveId(null)}
              className="maps-popup"
            >
              <p className="text-sm font-bold text-maps-heading">{activeAdvisor.name}</p>
              <p className="text-xs text-maps-muted">{activeAdvisor.role}</p>
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
              <path d="M1 1h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
}
