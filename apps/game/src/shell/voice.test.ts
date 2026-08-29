import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveTheme } from '@theme/index';
import { claim, dry, pop, silence, wake } from './voice';

/**
 * The board's voice, and the two promises it makes.
 *
 * **It is a courtesy, so it may never break the game.** A device that refuses
 * audio should be a quiet device, not a broken one — every entry point
 * swallows, which is the property worth testing because the failure it
 * prevents is an exception thrown out of a tap.
 *
 * **Nothing exists until something asks.** Sound is off by default, so the
 * common case must cost nothing at all — no context, no nodes, no work.
 */

const voice = resolveTheme('torchlit').voice;

/** A recording `AudioContext` that counts what was asked of it. */
function fakeAudio() {
  const started: { hz: number; at: number }[] = [];
  const node = () => ({
    connect: (next: unknown) => next,
    frequency: { setValueAtTime: (_hz: number, _at: number): void => undefined },
    gain: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined },
    type: 'sine',
    start: () => undefined,
    stop: () => undefined,
  });
  class Ctx {
    currentTime = 0;
    destination = {};
    resume = () => Promise.resolve();
    createGain = () => node();
    createOscillator() {
      const osc = node();
      osc.frequency.setValueAtTime = (hz: number, at: number) => void started.push({ hz, at });
      return osc;
    }
  }
  return { Ctx, started };
}

// The context is built once per page and held, which is right for a page and
// wrong between tests — each of these hands the module a different fake.
// `silence` is the same door the sound toggle uses when it is switched off.
beforeEach(() => silence());
afterEach(() => vi.unstubAllGlobals());

describe('the voice', () => {
  it('never throws, on a device with no audio at all', () => {
    vi.stubGlobal('window', {});
    expect(() => pop(voice, 5)).not.toThrow();
    expect(() => claim(voice, 'shrine')).not.toThrow();
    expect(() => dry(voice)).not.toThrow();
    expect(() => wake(voice)).not.toThrow();
  });

  it('never throws when the audio itself refuses', () => {
    class Hostile {
      constructor() {
        throw new Error('blocked');
      }
    }
    vi.stubGlobal('window', { AudioContext: Hostile });
    expect(() => pop(voice, 3)).not.toThrow();
  });

  it('rings once per tile, rising, so a big pocket sounds bigger', () => {
    const { Ctx, started } = fakeAudio();
    vi.stubGlobal('window', { AudioContext: Ctx });

    pop(voice, 4);
    expect(started).toHaveLength(4);
    // Rising: the pocket's SIZE is the thing you hear, before any number is
    // read off the screen.
    expect(started[3]!.hz).toBeGreaterThan(started[0]!.hz);
    // And spread in time, so the bells and the tiles in the air are one event.
    expect(started[3]!.at).toBeGreaterThan(started[0]!.at);
  });

  it('caps the run of bells, so a huge pocket is not a chord', () => {
    const { Ctx, started } = fakeAudio();
    vi.stubGlobal('window', { AudioContext: Ctx });
    pop(voice, 40);
    expect(started.length).toBeLessThanOrEqual(8);
  });

  it('gives every claim kind its own note', () => {
    const { Ctx, started } = fakeAudio();
    vi.stubGlobal('window', { AudioContext: Ctx });
    for (const kind of ['cache', 'site', 'territory', 'shrine', 'find'] as const) {
      claim(voice, kind);
    }
    expect(new Set(started.map((s) => s.hz)).size).toBe(5);
  });
});

describe('turning sound off', () => {
  it('gives the audio back rather than merely going quiet', () => {
    let closed = 0;
    class Ctx {
      currentTime = 0;
      destination = {};
      resume = () => Promise.resolve();
      createGain = () => ({
        connect: (n: unknown) => n,
        gain: { setValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined },
      });
      createOscillator = () => ({
        connect: (n: unknown) => n,
        frequency: { setValueAtTime: () => undefined },
        type: 'sine',
        start: () => undefined,
        stop: () => undefined,
      });
      close = () => {
        closed++;
        return Promise.resolve();
      };
    }
    vi.stubGlobal('window', { AudioContext: Ctx });

    claim(voice, 'cache');
    silence();
    // A page that keeps a context after the player said no is a page still
    // spending battery on a feature they declined.
    expect(closed).toBe(1);
  });
});
