import { OffthreadVideo, staticFile } from 'remotion';
import { SceneStage } from '../components/SceneStage';
import { SCENE_TEXT } from '../theme/script';

const t = SCENE_TEXT.Scene03Map!;

/**
 * SCENE 03 — Mapa (210f). Grabación real de la interacción (búsqueda → pins →
 * popup) dentro del BrowserFrame, con un acercamiento cinematográfico leve.
 */
export const Scene03Map: React.FC = () => (
  <SceneStage
    eyebrow={t.eyebrow}
    title={t.title}
    url="mapsasesores.com/#mapa"
    camera={{ scaleFrom: 1, scaleTo: 1.08, xTo: -12, yTo: -6 }}
  >
    <OffthreadVideo
      src={staticFile('recordings/map-search.webm')}
      muted
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }}
    />
  </SceneStage>
);
