import { Img, Sequence, staticFile } from 'remotion';
import { SceneStage } from '../components/SceneStage';

/**
 * SCENE 09 — Noticias + Mi Perfil (300f), dividida en dos mitades de 150f que
 * comparten el mismo fondo de marca, así el corte entre ellas es limpio y sin
 * pantalla negra.
 *   A (0–150):  Novedades internas
 *   B (150–300): Mi Perfil del productor
 */
export const Scene09ProducerPortal: React.FC = () => (
  <>
    <Sequence durationInFrames={150} name="09A · Novedades">
      <SceneStage
        eyebrow="Novedades"
        title="Novedades al día"
        url="portal.mapsasesores.com/novedades"
        camera={{ scaleFrom: 1.07, scaleTo: 1, yFrom: 8, yTo: -6 }}
      >
        <Img
          src={staticFile('screenshots/intranet/news.png')}
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
    </Sequence>

    <Sequence from={150} durationInFrames={150} name="09B · Mi Perfil">
      <SceneStage
        eyebrow="Mi perfil"
        title="Tu perfil, siempre actualizado"
        url="portal.mapsasesores.com/mi-perfil"
        camera={{ scaleFrom: 1.12, scaleTo: 1, yFrom: 30, yTo: -8 }}
      >
        <Img
          src={staticFile('screenshots/intranet/my-profile.png')}
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
    </Sequence>
  </>
);
