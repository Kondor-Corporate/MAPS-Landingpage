/**
 * Paleta de marca MAPS, espejo del branding real del frontend.
 * Fuente: ../frontend/tailwind.config.ts (no se modifica ese archivo).
 * El video debe sentirse como una extensión audiovisual de MAPS, no una marca nueva.
 */
export const colors = {
  /** Color principal de marca. */
  brand: '#00A4C0',
  brandHover: '#0089A3',
  brandSoft: 'rgba(0, 164, 192, 0.1)',

  /** Oscuros de marca (fondos premium). */
  dark: '#161121',
  heading: '#131117',

  /** Texto. */
  body: '#374151',
  muted: '#6E6487',
  mutedSoft: '#9CA3AF',

  /** Superficies claras / neutras. */
  surface: '#F8FAFC',
  border: '#DEDCE5',
  white: '#FFFFFF',

  /** Base extra-oscura para la intro (un paso por debajo de `dark`). */
  ink: '#0C0913',
} as const;

/** Gradientes reutilizables construidos sobre la paleta. */
export const gradients = {
  /** Fondo oscuro de intro/outro con base de marca. */
  intro: `linear-gradient(160deg, ${colors.ink} 0%, ${colors.dark} 55%, #1c1630 100%)`,
  /** Glow teal muy sutil, centrado, para superponer sobre el fondo oscuro. */
  brandGlow: `radial-gradient(60% 55% at 50% 42%, rgba(0, 164, 192, 0.28) 0%, rgba(0, 164, 192, 0.08) 40%, rgba(0, 164, 192, 0) 72%)`,
  /** Fondo neutro para placeholders (distinguible en el timeline, coherente con marca). */
  placeholder: `linear-gradient(155deg, #1a1526 0%, ${colors.dark} 60%, #12101c 100%)`,
  /**
   * Fondo de escenas de producto (browser frame + textos). Oscuro de marca,
   * idéntico en todas las escenas de producto para que los cortes entre ellas
   * sean invisibles y solo el contenido haga cross-dissolve.
   */
  stage: `linear-gradient(155deg, #171226 0%, ${colors.dark} 58%, #100d1a 100%)`,
  /** Glow teal lateral sutil para dar vida al fondo de escena. */
  stageGlow: `radial-gradient(70% 80% at 78% 30%, rgba(0, 164, 192, 0.22) 0%, rgba(0, 164, 192, 0.06) 42%, rgba(0, 164, 192, 0) 72%)`,
} as const;
