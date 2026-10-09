import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { colors } from '../theme/colors';
import { MANROPE, fontWeights, letterSpacing } from '../theme/typography';
import { GradientBackground } from './GradientBackground';

type Props = {
  /** Número de escena (2..10). */
  index: number;
  /** Subtítulo corto de la escena, p. ej. "MAPA". */
  title: string;
};

/**
 * Placeholder reutilizable para las escenas 02–10 (aún sin desarrollar).
 * Fondo neutro de marca + "SCENE 0X" + etiqueta, para distinguirlas en el timeline.
 * No usa screenshots ni recordings.
 */
export const ScenePlaceholder: React.FC<Props> = ({ index, title }) => {
  const frame = useCurrentFrame();
  const label = `SCENE ${String(index).padStart(2, '0')}`;

  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <GradientBackground variant="placeholder">
      <AbsoluteFill
        style={{
          fontFamily: MANROPE,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 20,
          opacity,
        }}
      >
        <div
          style={{
            width: 56,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.brand,
            boxShadow: `0 0 18px ${colors.brand}`,
          }}
        />
        <div
          style={{
            color: colors.mutedSoft,
            fontSize: 30,
            fontWeight: fontWeights.semibold,
            letterSpacing: letterSpacing.wide,
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: colors.white,
            fontSize: 84,
            fontWeight: fontWeights.extrabold,
            letterSpacing: letterSpacing.tight,
          }}
        >
          {title}
        </div>
      </AbsoluteFill>
    </GradientBackground>
  );
};
