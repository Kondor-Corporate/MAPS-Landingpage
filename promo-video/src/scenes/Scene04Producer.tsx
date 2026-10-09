import { Img, staticFile } from 'remotion';
import { SceneStage } from '../components/SceneStage';
import { SCENE_TEXT } from '../theme/script';

const t = SCENE_TEXT.Scene04Producer!;

/**
 * SCENE 04 — Perfil público de Carlos Rodríguez (150f). Zoom suave de salida
 * que lleva la atención de la cabecera (nombre + verificado) hacia las
 * especialidades y datos.
 */
export const Scene04Producer: React.FC = () => (
  <SceneStage
    eyebrow={t.eyebrow}
    title={t.title}
    url="mapsasesores.com/productor/carlos-rodriguez"
    camera={{ scaleFrom: 1.14, scaleTo: 1, yFrom: 40, yTo: -10 }}
  >
    <Img
      src={staticFile('screenshots/public-web/producer-profile.png')}
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
