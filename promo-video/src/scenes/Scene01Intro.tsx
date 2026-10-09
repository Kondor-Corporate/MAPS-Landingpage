import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { GradientBackground } from '../components/GradientBackground';
import { TextReveal } from '../components/TextReveal';
import { colors } from '../theme/colors';
import { MANROPE, fontWeights, letterSpacing } from '../theme/typography';

/**
 * SCENE 01 — INTRO (90 frames / 3s). Escena terminada.
 *
 * Timeline (frames relativos a la escena):
 *   00–06  fundido casi a oscuras (glow apenas naciente)
 *   06–50  entra el logo real de MAPS: opacity 0→1, scale 0.92→1 (spring sin
 *          rebote), blur 12→0, leve translateY; el glow teal sube en paralelo
 *   34–52  aparece el wordmark "MAPS"
 *   42–60  aparece "ASESORES" (tracking amplio)
 *   52–72  la línea de acento teal se dibuja (scaleX 0→1) con glow sutil
 *   72–90  composición estable para una transición limpia hacia Scene02
 */
export const Scene01Intro: React.FC = () => {
  const frame = useCurrentFrame();

  // El glow teal del fondo nace con el logo y queda estable.
  const glow = interpolate(frame, [0, 40], [0.15, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // La línea de acento se dibuja de centro hacia afuera (scaleX 0→1).
  const accentScaleX = interpolate(frame, [52, 72], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const accentOpacity = interpolate(frame, [52, 66], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Fundido de salida del primer plano (no del fondo) para entregar limpio a Scene02.
  const sceneOut = interpolate(frame, [78, 90], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.4, 0, 1, 1),
  });

  return (
    <GradientBackground variant="intro" glow={glow}>
      <AbsoluteFill
        style={{
          fontFamily: MANROPE,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          opacity: sceneOut,
        }}
      >
        <AnimatedLogo startFrame={6} height={210} />

        <TextReveal
          startFrame={34}
          durationInFrames={18}
          style={{
            marginTop: 40,
            color: colors.white,
            fontSize: 96,
            fontWeight: fontWeights.extrabold,
            letterSpacing: letterSpacing.tightHeading,
            lineHeight: 1,
          }}
        >
          MAPS
        </TextReveal>

        <TextReveal
          startFrame={42}
          durationInFrames={18}
          fromY={10}
          style={{
            marginTop: 16,
            color: colors.brand,
            fontSize: 34,
            fontWeight: fontWeights.medium,
            letterSpacing: letterSpacing.ultraWide,
            // Compensar el tracking para mantener el bloque centrado.
            textIndent: letterSpacing.ultraWide,
          }}
        >
          ASESORES
        </TextReveal>

        {/* Acento geométrico teal, muy sutil. */}
        <div
          style={{
            marginTop: 34,
            width: 128,
            height: 3,
            borderRadius: 3,
            backgroundColor: colors.brand,
            opacity: accentOpacity,
            scale: `${accentScaleX} 1`,
            boxShadow: `0 0 16px rgba(0, 164, 192, 0.65)`,
          }}
        />
      </AbsoluteFill>
    </GradientBackground>
  );
};
