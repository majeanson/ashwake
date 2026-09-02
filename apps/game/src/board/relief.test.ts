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

  it('does not let the jitter or the terrain outrank what height means', () => {
    /*
     * The jitter exists to stop a field being a plateau, and the contour band
     * exists so the world's own slopes are visible. Neither may carry a common
     * tile past a magic one, or height stops meaning rarity — this file's whole
     * argument for spending the channel that way.
     *
     * Across every BAND since 2026-09-02, which is the case that made this a
     * real constraint rather than a restatement: the shipped world has five of
     * them, and a common tile on the highest against a magic one on the lowest
     * is the widest the comparison ever gets.
     */
    let commonHigh = 0;
    let magicLow = Infinity;
    for (let band = 0; band < 5; band++) {
      for (let q = -14; q <= 14; q++) {
        for (let r = -14; r <= 14; r++) {
          commonHigh = Math.max(commonHigh, liftOf(cell({ q, r, band, rarity: 'common' }), 0.5));
          magicLow = Math.min(magicLow, liftOf(cell({ q, r, band, rarity: 'magic' }), 0.5));
        }
      }
    }
    expect(commonHigh).toBeLessThan(magicLow);
  });

  it('stands the world’s own contours up, and stays flat where the world is', () => {
    /*
     * `CellView.band` is `elevationBandAt` — five bands of nine hexes under the
     * shipped tuning — and this file ignored it entirely until 2026-09-02, so a
     * body built around a real Z axis drew the one axis the world has as flat.
     *
     * Same hex, same jitter, same kind: only the band moves.
     */
    const at = (band: number) => liftOf(cell({ q: 3, r: -2, band }), 0.5);
    expect(at(1)).toBeGreaterThan(at(0));
    expect(at(4)).toBeGreaterThan(at(1));
    // And a flat world is still flat — `elevationBands: 0` reports band 0.
    expect(at(0)).toBe(liftOf(cell({ q: 3, r: -2, band: 0 }), 0.5));
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
