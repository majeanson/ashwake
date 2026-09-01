import { describe, expect, it } from 'vitest';
import type { CellView } from '@render/Renderer';
import { resolveTheme } from '@theme/index';
import { ringOf } from './rings';

/**
 * The stroke ladder (2026-09-01).
 *
 * `rings.ts` has been a pure function since it was lifted out of `HexField` and
 * had no test of its own — which mattered the moment a rung was added to it.
 * The ladder is a PRIORITY, not a set: a cell wears at most one edge, a live
 * state always outranks a quiet one, and adding a rung must not take an edge
 * away from anything that already had one.
 *
 * That last sentence is what this file exists for. A spent destination gained a
 * ring here (Marc: *"symbols used on used shrines, sites, caches, etc. [should
 * be] the same as when they are highlighted and active, just grey and look
 * deactivated instead"*), and the cheap way to write it — flipping the existing
 * `!cell.claimed` to cover both — would have moved the claimed case ABOVE the
 * lens's own accent, so a claimed territory of the lit colour would have
 * stopped answering the lens. It goes in at the bottom instead, and these are
 * the assertions that say so.
 */

const THEME = resolveTheme('torchlit');

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

const landmark = (over: Partial<CellView> = {}): CellView =>
  cell({ kind: 'landmark', colour: null, landmark: 'cache', ...over });

describe('a destination, live and spent', () => {
  it('rings a live one in the direction lit ink', () => {
    expect(ringOf(landmark(), THEME)?.colour).toBe(THEME.ink.lit);
  });

  /**
   * It used to draw NOTHING. The branch read `!cell.claimed`, so reaching a
   * cache did not dim its outline, it deleted it — and the ring is what says
   * "this hex is a place" from across a board.
   */
  it('still rings a spent one, in the spent voice', () => {
    const spent = ringOf(landmark({ claimed: true }), THEME);
    const live = ringOf(landmark(), THEME);
    expect(spent, 'a claimed destination stopped being a place').not.toBeNull();
    // The same voice the claimed prop and the claimed glyph already speak.
    expect(spent?.colour).toBe(THEME.ink.inkDim);
    expect(spent?.colour).not.toBe(live?.colour);
    // The WIDTH is deliberately not asserted: this renderer draws one width for
    // every ring and never reads the field. See the note in `rings.ts` — the
    // value is kept because it is what the ladder means, and asserting a
    // difference no pixel honours is how a test comes to describe a board that
    // does not exist.
  });
});

describe('the ladder, in the order it is climbed', () => {
  it('lets every live state outrank a spent destination', () => {
    // Each of these is a thing happening NOW on a hex that also happens to
    // hold a claimed landmark. None of them may lose its edge to the new rung.
    const spent = { claimed: true } as const;
    expect(ringOf(landmark({ ...spent, targeted: true }), THEME)?.colour).toBe(THEME.ink.accent);
    expect(ringOf(landmark({ ...spent, ripe: true }), THEME)?.colour).toBe(THEME.board.ripeEdge);
    // The lens's positive half: a claimed territory of the lit colour is
    // exactly the cell the cheap version of this change would have broken.
    expect(ringOf(landmark({ ...spent, lensed: true }), THEME)?.colour).toBe(THEME.ink.accent);
  });

  it('leaves every other cell exactly the edge it had', () => {
    expect(ringOf(cell(), THEME)).toBeNull();
    expect(ringOf(cell({ kind: 'stone' }), THEME)).toBeNull();
    expect(ringOf(cell({ kind: 'wall' }), THEME)).toBeNull();
    expect(ringOf(cell({ legal: true, kind: 'empty', colour: null }), THEME)?.colour).toBe(
      THEME.board.legalEdge,
    );
    expect(ringOf(cell({ rarity: 'unique' }), THEME)?.colour).toBe(THEME.ink.unique);
    expect(ringOf(cell({ home: true }), THEME)?.colour).toBe(THEME.board.home.ring);
  });
});
