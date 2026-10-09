import "./index.css";
import { Composition, Folder } from "remotion";
import { MapsPromoVideo } from "./Composition";
import { sceneRegistry } from "./scenes";
import { FPS, HEIGHT, SCENES, TOTAL_DURATION, WIDTH } from "./theme/timings";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Video completo: recorrelo entero para verificar el timing. */}
      <Composition
        id="MapsPromo"
        component={MapsPromoVideo}
        durationInFrames={TOTAL_DURATION}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />

      {/* Cada escena registrada aparte para editarla/previsualizarla aislada. */}
      <Folder name="Scenes">
        {SCENES.map((scene) => {
          const Scene = sceneRegistry[scene.id];
          return (
            <Composition
              key={scene.id}
              id={scene.id}
              component={Scene}
              durationInFrames={scene.durationInFrames}
              fps={FPS}
              width={WIDTH}
              height={HEIGHT}
            />
          );
        })}
      </Folder>
    </>
  );
};
