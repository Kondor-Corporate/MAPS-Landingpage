import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { colors, gradients } from '../theme/colors';

type Variant = 'intro' | 'placeholder';

type Props = {
  variant?: Variant;
  /** Glow teal superpuesto (0 = sin glow, 1 = glow pleno). Solo aplica a `intro`. */
  glow?: number;
  children?: ReactNode;
  style?: CSSProperties;
};

/**
 * Fondo de marca reutilizable. `intro` es el fondo oscuro premium con glow teal
 * opcional; `placeholder` es el neutro coherente usado por las escenas 02–10.
 */
export const GradientBackground: React.FC<Props> = ({
  variant = 'intro',
  glow = 1,
  children,
  style,
}) => {
  const base = variant === 'intro' ? gradients.intro : gradients.placeholder;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.ink, ...style }}>
      <AbsoluteFill style={{ backgroundImage: base }} />
      {variant === 'intro' ? (
        <AbsoluteFill
          style={{ backgroundImage: gradients.brandGlow, opacity: glow }}
        />
      ) : null}
      {children}
    </AbsoluteFill>
  );
};
