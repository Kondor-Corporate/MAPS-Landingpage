/**
 * Guion centralizado del video: textos en pantalla por escena + cues de captions.
 * Fuente única para no duplicar copy en los componentes.
 * Los cues usan frames absolutos (30fps) alineados al storyboard aprobado.
 */
import type { SceneId } from './timings';

/** Interruptor global de captions (se puede apagar sin tocar escenas). */
export const CAPTIONS_ENABLED = true;

export type OnScreenText = { eyebrow?: string; title: string };

/** Textos en pantalla (títulos cortos) por escena. */
export const SCENE_TEXT: Partial<Record<SceneId, OnScreenText>> = {
  Scene02Hero: {
    eyebrow: 'La web de MAPS',
    title: 'El compromiso de asesorar está en nuestro ADN',
  },
  Scene03Map: {
    eyebrow: 'Mapa de asesores',
    title: 'Encontrá a tu asesor, donde estés',
  },
  Scene04Producer: {
    eyebrow: 'Perfil del productor',
    title: 'Conocé a cada productor MAPS',
  },
  Scene05News: {
    eyebrow: 'Actualidad',
    title: 'Siempre informados',
  },
  Scene07Dashboard: {
    eyebrow: 'Portal del productor',
    title: 'Herramientas para tu día a día',
  },
  Scene08Library: {
    eyebrow: 'Biblioteca digital',
    title: 'Recursos y material comercial siempre a mano',
  },
};

/** Cue de caption con rango en frames absolutos. */
export type CaptionCue = { from: number; to: number; text: string };

/** Locución aprobada, sincronizada al storyboard (0:03–0:56). */
export const CAPTION_CUES: CaptionCue[] = [
  { from: 90, to: 240, text: 'Detrás de cada asesor, hay una organización que respalda.' },
  { from: 240, to: 450, text: 'Encontrá un asesor cerca tuyo de forma simple y directa.' },
  { from: 450, to: 600, text: 'Conocé quién es cada productor y cómo puede acompañarte.' },
  { from: 600, to: 750, text: 'Siempre al tanto de lo que pasa en MAPS.' },
  { from: 750, to: 840, text: 'Pero acá no termina todo.' },
  {
    from: 840,
    to: 1020,
    text: 'Para nuestros productores, herramientas pensadas para acompañar el día a día.',
  },
  {
    from: 1020,
    to: 1230,
    text: 'Todo el material que necesitan, organizado y siempre disponible.',
  },
  { from: 1230, to: 1380, text: 'Las novedades de MAPS, también en el portal del productor.' },
  { from: 1380, to: 1530, text: 'Y cada productor, con su perfil siempre al día.' },
  { from: 1530, to: 1680, text: 'MAPS Asesores. Conectados para asesorar mejor.' },
];
