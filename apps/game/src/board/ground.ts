import type { CellView } from '@render/Renderer';
import { place, type Layout } from '@render/layout';
import type { Theme } from '@theme/tokens';
import { HEIGHT, KINDS, kindOf, liftOf, type Kind } from './relief';

/**
 * What ground is on the board, and where (Stage 2c, 2026-08-29).
 *
 * Pure: it turns a `BoardView` into batches of positioned instances and says
 * what colour each one is, and it never touches three or a GPU buffer. The
 * field component writes those batches into instance matrices; this file is
 * what a test can read.
 */

/** The seam between hexes, as a shrink of the prism's radius. */
export const SEAM = 0.06;

/** The radius a prism is actually built at, once the seam is taken out. */
export const HEX_RADIUS = 1 - SEAM;

export type GroundItem = {
  readonly cell: CellView;
  /** Board coordinates, in hex radii. */
  readonly x: number;
  readonly z: number;
  /** How far the relief lifts this cell's floor. */
  readonly lift: number;
};

export type GroundBatches = ReadonlyMap<Kind, readonly GroundItem[]>;

/** Every drawn cell, bucketed by the prism it stands as. */
export function groundBatches(
  cells: readonly CellView[],
  layout: Layout,
  relief: number,
): GroundBatches {
  const out = new Map<Kind, GroundItem[]>();
  for (const kind of KINDS) out.set(kind, []);
  for (const cell of cells) {
    const kind = kindOf(cell);
    if (kind === null) continue;
    const p = place({ q: cell.q, r: cell.r }, layout);
    out.get(kind)!.push({ cell, x: p.x, z: p.y, lift: liftOf(cell, relief) });
  }
  return out;
}

/**
 * How tall this instance stands and where its middle sits.
 *
 * Relief makes the ground THICKER, not floating: a lifted hex is a column
 * standing on the same floor as its neighbours, so the board reads as terrain
 * with depth rather than as tiles hovering over a hole. The prism is stretched,
 * never moved off the ground — which is why this returns a scale as well as a
 * height.
 */
export function standOf(item: GroundItem, kind: Kind): { height: number; scaleY: number } {
  const base = HEIGHT[kind];
  const height = base + item.lift;
  return { height, scaleY: height / base };
}

/** A cell's base colour under the direction, before the torch. */
export function fillOf(cell: CellView, theme: Theme): number {
  if (cell.kind === 'tile' && cell.colour !== null) return theme.terrain[cell.colour].fill;
  if (cell.kind === 'wall') return theme.wall.fill;
  if (cell.kind === 'stone') return theme.stone.fill;
  if (cell.native !== null) return theme.terrain[cell.native].fill;
  return theme.empty.fill;
}

/**
 * How lit this instance is, 0..1 — the view's own number, except for beacons,
 * which are not ground and carry the direction's own fade instead.
 */
export const lightOf = (cell: CellView, kind: Kind, theme: Theme): number =>
  kind === 'beacon' ? 1 - theme.board.beaconFade : cell.light;

/**
 * Round up to a capacity, so the instanced meshes are not rebuilt per
 * placement — a new mesh is a new buffer, and a board grows one hex at a time.
 */
export const capacityFor = (n: number): number => Math.max(64, 1 << Math.ceil(Math.log2(n + 1)));
