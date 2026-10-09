import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { AnimatedLogo } from '../components/AnimatedLogo';
import { GradientBackground } from '../components/GradientBackground';
import { TextReveal } from '../components/TextReveal';
import { colors } from '../theme/colors';
import { MANROPE, fontWeights, letterSpacing } from '../theme/typography';

/**
 * SCENE 10 — Outro (150f). Retoma el lenguaje de la intro para cerrar el arco:
 * logo MAPS, wordmark, tagline y CTA. Entrada sobria; el CTA queda visible
 * hasta el final y el último frame sirve como end card / thumbnail.
 */
export const Scene10Outro: React.FC = () => {
  const frame = useCurrentFrame();

  const glow = interpolate(frame, [0, 40], [0.2, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const accentScaleX = interpolate(frame, [44, 64], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
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
        }}
      >
        <AnimatedLogo startFrame={6} height={150} />

        {/* Wordmark */}
        <TextReveal
          startFrame={26}
          durationInFrames={18}
          style={{
            marginTop: 32,
            display: 'flex',
            alignItems: 'baseline',
            gap: 18,
          }}
        >
          <span
            style={{
              color: colors.white,
              fontSize: 64,
              fontWeight: fontWeights.extrabold,
              letterSpacing: letterSpacing.tightHeading,
            }}
          >
            MAPS
          </span>
          <span
            style={{
              color: colors.brand,
              fontSize: 30,
              fontWeight: fontWeights.medium,
              letterSpacing: letterSpacing.ultraWide,
            }}
          >
            ASESORES
          </span>
        </TextReveal>

        {/* Acento */}
        <div
          style={{
            marginTop: 26,
            width: 128,
            height: 3,
            borderRadius: 3,
            backgroundColor: colors.brand,
            scale: `${accentScaleX} 1`,
            boxShadow: '0 0 16px rgba(0,164,192,0.65)',
          }}
        />

        {/* Tagline */}
        <TextReveal
          startFrame={40}
          durationInFrames={20}
          fromY={12}
          style={{
            marginTop: 26,
            color: 'rgba(255,255,255,0.86)',
            fontSize: 30,
            fontWeight: fontWeights.regular,
            letterSpacing: letterSpacing.tight,
          }}
        >
          Conectados para asesorar mejor.
        </TextReveal>

        {/* CTA */}
        <TextReveal
          startFrame={54}
          durationInFrames={18}
          fromY={10}
          style={{ marginTop: 40 }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              backgroundColor: colors.brand,
              color: colors.white,
              fontSize: 24,
              fontWeight: fontWeights.bold,
              letterSpacing: '0.2px',
              padding: '16px 34px',
              borderRadius: 12,
              boxShadow: '0 16px 40px -14px rgba(0,164,192,0.7)',
            }}
          >
            Conocé MAPS
          </div>
        </TextReveal>
      </AbsoluteFill>
    </GradientBackground>
  );
};
