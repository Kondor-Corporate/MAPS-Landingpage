import type { CSSProperties } from 'react';
import {
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

type Props = {
  /** Frame (relativo a la escena) en el que empieza a entrar el logo. */
  startFrame?: number;
  /** Alto del logo en px. */
  height?: number;
  style?: CSSProperties;
};

/**
 * Logo real de MAPS (M teal) con entrada premium controlada por el timeline:
 * opacity 0→1, scale 0.92→1 (spring suave, sin rebote), blur 12px→0 y un leve
 * desplazamiento vertical. Todo driveado por useCurrentFrame().
 */
export const AnimatedLogo: React.FC<Props> = ({
  startFrame = 6,
  height = 210,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - startFrame;

  const scale = spring({
    frame: local,
    fps,
    from: 0.92,
    to: 1,
    config: { damping: 200, mass: 0.8 }, // crítico: sin rebote
  });

  return (
    <Img
      src={staticFile('brand/maps-logo.webp')}
      style={{
        height,
        width: 'auto',
        scale,
        opacity: interpolate(local, [0, 28], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        filter: `blur(${interpolate(local, [0, 30], [12, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })}px)`,
        translate: interpolate(local, [0, 34], ['0px 16px', '0px 0px'], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        ...style,
      }}
    />
  );
};
