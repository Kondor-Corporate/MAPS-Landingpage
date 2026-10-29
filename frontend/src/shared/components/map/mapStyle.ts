import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';

// Vite pre-bundles maplibre-gl.mjs into node_modules/.vite/deps/, which breaks
// maplibre's default worker URL resolution (computed relative to import.meta.url
// of that bundled file, pointing at a worker script that doesn't exist there —
// causing every map to silently hang before the "load" event with no tiles/basemap).
// Pointing MapLibre at the URL Vite emits for the worker fixes it in dev and build.
setWorkerUrl(maplibreWorkerUrl);

export const MAP_STYLE =
  'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const LA_PLATA_VIEW = {
  longitude: -57.9545,
  latitude: -34.9215,
  zoom: 12,
};
