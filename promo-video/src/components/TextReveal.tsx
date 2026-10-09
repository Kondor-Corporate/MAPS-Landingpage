import type { CSSProperties, ReactNode } from 'react';
import { Easing, interpolate, useCurrentFrame } from 'remotion';

type Props = {
  /** Frame (relativo a la escena) en el que empieza a revelarse el texto. */
  startFrame?: number;
  /** Cuántos frames dura la entrada. */
  durationInFrames?: number;
  /** Desplazamiento vertical inicial en px. */
  fromY?: number;
  children: ReactNode;
  style?: CSSProperties;
};

/**
 * Revelado de texto reutilizable: opacity 0→1 + leve translateY, driveado por
 * el timeline. Se usa para los lockups de la intro y luego para otras escenas.
 */
export const TextReveal: React.FC<Props> = ({
  startFrame = 0,
  durationInFrames = 20,
  fromY = 16,
  children,
  style,
}) => {
  const frame = useCurrentFrame();
  const local = frame - startFrame;

  return (
    <div
      style={{
        opacity: interpolate(local, [0, durationInFrames], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        translate: interpolate(
          local,
          [0, durationInFrames],
          [`0px ${fromY}px`, '0px 0px'],
          {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          },
        ),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
