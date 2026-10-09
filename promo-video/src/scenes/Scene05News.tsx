import { Img, staticFile } from 'remotion';
import { SceneStage } from '../components/SceneStage';
import { SCENE_TEXT } from '../theme/script';

const t = SCENE_TEXT.Scene05News!;

/**
 * SCENE 05 — Noticias públicas (150f). Barrido editorial suave sobre las cards
 * reales de la home.
 */
export const Scene05News: React.FC = () => (
  <SceneStage
    eyebrow={t.eyebrow}
    title={t.title}
    url="mapsasesores.com/#noticias"
    camera={{ scaleFrom: 1.08, scaleTo: 1.01, xFrom: 16, xTo: -16 }}
  >
    <Img
      src={staticFile('screenshots/public-web/news.png')}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'top center',
      }}
    />
  </SceneStage>
);
