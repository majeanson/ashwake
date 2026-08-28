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

  it('is a ladder: water sits below moss sits below ash sits below embers', () => {
    // Same hex, so the jitter is the same and only the colour moves.
    const at = (colour: 'blue' | 'green' | 'yellow' | 'red'): number =>
      liftOf(cell({ q: 2, r: 5, colour }), 0.5);
    expect(at('blue')).toBeLessThan(at('green'));
    expect(at('green')).toBeLessThan(at('yellow'));
    expect(at('yellow')).toBeLessThan(at('red'));
  });

  it('never digs a hole, however the jitter falls', () => {
    for (let q = -12; q <= 12; q++) {
      for (let r = -12; r <= 12; r++) {
        expect(liftOf(cell({ q, r, kind: 'empty', colour: null }), 0.6)).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('reads a native field as the ground it is native to', () => {
    const plain = cell({ kind: 'empty', colour: null, native: null, q: 3, r: 3 });
    const tidal = cell({ kind: 'empty', colour: null, native: 'blue', q: 3, r: 3 });
    const ember = cell({ kind: 'empty', colour: null, native: 'red', q: 3, r: 3 });
    expect(liftOf(tidal, 0.5)).toBeLessThan(liftOf(ember, 0.5));
    expect(liftOf(plain, 0.5)).not.toBe(liftOf(ember, 0.5));
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
