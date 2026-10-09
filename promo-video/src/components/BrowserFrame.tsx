import type { CSSProperties, ReactNode } from 'react';
import { colors } from '../theme/colors';
import { MANROPE } from '../theme/typography';

type Props = {
  width: number;
  height: number;
  /** Texto discreto en la barra (dominio/ruta). */
  url?: string;
  children: ReactNode;
  style?: CSSProperties;
};

const BAR_HEIGHT = 46;

/**
 * Marco de navegador limpio y moderno. No imita Chrome literalmente: barra
 * minimalista con tres puntos monocromáticos y una píldora de dirección sutil.
 * No debe robar atención a la página que enmarca.
 */
export const BrowserFrame: React.FC<Props> = ({
  width,
  height,
  url = 'mapsasesores.com',
  children,
  style,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: colors.white,
        boxShadow:
          '0 40px 90px -30px rgba(0,0,0,0.65), 0 12px 30px -12px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        ...style,
      }}
    >
      {/* Barra superior minimalista */}
      <div
        style={{
          height: BAR_HEIGHT,
          flexShrink: 0,
          backgroundColor: '#f2f3f6',
          borderBottom: '1px solid #e6e7ec',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          paddingLeft: 18,
          paddingRight: 18,
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          {['#cfd2da', '#cfd2da', '#cfd2da'].map((c, i) => (
            <span
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: c,
              }}
            />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            height: 26,
            borderRadius: 13,
            backgroundColor: '#ffffff',
            border: '1px solid #e6e7ec',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingLeft: 14,
            fontFamily: MANROPE,
            fontSize: 13,
            fontWeight: 500,
            color: colors.mutedSoft,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: colors.brand,
            }}
          />
          {url}
        </div>
      </div>

      {/* Contenido (clip de la página) */}
      <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
};

export const BROWSER_BAR_HEIGHT = BAR_HEIGHT;
