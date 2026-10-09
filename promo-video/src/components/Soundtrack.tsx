import { Audio, Sequence, interpolate, staticFile, useVideoConfig } from 'remotion';
import {
  MUSIC_BASE_VOLUME,
  MUSIC_DUCK_VOLUME,
  MUSIC_FADE_IN,
  MUSIC_FADE_OUT,
  MUSIC_SRC,
  VOICEOVER_SRC,
  VOICEOVER_START_FRAME,
} from '../audio/audioConfig';
import { CAPTION_CUES } from '../theme/script';

/**
 * Pista de audio del video. Solo emite <Audio> cuando hay archivos configurados
 * en audioConfig. Música con fade in/out y ducking durante la locución; voz a
 * volumen normal. Si no hay archivos, no renderiza nada (versión sin audio).
 */
export const Soundtrack: React.FC = () => {
  const { durationInFrames } = useVideoConfig();

  const hasVoice = Boolean(VOICEOVER_SRC);
  const speaking = new Set<number>();
  if (hasVoice) {
    for (const c of CAPTION_CUES) {
      for (let f = c.from; f < c.to; f++) speaking.add(f);
    }
  }

  return (
    <>
      {MUSIC_SRC ? (
        <Audio
          src={staticFile(MUSIC_SRC)}
          volume={(f) => {
            const fade = interpolate(
              f,
              [0, MUSIC_FADE_IN, durationInFrames - MUSIC_FADE_OUT, durationInFrames],
              [0, 1, 1, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            );
            const target = hasVoice && speaking.has(f)
              ? MUSIC_DUCK_VOLUME
              : MUSIC_BASE_VOLUME;
            return target * fade;
          }}
        />
      ) : null}

      {VOICEOVER_SRC ? (
        <Sequence from={VOICEOVER_START_FRAME} name="Voiceover">
          <Audio src={staticFile(VOICEOVER_SRC)} />
        </Sequence>
      ) : null}
    </>
  );
};
