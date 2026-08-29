import { describe, expect, it } from 'vitest';
import type { CellView } from '@render/Renderer';
import { HEIGHT, jitterAt, kindOf, liftOf, tallestOf, topOf } from './relief';

/**
 * Relief is a look, and this file's job is to hold it to that: the same board
 * lifts the same way twice, the ladder is a ladder, and zero is the flat board
 * Stage 2 shipped.
 */

function cell(over: Partial<CellView> = {}): CellView {
  return {
    key: '0,0',
    q: 0,
    r: 0,
    kind: 'tile',
    colour: 'green',
    landmark: null,
    claimed: false,
    beacon: false,
    remembered: false,
    shimmer: false,
    rarity: null,
    native: null,
    ripe: false,
    dimmed: false,
    lensed: false,
    targeted: false,
    worth: 0,
    home: false,
    light: 1,
    band: 0,
    legal: false,
    preview: null,
    previewColour: null,
    ...over,
  };
}

describe('relief', () => {
  it('is off at zero — every floor is the ground and every top is its prism', () => {
    for (const kind of ['tile', 'empty', 'stone', 'wall'] as const) {
      const c = cell({ kind, q: 4, r: -2, colour: kind === 'tile' ? 'red' : null });
      expect(liftOf(c, 0)).toBe(0);
      expect(topOf(c, 0)).toBe(HEIGHT[kindOf(c)!]);
    }
  });

  it('lifts the same hex the same way every time', () => {
    const c = cell({ q: 7, r: -3, colour: 'yellow' });
    expect(liftOf(c, 0.4)).toBe(liftOf(c, 0.4));
    // And the jitter is a hash, not a die: bounded, and its own for each hex.
    for (const [q, r] of [
      [0, 0],
      [1, 0],
      [-5, 12],
      [30, -30],
    ] as const) {
      const j = jitterAt(q, r);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(1);
    }
    expect(jitterAt(1, 0)).not.toBe(jitterAt(0, 1));
  });

  it('stands a rare tile up — height is what rarity says', () => {
    // The powerful thing is the tall thing. Rarity had one channel (a star and
    // a ring, both small marks on a small hex); colour already had two, its hue
    // and a greyscale ladder a test enforces. So height is spent here.
    const at = (rarity: 'common' | 'magic' | 'unique'): number =>
      liftOf(cell({ q: 2, r: 5, rarity }), 0.5);
    expect(at('common')).toBeLessThan(at('magic'));
    expect(at('magic')).toBeLessThan(at('unique'));
    // Visible at a glance rather than on inspection: a unique stands several
    // times a common tile's lift, not a few percent over it.
    expect(at('unique')).toBeGreaterThan(at('common') * 3);
  });

  it('never digs a hole, however the jitter falls', () => {
    for (let q = -12; q <= 12; q++) {
      for (let r = -12; r <= 12; r++) {
        expect(liftOf(cell({ q, r, kind: 'empty', colour: null }), 0.6)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('does not let the jitter outrank what height means', () => {
    // The jitter exists to stop a field being a plateau. If it could carry a
    // common tile past a magic one, height would stop meaning rarity.
    let commonHigh = 0;
    let magicLow = Infinity;
    for (let q = -14; q <= 14; q++) {
      for (let r = -14; r <= 14; r++) {
        commonHigh = Math.max(commonHigh, liftOf(cell({ q, r, rarity: 'common' }), 0.5));
        magicLow = Math.min(magicLow, liftOf(cell({ q, r, rarity: 'magic' }), 0.5));
      }
    }
    expect(commonHigh).toBeLessThan(magicLow);
  });

  it('tells the camera how much sky the board needs', () => {
    const cells = [
      cell({ q: 0, r: 0, colour: 'blue' }),
      cell({ q: 1, r: 0, kind: 'wall', colour: null }),
      cell({ q: 0, r: 1, colour: 'red' }),
    ];
    expect(tallestOf(cells, 0)).toBe(HEIGHT.wall);
    expect(tallestOf(cells, 0.5)).toBeGreaterThan(HEIGHT.wall);
    expect(tallestOf([], 0.5)).toBe(0);
  });

  it('leaves a beacon on the floor — it is a glow, not ground', () => {
    expect(liftOf(cell({ beacon: true, colour: null, kind: 'empty', q: 9, r: 9 }), 0.5)).toBe(0);
  });
});
