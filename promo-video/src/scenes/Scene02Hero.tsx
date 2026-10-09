import { Img, staticFile } from 'remotion';
import { SceneStage } from '../components/SceneStage';
import { SCENE_TEXT } from '../theme/script';

const t = SCENE_TEXT.Scene02Hero!;

/** SCENE 02 — Hero Public Web (150f). Screenshot real dentro de BrowserFrame. */
export const Scene02Hero: React.FC = () => (
  <SceneStage
    eyebrow={t.eyebrow}
    title={t.title}
    url="mapsasesores.com"
    camera={{ scaleFrom: 1.08, scaleTo: 1, yFrom: 0, yTo: -12 }}
  >
    <Img
      src={staticFile('screenshots/public-web/hero.png')}
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
