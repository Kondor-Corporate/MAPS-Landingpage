import { Img, staticFile } from 'remotion';
import { SceneStage } from '../components/SceneStage';
import { SCENE_TEXT } from '../theme/script';

const t = SCENE_TEXT.Scene08Library!;

/**
 * SCENE 08 — Biblioteca Digital (210f). Paneo suave desde el hero de Biblioteca
 * hacia el grid de ramos, revelando la diversidad de recursos.
 */
export const Scene08Library: React.FC = () => (
  <SceneStage
    eyebrow={t.eyebrow}
    title={t.title}
    url="portal.mapsasesores.com/biblioteca"
    camera={{ scaleFrom: 1.1, scaleTo: 1.01, yFrom: 36, yTo: -34 }}
  >
    <Img
      src={staticFile('screenshots/intranet/library.png')}
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
