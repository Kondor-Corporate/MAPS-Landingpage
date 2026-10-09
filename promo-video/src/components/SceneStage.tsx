import type { ReactNode } from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { colors, gradients } from '../theme/colors';
import { MANROPE, fontWeights, letterSpacing } from '../theme/typography';
import { BrowserFrame } from './BrowserFrame';

/** Movimiento de cámara sobre el contenido del browser frame. */
export type Camera = {
  scaleFrom?: number;
  scaleTo?: number;
  /** Desplazamiento del contenido en px (para paneos). */
  xFrom?: number;
  xTo?: number;
  yFrom?: number;
  yTo?: number;
};

type Props = {
  eyebrow?: string;
  title: string;
  /** Dominio/ruta mostrada en la barra del browser. */
  url?: string;
  camera?: Camera;
  /** Media que llena el área de contenido (Img u OffthreadVideo con inset:0). */
  children: ReactNode;
  /** Alinear el bloque de título: por defecto a la izquierda del frame. */
  titleAlign?: 'left' | 'center';
};

// Geometría del escenario (constante en todas las escenas de producto).
const FRAME_W = 1240;
const CONTENT_H = 698; // 16:9 aprox del contenido
const OUTER_H = CONTENT_H + 46; // + barra
const FRAME_X = (1920 - FRAME_W) / 2; // 340
const FRAME_Y = 180;

/**
 * Escenario reutilizable de producto: fondo de marca (idéntico entre escenas
 * para cortes invisibles), título arriba, browser frame centrado con cámara
 * suave (Ken Burns) sobre el contenido, y fundido de entrada/salida del
 * primer plano. Todo driveado por frames.
 */
export const SceneStage: React.FC<Props> = ({
  eyebrow,
  title,
  url,
  camera,
  children,
  titleAlign = 'left',
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const {
    scaleFrom = 1.06,
    scaleTo = 1,
    xFrom = 0,
    xTo = 0,
    yFrom = 0,
    yTo = 0,
  } = camera ?? {};

  // Fundido de primer plano (entra/sale sobre el fondo de marca compartido).
  const fgOpacity = interpolate(
    frame,
    [0, 14, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    },
  );

  // Cámara suave sobre el contenido.
  const camScale = interpolate(frame, [0, durationInFrames], [scaleFrom, scaleTo], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.33, 0, 0.2, 1),
  });
  const camX = interpolate(frame, [0, durationInFrames], [xFrom, xTo], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.33, 0, 0.2, 1),
  });
  const camY = interpolate(frame, [0, durationInFrames], [yFrom, yTo], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.33, 0, 0.2, 1),
  });

  // Entrada del browser frame: leve subida + acercamiento.
  const frameRise = interpolate(frame, [0, 22], [26, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const framePop = interpolate(frame, [0, 22], [0.985, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  // Revelado del título (un pelín después del frame).
  const titleReveal = interpolate(frame, [6, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const titleY = interpolate(frame, [6, 24], [14, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.dark, fontFamily: MANROPE }}>
      {/* Fondo de marca compartido */}
      <AbsoluteFill style={{ backgroundImage: gradients.stage }} />
      <AbsoluteFill style={{ backgroundImage: gradients.stageGlow }} />

      {/* Primer plano (fundido de entrada/salida) */}
      <AbsoluteFill style={{ opacity: fgOpacity }}>
        {/* Título */}
        <div
          style={{
            position: 'absolute',
            top: 58,
            left: titleAlign === 'left' ? FRAME_X : 0,
            width: titleAlign === 'left' ? FRAME_W : '100%',
            textAlign: titleAlign,
            opacity: titleReveal,
            translate: `0px ${titleY}px`,
          }}
        >
          {eyebrow ? (
            <div
              style={{
                color: colors.brand,
                fontSize: 20,
                fontWeight: fontWeights.bold,
                letterSpacing: letterSpacing.wide,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              {eyebrow}
            </div>
          ) : null}
          <div
            style={{
              color: colors.white,
              fontSize: 46,
              lineHeight: 1.1,
              fontWeight: fontWeights.extrabold,
              letterSpacing: letterSpacing.tight,
              maxWidth: FRAME_W,
            }}
          >
            {title}
          </div>
        </div>

        {/* Browser frame con cámara */}
        <div
          style={{
            position: 'absolute',
            left: FRAME_X,
            top: FRAME_Y,
            translate: `0px ${frameRise}px`,
            scale: framePop,
          }}
        >
          <BrowserFrame width={FRAME_W} height={OUTER_H} url={url}>
            <AbsoluteFill
              style={{
                scale: camScale,
                translate: `${camX}px ${camY}px`,
              }}
            >
              {children}
            </AbsoluteFill>
          </BrowserFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
