import { OffthreadVideo, staticFile } from 'remotion';
import { SceneStage } from '../components/SceneStage';
import { SCENE_TEXT } from '../theme/script';

const t = SCENE_TEXT.Scene07Dashboard!;

/**
 * SCENE 07 — Dashboard Intranet (180f). Grabación real login → dashboard dentro
 * del BrowserFrame. Cámara neutra a propósito: NO se hace zoom ni highlight
 * sobre el Portal SELF; el foco queda en el dashboard y sus herramientas.
 */
export const Scene07Dashboard: React.FC = () => (
  <SceneStage
    eyebrow={t.eyebrow}
    title={t.title}
    url="portal.mapsasesores.com"
    camera={{ scaleFrom: 1.01, scaleTo: 1.04 }}
  >
    <OffthreadVideo
      src={staticFile('recordings/login-dashboard.webm')}
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
