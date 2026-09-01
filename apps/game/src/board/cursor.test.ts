import { describe, expect, it } from 'vitest';
import { disc, keyOf } from '@engine/hex';
import type { CellView } from '@render/Renderer';
import { FLAT, type Lean } from './camera';
import { firstCursor, markerAt, refreshed, stepCursor, type Cursor } from './cursor';
import { HEIGHT } from './relief';

/**
 * The keyboard's marker, without a canvas.
 *
 * Three promises, and every bug this file can have is one of them broken: an
 * arrow moves the marker the way it points ON SCREEN whatever angle the board
 * is held at, a run of arrows in one direction holds its line, and the marker
 * never leaves the ground the board actually has.
 */

const UNIT = { size: 1, originX: 0, originY: 0, orientation: 'pointy' } as const;

function cell(q: number, r: number, over: Partial<CellView> = {}): CellView {
  return {
    key: keyOf({ q, r }),
    q,
    r,
    kind: 'empty',
    colour: null,
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

/** A board of `radius` rings, with home at the origin. */
const board = (radius: number): CellView[] =>
  disc(radius).map((h) => cell(h.q, h.r, h.q === 0 && h.r === 0 ? { home: true } : {}));

const at = (cells: readonly CellView[], lean: Lean = FLAT): Cursor => {
  const start = firstCursor(cells, UNIT, lean);
  expect(start).not.toBeNull();
  return start!;
};

const step = (
  cells: readonly CellView[],
  from: Cursor,
  dir: Parameters<typeof stepCursor>[2],
  lean: Lean = FLAT,
): Cursor => {
  const next = stepCursor(cells, from, dir, UNIT, lean);
  expect(next, `nowhere to go ${dir}`).not.toBeNull();
  return next!;
};

describe('where the marker starts', () => {
  it('starts at home, which is the one hex a player already knows', () => {
    expect(at(board(2)).key).toBe('0,0');
  });

  it('falls back to somewhere a tile could go, then to anywhere at all', () => {
    const noHome = [cell(3, 0), cell(4, 0, { legal: true })];
    expect(firstCursor(noHome, UNIT, FLAT)?.key).toBe('4,0');
    expect(firstCursor([cell(9, 9)], UNIT, FLAT)?.key).toBe('9,9');
    expect(firstCursor([], UNIT, FLAT)).toBeNull();
  });

  /**
   * Amended 2026-09-01, when beacons became tappable: the marker WALKS to a
   * beacon now (a tap on one says what is out there), it simply never OPENS on
   * one — a first press should land somewhere that exists.
   */
  it('never opens on a beacon, but will walk to one', () => {
    const cells = [cell(0, 0, { beacon: true }), cell(1, 0)];
    expect(firstCursor(cells, UNIT, FLAT)?.key).toBe('1,0');
    expect(stepCursor(cells, at([cell(1, 0)]), 'left', UNIT, FLAT)?.key).toBe('0,0');
    // A board with nothing BUT beacons still answers a key rather than going
    // dead: the marker has to be somewhere.
    expect(firstCursor([cell(4, 0, { beacon: true })], UNIT, FLAT)?.key).toBe('4,0');
  });
});

describe('one arrow press', () => {
  it('goes to the neighbour that way on a flat board', () => {
    const cells = board(2);
    expect(step(cells, at(cells), 'right').key).toBe('1,0');
    expect(step(cells, at(cells), 'left').key).toBe('-1,0');
  });

  it('stops at the edge rather than reappearing on the far side', () => {
    // The board ends, and that is a fact worth being able to feel. A marker
    // that wrapped would have moved somewhere nobody was looking.
    const cells = board(1);
    const east = step(cells, at(cells), 'right');
    expect(stepCursor(cells, east, 'right', UNIT, FLAT)).toBeNull();
  });

  it('steps OVER a gap rather than into it', () => {
    // Axial arithmetic would have walked into the hole at 1,0 and found
    // nothing there. The question an arrow asks is spatial: what is the
    // nearest cell that way.
    const cells = [cell(0, 0, { home: true }), cell(2, 0)];
    expect(step(cells, at(cells), 'right').key).toBe('2,0');
  });
});

describe('a run of arrows', () => {
  it('climbs a straight column on a grid that has no straight-up move', () => {
    // A pointy-top hex has two ways up, sixty degrees either side. Taking the
    // nearest each time would walk a diagonal; holding the goal column makes
    // the two alternate, and the marker comes back to the column it left.
    const cells = board(3);
    const first = step(cells, at(cells), 'up');
    expect(first.key).toBe('0,-1');
    const second = step(cells, first, 'up');
    // Two rows up and back on the origin's own column.
    expect(second.key).toBe('1,-2');
  });

  it('takes a new column the moment the marker moves across one', () => {
    const cells = board(3);
    const east = step(cells, at(cells), 'right');
    const up = step(cells, east, 'up');
    // Climbing from 1,0 rather than drifting back over the origin's column.
    expect(up.key).toBe('1,-1');
  });
});

describe('a board that has been turned', () => {
  it('still moves the marker the way the arrow points', () => {
    // A quarter turn puts the board's own east at the top of the screen, so
    // "right" has to mean something else entirely — which is exactly why the
    // step is asked in screen space and not in q and r.
    const turned: Lean = { tilt: 0, yaw: 90, tallest: 0 };
    const cells = board(2);
    const right = step(cells, at(cells, turned), 'right', turned);
    // Screen-right under a 90-degree yaw is the board's own −z, and the two
    // neighbours that way are equally good; the marker takes one of them and
    // never the east cell, which is now straight up the screen.
    expect(['0,-1', '1,-1']).toContain(right.key);
    expect(step(cells, at(cells, turned), 'up', turned).key).toBe('-1,0');
  });

  it('re-measures its anchor when the angle moves, and lets go when the ground does', () => {
    const cells = board(2);
    // Off the origin on purpose: home sits at screen zero under every angle,
    // so it is the one hex whose anchor a re-measurement cannot be seen on.
    const flat = step(cells, at(cells), 'right');
    // Same angle, same anchor — and the very same object, because re-deriving
    // one that did not change is a re-render bought for nothing.
    expect(refreshed(cells, flat, UNIT, FLAT)).toBe(flat);

    const leaned: Lean = { tilt: 45, yaw: 30, tallest: 0 };
    const again = refreshed(cells, flat, UNIT, leaned);
    expect(again?.key).toBe(flat.key);
    expect(again?.tilt).toBe(45);
    expect(again?.ax).not.toBe(flat.ax);
    expect(again?.ay).not.toBe(flat.ay);

    // A run restarted under the marker: the ground it named is gone.
    expect(refreshed([cell(5, 5)], flat, UNIT, FLAT)).toBeNull();
  });
});

describe('the marker s ring', () => {
  it('sits over the top of the ground it names, and nowhere at all off the board', () => {
    const cells = [cell(0, 0, { kind: 'wall' })];
    const marker = markerAt(cells, '0,0', UNIT, 0);
    expect(marker?.x).toBeCloseTo(0, 6);
    expect(marker?.z).toBeCloseTo(0, 6);
    // Clear of the wall's own top, so it never z-fights the face it marks.
    expect(marker!.top).toBeGreaterThan(HEIGHT.wall);
    expect(markerAt(cells, '4,4', UNIT, 0)).toBeNull();
  });
});
