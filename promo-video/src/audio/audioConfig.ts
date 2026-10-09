/**
 * Configuración de audio. La infraestructura queda lista; el audio se activa
 * SOLO cuando existan los archivos y se apunten acá.
 *
 * Para activar audio:
 *   1. Colocá los archivos en:
 *        promo-video/public/audio/music.mp3       (música instrumental)
 *        promo-video/public/audio/voiceover.mp3   (locución)
 *   2. Poné las rutas (relativas a public/) en las constantes de abajo:
 *        export const MUSIC_SRC = 'audio/music.mp3';
 *        export const VOICEOVER_SRC = 'audio/voiceover.mp3';
 *   3. Re-renderizá como out/maps-promo-final.mp4.
 *
 * Mientras sean null, el video se renderiza sin audio (versión de revisión) y
 * los captions quedan igualmente sincronizados.
 */
export const MUSIC_SRC: string | null = null;
export const VOICEOVER_SRC: string | null = null;

/** Volumen base de música (sobre 1). */
export const MUSIC_BASE_VOLUME = 0.2;
/** Volumen de música mientras hay locución (ducking). */
export const MUSIC_DUCK_VOLUME = 0.1;

/** Frames de fade in / out de la música. */
export const MUSIC_FADE_IN = 30;
export const MUSIC_FADE_OUT = 45;

/**
 * Frame donde arranca la locución (0:03 = primer cue). Si tu archivo de voz ya
 * está autoreado a la línea de tiempo completa desde 0:00, poné 0.
 */
export const VOICEOVER_START_FRAME = 90;
