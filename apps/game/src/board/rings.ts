import type { CellView } from '@render/Renderer';
import { place, type Layout } from '@render/layout';
import type { Theme } from '@theme/tokens';
import { kindOf, topOf } from './relief';

/**
 * The stroke ladder (Stage 2c, 2026-08-29 — lifted out of `HexField`).
 *
 * A cell wears at most one edge, and which one is a priority, not a set: a live
 * state always wins the edge and home is asked last, so a home cell that ripens
 * wears the ripe edge and gets its own ring back afterwards. The order is
 * Ashwake 1's `PixiRenderer#strokeFor`, unchanged.
 *
 * Pure — it says which ring a cell wears and where the ring sits. Drawing it is
 * the field's job.
 */

export type Ring = {
  readonly colour: number;
  readonly width: number;
};

export type PlacedRing = Ring & {
  readonly x: number;
  readonly z: number;
  /** The top the ring floats a hair above. */
  readonly top: number;
};

/** How far above the ground a ring floats, so it never z-fights the top face. */
const RING_LIFT = 0.012;

export function ringOf(cell: CellView, theme: Theme): Ring | null {
  const b = theme.board;
  if (cell.targeted) return { colour: theme.ink.accent, width: b.ripeEdgeWidth };
  if (cell.ripe) return { colour: b.ripeEdge, width: b.ripeEdgeWidth };
  if (cell.kind === 'landmark' && !cell.claimed) {
    return { colour: theme.ink.lit, width: b.ripeEdgeWidth * 0.8 };
  }
  if (cell.rarity !== null && cell.kind === 'tile') {
    return {
      colour: cell.rarity === 'magic' ? theme.ink.magic : theme.ink.unique,
      width: b.edgeWidth * 2.5,
    };
  }
  if (cell.legal) return { colour: b.legalEdge, width: b.edgeWidth * 2.5 };
  if (cell.lensed) return { colour: theme.ink.accent, width: b.edgeWidth * 2 };
  if (cell.home) return { colour: b.home.ring, width: b.home.ringWidth };
  return null;
}

/** Every ring the board wears right now, positioned on the ground it marks. */
export function ringsOf(
  cells: readonly CellView[],
  theme: Theme,
  layout: Layout,
  relief: number,
): readonly PlacedRing[] {
  const out: PlacedRing[] = [];
  for (const cell of cells) {
    const ring = ringOf(cell, theme);
    if (ring === null || kindOf(cell) === null) continue;
    const p = place({ q: cell.q, r: cell.r }, layout);
    out.push({ ...ring, x: p.x, z: p.y, top: topOf(cell, relief) + RING_LIFT });
  }
  return out;
}
