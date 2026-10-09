import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { GradientBackground } from '../components/GradientBackground';
import { colors } from '../theme/colors';
import { MANROPE, fontWeights, letterSpacing } from '../theme/typography';

/**
 * SCENE 06 — Transición Public → Productor (90f). Bisagra conceptual del video.
 * Un wipe diagonal teal entra sobre el fondo oscuro, aparece el mensaje, y el
 * wipe se retira dejando el fondo oscuro listo para el Dashboard. Distintiva y
 * corta, sin transiciones genéricas.
 */
export const Scene06Transition: React.FC = () => {
  const frame = useCurrentFrame();

  // Panel teal diagonal: entra (0–20), sostiene (20–62), sale (62–86).
  const tx = interpolate(frame, [0, 20, 62, 86], [2600, 0, 0, -2600], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.65, 0, 0.35, 1),
  });

  // Texto: entra 24–44, sale 60–74.
  const textOpacity = interpolate(frame, [24, 42, 60, 74], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const textY = interpolate(frame, [24, 44], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const accentScaleX = interpolate(frame, [34, 52], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <GradientBackground variant="intro" glow={0.5}>
      {/* Panel diagonal teal */}
      <div
        style={{
          position: 'absolute',
          top: -160,
          left: -300,
          width: 2600,
          height: 1400,
          translate: `${tx}px 0px`,
          transform: 'skewX(-12deg)',
          backgroundImage: `linear-gradient(115deg, ${colors.brand} 0%, ${colors.brandHover} 55%, #0a5f70 100%)`,
          boxShadow: '0 0 120px rgba(0,164,192,0.45)',
        }}
      />

      {/* Mensaje bisagra */}
      <AbsoluteFill
        style={{
          fontFamily: MANROPE,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: textOpacity,
          translate: `0px ${textY}px`,
        }}
      >
        <div
          style={{
            color: 'rgba(255,255,255,0.82)',
            fontSize: 34,
            fontWeight: fontWeights.medium,
            letterSpacing: letterSpacing.tight,
          }}
        >
          Y del otro lado,
        </div>
        <div
          style={{
            color: colors.white,
            fontSize: 64,
            fontWeight: fontWeights.extrabold,
            letterSpacing: letterSpacing.tight,
            marginTop: 6,
          }}
        >
          el portal del productor
        </div>
        <div
          style={{
            marginTop: 24,
            width: 140,
            height: 3,
            borderRadius: 3,
            backgroundColor: colors.white,
            opacity: 0.9,
            scale: `${accentScaleX} 1`,
          }}
        />
      </AbsoluteFill>
    </GradientBackground>
  );
};
