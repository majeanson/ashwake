import type { Colour } from '@content/tuning';
import type { CellView } from '@render/Renderer';

/**
 * How tall the ground stands (Stage 2b, 2026-08-28).
 *
 * Two numbers make a hex's top: the KIND's prism height, which has been here
 * since the board was first drawn, and the RELIEF — a lift that varies with
 * the ground itself, so a leaned camera has something to lean over. Relief
 * changes nothing a rule can read: `liftOf` never touches worth, legality,
 * ripeness or the pocket, and the golden sim cannot see it. It is a look.
 *
 * The dial is `relief`, in hex radii, and **zero is the flat board that
 * shipped** — the tuning dial `CLAUDE.md` asks every system to ship behind.
 *
 * Two reasons the lift is mostly the COLOUR's and only a little the cell's:
 *
 * 1. A height channel that repeats the colour channel is a second way to tell
 *    two grounds apart, which is worth having for anyone who cannot tell them
 *    apart by hue. Noise alone spends the geometry and says nothing.
 * 2. A field of one colour still needs to not be a plateau, so a small
 *    deterministic jitter per hex breaks the terrace without breaking the
 *    ladder. Deterministic, because the same world must look the same twice.
 *
 * The ladder itself — rivers low, embers high — is a placeholder with a shape,
 * not a decision. Stage 5 picks the numbers by looking, and they move into the
 * direction (`Theme`) when the rest of the materials do.
 */

/** How tall each kind of ground stands, in hex radii, before any relief. */
export const HEIGHT = {
  tile: 0.34,
  empty: 0.06,
  stone: 0.16,
  wall: 0.7,
  remembered: 0.04,
  beacon: 0.05,
} as const;

export type Kind = keyof typeof HEIGHT;

export const KINDS: readonly Kind[] = ['tile', 'empty', 'stone', 'wall', 'remembered', 'beacon'];

export function kindOf(cell: CellView): Kind | null {
  if (cell.beacon) return 'beacon';
  if (cell.remembered) return 'remembered';
  switch (cell.kind) {
    case 'tile':
      return 'tile';
    case 'landmark':
      return 'empty';
    case 'empty':
      return 'empty';
    case 'stone':
      return 'stone';
    case 'wall':
      return 'wall';
  }
}

/**
 * The colour ladder, 0..1. Water sits low and what burns sits high; the two
 * grounds in the middle are a slope rather than a step, so no two colours
 * share a height.
 */
const LADDER: Readonly<Record<Colour, number>> = {
  blue: 0,
  green: 0.34,
  yellow: 0.67,
  red: 1,
};

/** Walls are the high ground whatever colour is beside them; stone is spent. */
const KIND_LADDER: Readonly<Record<Kind, number>> = {
  tile: 0.5,
  empty: 0.15,
  stone: 0.3,
  wall: 1.15,
  remembered: 0.1,
  beacon: 0,
};

/** How much of the lift the per-hex jitter may be worth. */
const JITTER = 0.3;

/**
 * A hex's own jitter, in 0..1 — a hash of its coordinates, so it is the same
 * on every device, every frame and every reload. `Math.random` would make a
 * board that shimmers when nothing happened.
 */
export function jitterAt(q: number, r: number): number {
  let h = (q | 0) * 374761393 + (r | 0) * 668265263;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Where a cell's FLOOR sits, in hex radii. Zero relief is a flat board. */
export function liftOf(cell: CellView, relief: number): number {
  if (relief <= 0) return 0;
  const kind = kindOf(cell);
  if (kind === null) return 0;
  // A beacon is a glow through ground that does not exist yet. There is
  // nothing under it to raise, so it stays on the floor at every relief.
  if (kind === 'beacon') return 0;
  const colour = cell.kind === 'tile' ? cell.colour : cell.native;
  const ground = colour === null ? KIND_LADDER[kind] : LADDER[colour];
  const jitter = (jitterAt(cell.q, cell.r) - 0.5) * JITTER;
  return Math.max(0, relief * (ground + jitter));
}

/** Where a cell's TOP sits — what a ring, a label and a leap stand on. */
export function topOf(cell: CellView, relief: number): number {
  const kind = kindOf(cell);
  if (kind === null) return 0;
  return liftOf(cell, relief) + HEIGHT[kind];
}

/** The tallest top on the board — the headroom a leaned camera must keep. */
export function tallestOf(cells: readonly CellView[], relief: number): number {
  let tallest = 0;
  for (const cell of cells) {
    const top = topOf(cell, relief);
    if (top > tallest) tallest = top;
  }
  return tallest;
}
