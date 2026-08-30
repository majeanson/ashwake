import type { HexKey } from '@engine/hex';
import { place, type Layout } from '@render/layout';
import type { CellView } from '@render/Renderer';
import { screenOf, type Lean } from './camera';
import { topOf } from './relief';

/**
 * The keyboard's marker on the board (2026-08-29).
 *
 * `INTERACTIONS.md` has carried the same gap since this body began, inherited
 * from Ashwake 1, which shipped without one and said so: *"a keyboard path for
 * placing a tile — `.board-host` is a focus sink, not a cursor."* Every panel,
 * card and control answers a key; the board itself answered none, so a desktop
 * player could read the whole game and not play it, and a screen reader could
 * reach every button around a board it could never enter.
 *
 * This file is the arithmetic of that marker and nothing else: where it starts,
 * where an arrow takes it, and where its ring is drawn. Pure, in the same
 * spirit as `camera.ts` — none of it needs a canvas to be wrong.
 *
 * **The step is SPATIAL, not axial**, and that is the one design decision here.
 * The obvious version adds a hex direction to `{q, r}`, and it is wrong three
 * ways at once: the board is sparse (the neighbour may be nothing at all), it
 * is turned (a yaw of 90 degrees makes "east" point down the screen), and
 * pointy-top hexes have no north neighbour to give the up arrow. So an arrow
 * asks a screen-space question — *what is the nearest cell that way?* —
 * answered through the very mapping the fit and the drag already use. A turned
 * board still moves the marker the way the arrow points, and a gap in the
 * ground is stepped over rather than into.
 */

export type Direction = 'up' | 'down' | 'left' | 'right';

/** Which way each arrow points on screen. `sy` grows DOWNWARD, as `screenOf`
 *  hands it back. */
const AXIS: Readonly<Record<Direction, { readonly x: number; readonly y: number }>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Where the marker is, and the line it is trying to hold.
 *
 * `ax`/`ay` are a text editor's GOAL COLUMN, in both axes and in screen units.
 * A pointy-top hex has no neighbour straight up — it has two, sixty degrees
 * either side — so an up arrow that simply took the nearest of them would walk
 * a diagonal, and ten presses would leave the marker five hexes off the column
 * it started in. Holding the column instead makes the two alternate, and the
 * marker climbs straight up a board that has no straight-up move in it.
 *
 * The anchor is re-taken along the axis of travel, kept across it, and
 * re-derived whenever the board's angle changes — it is a screen coordinate,
 * and the lean is what screen coordinates mean.
 */
export type Cursor = {
  readonly key: HexKey;
  readonly ax: number;
  readonly ay: number;
};

/**
 * How far off the line of travel a candidate may sit and still count, as a
 * multiple of how far along it is. Wide (about 72 degrees), because a leaned
 * camera squashes the screen vertically and a tighter cone would put every
 * up-and-over neighbour outside it on a board tilted past about 50 degrees —
 * which is the angle at which the up arrow would quietly stop working. The
 * scoring below, not the cone, is what actually picks.
 */
const CONE = 3;

/** What being off the line costs, against a unit of travel along it. Three, so
 *  the neighbour dead ahead beats a nearer one off to the side. */
const OFF_AXIS = 3;

/** Floating-point slack, for "the same score" and "no distance at all". */
const EPSILON = 1e-6;

/**
 * Which cells the marker may stand on.
 *
 * Everything the board draws except a beacon, which is a promise about ground
 * that does not exist yet and can never be acted on — `HexField` refuses it a
 * raycast for the same reason. Remembered fog IS walked, because a tap on it
 * is how the colour lens is let go of, and a keyboard that could not reach the
 * fog would be missing a gesture the finger has.
 */
const reachable = (cell: CellView): boolean => !cell.beacon;

export const cellAt = (cells: readonly CellView[], key: HexKey): CellView | null =>
  cells.find((c) => c.key === key) ?? null;

const screenAt = (
  cell: CellView,
  layout: Layout,
  lean: Lean,
): { readonly sx: number; readonly sy: number } => {
  const p = place({ q: cell.q, r: cell.r }, layout);
  return screenOf(p.x, p.y, 0, lean);
};

/**
 * Where the marker appears the first time somebody presses a key.
 *
 * Home if the board has one — the origin every distance is measured from, and
 * the one hex a player already knows the position of. Failing that the first
 * place a tile could legally go, and failing that anything at all.
 */
export function firstCursor(cells: readonly CellView[], layout: Layout, lean: Lean): Cursor | null {
  const pick =
    cells.find((c) => c.home && reachable(c)) ??
    cells.find((c) => c.legal) ??
    cells.find(reachable) ??
    null;
  if (pick === null) return null;
  const s = screenAt(pick, layout, lean);
  return { key: pick.key, ax: s.sx, ay: s.sy };
}

/** The anchor, re-derived from where the marker actually is. Called when the
 *  board's angle changes, because the anchor is a screen coordinate. Null when
 *  the marker is pointing at ground the board no longer has. */
export function reanchor(
  cells: readonly CellView[],
  cursor: Cursor,
  layout: Layout,
  lean: Lean,
): Cursor | null {
  const cell = cellAt(cells, cursor.key);
  if (cell === null) return null;
  const s = screenAt(cell, layout, lean);
  return { key: cursor.key, ax: s.sx, ay: s.sy };
}

/**
 * One arrow press: the nearest cell that way, or nothing where the board ends.
 *
 * Nothing rather than a wrap-around, deliberately — a marker that reappears on
 * the far side of the board has moved somewhere nobody was looking, and the
 * edge of the ground is a fact worth being able to feel.
 */
export function stepCursor(
  cells: readonly CellView[],
  from: Cursor,
  dir: Direction,
  layout: Layout,
  lean: Lean,
): Cursor | null {
  const here = cellAt(cells, from.key);
  if (here === null) return firstCursor(cells, layout, lean);

  const axis = AXIS[dir];
  const vertical = axis.x === 0;
  const origin = screenAt(here, layout, lean);
  // The line being held: the goal column for a vertical move, the goal row for
  // a horizontal one.
  const hold = vertical ? from.ax : from.ay;

  let best: { cell: CellView; score: number; tie: number } | null = null;
  for (const cell of cells) {
    if (cell.key === from.key || !reachable(cell)) continue;
    const s = screenAt(cell, layout, lean);
    const along = (s.sx - origin.sx) * axis.x + (s.sy - origin.sy) * axis.y;
    if (along <= EPSILON) continue;
    const off = Math.abs((vertical ? s.sx : s.sy) - hold);
    if (off > along * CONE) continue;
    const score = along + off * OFF_AXIS;
    // Ties are real: pointy-top hexes offer two equally good ways up. Broken
    // by position rather than by board order, so the same press on the same
    // board always lands on the same hex.
    const tie = vertical ? s.sx : s.sy;
    const better =
      best === null ||
      score < best.score - EPSILON ||
      (score < best.score + EPSILON && tie < best.tie);
    if (better) best = { cell, score, tie };
  }
  if (best === null) return null;

  const s = screenAt(best.cell, layout, lean);
  return vertical
    ? { key: best.cell.key, ax: from.ax, ay: s.sy }
    : { key: best.cell.key, ax: s.sx, ay: from.ay };
}

/** How high above its ground the marker's ring floats. Twice a stroke ring's
 *  lift: the marker sits outside the hex it names and must clear both the
 *  ground and whatever ring is already on it. */
const MARKER_LIFT = 0.024;

/** Where the marker's ring is drawn, in world units. Null when the marker is
 *  pointing at ground the board no longer has. */
export function markerAt(
  cells: readonly CellView[],
  key: HexKey,
  layout: Layout,
  relief: number,
): { readonly x: number; readonly z: number; readonly top: number } | null {
  const cell = cellAt(cells, key);
  if (cell === null) return null;
  const p = place({ q: cell.q, r: cell.r }, layout);
  return { x: p.x, z: p.y, top: topOf(cell, relief) + MARKER_LIFT };
}
