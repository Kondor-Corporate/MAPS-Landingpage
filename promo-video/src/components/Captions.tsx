import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { colors } from '../theme/colors';
import { MANROPE, fontWeights } from '../theme/typography';
import { CAPTIONS_ENABLED, CAPTION_CUES } from '../theme/script';

/**
 * Captions sincronizados con la locución, driveados por el frame absoluto del
 * video. Píldora inferior central, discreta (fondo oscuro con blur sutil),
 * respetando safe areas. Se apaga con CAPTIONS_ENABLED.
 */
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();

  if (!CAPTIONS_ENABLED) return null;

  const cue = CAPTION_CUES.find((c) => frame >= c.from && frame < c.to);
  if (!cue) return null;

  const FADE = 8;
  const opacity = interpolate(
    frame,
    [cue.from, cue.from + FADE, cue.to - FADE, cue.to],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 64, // safe area inferior
        fontFamily: MANROPE,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 40px',
          padding: '14px 28px',
          borderRadius: 14,
          backgroundColor: 'rgba(12, 9, 19, 0.72)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: colors.white,
          fontSize: 30,
          lineHeight: 1.3,
          fontWeight: fontWeights.medium,
          textAlign: 'center',
          opacity,
        }}
      >
        {cue.text}
      </div>
    </AbsoluteFill>
  );
};
