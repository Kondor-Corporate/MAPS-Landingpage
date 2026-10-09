import { AbsoluteFill, Series } from 'remotion';
import { Captions } from './components/Captions';
import { Soundtrack } from './components/Soundtrack';
import { sceneRegistry } from './scenes';
import { SCENES } from './theme/timings';

/**
 * Composición principal del video promo MAPS.
 * Ensambla las 10 escenas back-to-back según theme/timings.ts (sin solapamiento,
 * total = 1680 frames exactos). Las transiciones se resuelven dentro de cada
 * escena (fundido de primer plano sobre fondo de marca compartido + wipe teal
 * distintivo en Scene06), preservando los límites de frame exactos.
 * Captions y Soundtrack se superponen a nivel composición (frame absoluto).
 */
export const MapsPromoVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      <Series>
        {SCENES.map((scene) => {
          const Scene = sceneRegistry[scene.id];
          return (
            <Series.Sequence
              key={scene.id}
              durationInFrames={scene.durationInFrames}
              name={scene.label}
            >
              <Scene />
            </Series.Sequence>
          );
        })}
      </Series>

      <Captions />
      <Soundtrack />
    </AbsoluteFill>
  );
};
