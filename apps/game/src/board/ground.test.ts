import { describe, expect, it } from 'vitest';
import { DAYLIGHT } from '@theme/themes/daylight';
import { SETTLEMENT } from '@theme/themes/settlement';
import type { Theme } from '@theme/tokens';
import { gutterOf, hexRadiusOf, radiusScaleOf } from './ground';

/**
 * THE TWO GUTTERS, and the arithmetic between them (2026-09-08).
 *
 * `board.seam` and `Surface.inset` are the same quantity authored in two
 * places, and honouring the second one literally would silently undo the fix
 * the first one landed — Marc, on a phone, 2026-09-04: *"the contours are too
 * thick."* `gutterOf` reads the DIFFERENCE the authoring expresses rather than
 * its absolute value, and that choice is mine rather than the theme's, which
 * is exactly why it is pinned here: the next person to read
 * `empty: surface(..., { inset: 0.09 })` should find out from a failing test
 * that 0.09 is not the number on the board.
 */

const THEMES: readonly Theme[] = [SETTLEMENT, DAYLIGHT];

describe('the board-wide seam', () => {
  it('is what a built hex is drawn at, in every direction', () => {
    for (const theme of THEMES) {
      expect(hexRadiusOf(theme), theme.id).toBeCloseTo(1 - theme.board.seam, 10);
    }
  });
});

describe('a surface’s own gutter', () => {
  it('adds nothing to built ground — the tuned contour weight is untouched', () => {
    // The whole point of reading the difference: every terrain authors the
    // baseline, so honouring `inset` must not move a single built hex.
    for (const theme of THEMES) {
      for (const colour of ['green', 'yellow', 'red', 'blue'] as const) {
        expect(gutterOf(theme, theme.terrain[colour]), `${theme.id}/${colour}`).toBe(0);
        expect(radiusScaleOf(theme, theme.terrain[colour]), `${theme.id}/${colour}`).toBe(1);
      }
      expect(gutterOf(theme, theme.stone), `${theme.id}/stone`).toBe(0);
      expect(gutterOf(theme, theme.wall), `${theme.id}/wall`).toBe(0);
    }
  });

  it('loosens EMPTY ground by exactly what its direction authors over the baseline', () => {
    for (const theme of THEMES) {
      const extra = theme.empty.inset - theme.terrain.green.inset;
      expect(extra, `${theme.id} stopped authoring a looser empty`).toBeGreaterThan(0);
      expect(gutterOf(theme, theme.empty), theme.id).toBeCloseTo(extra, 10);
      // Drawn smaller than a built hex, never larger.
      expect(radiusScaleOf(theme, theme.empty), theme.id).toBeLessThan(1);
    }
  });

  it('never inverts, however a direction is re-authored', () => {
    // A surface authored TIGHTER than the baseline gets the baseline, not a
    // hex wider than the board's own seam — the grid has one outer edge.
    for (const theme of THEMES) {
      const tighter = { ...theme.empty, inset: 0 };
      expect(gutterOf(theme, tighter), theme.id).toBe(0);
      expect(radiusScaleOf(theme, tighter), theme.id).toBe(1);
    }
  });

  it('is a scale of the shared prism, so no batch needs its own geometry', () => {
    // `radiusScaleOf` is applied as an instance scale in `HexField`, so it must
    // be the RATIO to the shared radius rather than a radius of its own.
    for (const theme of THEMES) {
      const shared = hexRadiusOf(theme);
      const scale = radiusScaleOf(theme, theme.empty);
      expect(scale * shared, theme.id).toBeCloseTo(shared - gutterOf(theme, theme.empty), 10);
    }
  });
});
