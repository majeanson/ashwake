import type { LandmarkReward } from '@engine/state';
import type { Voice } from '@theme/tokens';

/**
 * The board's voice (Stage 5, 2026-08-29).
 *
 * Every direction has carried a full `voice` block since the rules were
 * lifted — pop tones, a struck note per claim kind, the running-dry fade, a
 * master gain — and nothing has ever played a note of it.
 *
 * **Synthesised, not sampled.** Five oscillator notes cost nothing to ship and
 * are a property of the DIRECTION rather than of a file: torchlit's bells and
 * daylight's are different numbers in the same theme object, so a new
 * direction arrives with a voice the way it arrives with a palette. A sample
 * pack would be a second art pipeline and a payload, for five sounds.
 *
 * **Nothing is created until a tap asks for it.** An `AudioContext` built at
 * boot is a context every browser starts suspended and some count against the
 * page — and, more to the point, sound is off by default (`ui.sound`), so the
 * common case must cost nothing at all. The first note builds the context, and
 * the tap that enables sound is itself the user gesture browsers require.
 *
 * **It never throws into the game.** Audio is a courtesy: a device that
 * refuses it should be a quiet device, not a broken one. Every entry point
 * swallows, which is why this file has no error path a caller must handle.
 */

let ctx: AudioContext | null = null;

/** The context, built on first use. Null where this browser has no audio. */
function audio(): AudioContext | null {
  if (ctx !== null) return ctx;
  try {
    const Ctor =
      window.AudioContext ??
      (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctor === undefined) return null;
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * One struck note.
 *
 * An exponential decay from the gain to silence, because that is what a struck
 * thing does and a linear fade reads as a synthesiser. `0.0001` rather than
 * zero: `exponentialRampToValueAtTime` cannot reach zero, and the browsers
 * that enforce it throw rather than clamp.
 */
function strike(voice: Voice, hz: number, decay: number, wave: OscillatorType, at = 0): void {
  const a = audio();
  if (a === null) return;
  try {
    const t = a.currentTime + at;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(hz, t);
    gain.gain.setValueAtTime(voice.gain, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + decay);
  } catch {
    // A device that will not sound is a quiet device, not a broken one.
  }
}

/**
 * Wake the audio, and say so with one note.
 *
 * The tap that enables sound is the user gesture every browser requires, so
 * the toggle plays its own confirmation — which is both the courtesy and the
 * gesture, at no extra cost.
 */
export function wake(voice: Voice): void {
  const a = audio();
  if (a === null) return;
  void a.resume().catch(() => undefined);
  strike(voice, voice.claim.shrine, voice.claimDecay, voice.claimWave);
}

/**
 * A pop: a rising run of bells, one per tile.
 *
 * The pocket's SIZE is the thing you hear — `stepHz` per extra tile — so a
 * big pocket is audibly bigger before any number is read. Capped, because a
 * twenty-tile pocket is a chord nobody asked for and the tail would outlast
 * the animation it belongs to.
 */
const MOST_BELLS = 8;

export function pop(voice: Voice, tiles: number): void {
  const bells = Math.max(1, Math.min(MOST_BELLS, tiles));
  for (let i = 0; i < bells; i++) {
    strike(
      voice,
      voice.pop.baseHz + i * voice.pop.stepHz,
      voice.pop.decay,
      voice.pop.wave,
      // Spread across the leap, so the run of bells and the tiles in the air
      // are the same event rather than two.
      i * 0.045,
    );
  }
}

/** One struck note per claim kind — cache warm, site bright, shrine strange. */
export function claim(voice: Voice, reward: LandmarkReward): void {
  strike(voice, voice.claim[reward], voice.claimDecay, voice.claimWave);
}

/**
 * Give the audio back.
 *
 * Turning sound OFF should cost the device nothing, not merely stop making
 * noise: an `AudioContext` holds a hardware output open, and a page that
 * keeps one after the player said no is a page still spending battery on a
 * feature they declined. The next note builds a fresh one.
 */
export function silence(): void {
  const a = ctx;
  ctx = null;
  if (a === null) return;
  try {
    void a.close?.();
  } catch {
    // Already gone, or a context that will not close. Either way it is no
    // longer ours.
  }
}

/** Running dry: the low fade when the purse first nears the next cost. */
export function dry(voice: Voice): void {
  strike(voice, voice.dry.hz, voice.dry.decay, 'sine');
}
