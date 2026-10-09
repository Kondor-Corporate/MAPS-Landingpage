/**
 * FUENTE ÚNICA DE VERDAD del timing del video.
 * Ningún componente debe hardcodear duraciones: todo sale de acá.
 *
 * Video: 1920x1080 @ 30fps, 56s = 1680 frames.
 */
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export type SceneId =
  | 'Scene01Intro'
  | 'Scene02Hero'
  | 'Scene03Map'
  | 'Scene04Producer'
  | 'Scene05News'
  | 'Scene06Transition'
  | 'Scene07Dashboard'
  | 'Scene08Library'
  | 'Scene09ProducerPortal'
  | 'Scene10Outro';

export type SceneTiming = {
  id: SceneId;
  /** Etiqueta legible que aparece en el timeline de Remotion Studio. */
  label: string;
  durationInFrames: number;
};

/** Orden y duración exactos del video (back-to-back, sin solapamientos). */
export const SCENES: SceneTiming[] = [
  { id: 'Scene01Intro', label: '01 · Intro', durationInFrames: 90 }, //        0:00–0:03
  { id: 'Scene02Hero', label: '02 · Hero Public Web', durationInFrames: 150 }, // 0:03–0:08
  { id: 'Scene03Map', label: '03 · Mapa', durationInFrames: 210 }, //          0:08–0:15
  { id: 'Scene04Producer', label: '04 · Perfil público', durationInFrames: 150 }, // 0:15–0:20
  { id: 'Scene05News', label: '05 · Noticias públicas', durationInFrames: 150 }, // 0:20–0:25
  { id: 'Scene06Transition', label: '06 · Public → Productor', durationInFrames: 90 }, // 0:25–0:28
  { id: 'Scene07Dashboard', label: '07 · Dashboard Intranet', durationInFrames: 180 }, // 0:28–0:34
  { id: 'Scene08Library', label: '08 · Biblioteca Digital', durationInFrames: 210 }, // 0:34–0:41
  { id: 'Scene09ProducerPortal', label: '09 · Noticias + Mi Perfil', durationInFrames: 300 }, // 0:41–0:51
  { id: 'Scene10Outro', label: '10 · Outro', durationInFrames: 150 }, //       0:51–0:56
];

/** Duración total del video, derivada (no hardcodeada). Debe dar 1680. */
export const TOTAL_DURATION = SCENES.reduce(
  (sum, scene) => sum + scene.durationInFrames,
  0,
);

/** Frame absoluto en el que arranca una escena dentro del video completo. */
export const sceneStartFrame = (id: SceneId): number => {
  let acc = 0;
  for (const scene of SCENES) {
    if (scene.id === id) return acc;
    acc += scene.durationInFrames;
  }
  throw new Error(`Escena desconocida: ${id}`);
};
