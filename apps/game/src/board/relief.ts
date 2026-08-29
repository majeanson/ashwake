import type { Rarity } from '@engine/state';
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
 * Two reasons the lift is what it is:
 *
 * 1. Height is a CHANNEL, and it is spent on the thing that has fewest — see
 *    RARITY_LIFT below. Noise alone spends the geometry and says nothing.
 * 2. A field still needs to not be a plateau, so a small deterministic jitter
 *    per hex breaks the terrace without competing with what height means.
 *    Deterministic, because the same world must look the same twice.
 *
 * The numbers are Marc's, by looking, and they move into the direction
 * (`Theme`) when the rest of the materials do.
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
 * **Rarity is what height says** (Marc, 2026-08-29).
 *
 * The first version lifted a hex by its terrain COLOUR, on the argument that a
 * height channel repeating the colour channel helps anyone who cannot tell two
 * grounds apart by hue. That argument was right about height and wrong about
 * which channel needed it: colour already has two — its hue, and a greyscale
 * ladder `theme.test.ts` enforces at 0.05 L* between neighbouring terrains, so
 * the four grounds are separable in black and white before height says a word.
 *
 * Rarity has ONE. A magic or unique tile is a star above the number and a
 * coloured ring, and both are small marks on a small hex. Standing a rare tile
 * up is a third channel where there was one, it is visible at any zoom, it
 * survives a screenshot at arm's length, and it reads as what it means: the
 * powerful thing is the tall thing.
 *
 * The lift is large on purpose — a unique stands about four times a common
 * tile's height — because a difference a player has to look for is a difference
 * that is not doing its job.
 */
const RARITY_LIFT: Readonly<Record<Rarity, number>> = {
  common: 0,
  magic: 0.55,
  unique: 1,
};

/** Walls are the high ground whatever stands beside them; stone is spent. */
const KIND_LADDER: Readonly<Record<Kind, number>> = {
  tile: 0.35,
  empty: 0.1,
  stone: 0.2,
  wall: 0.9,
  remembered: 0.05,
  beacon: 0,
};

/** How much of the lift the per-hex jitter may be worth. Small: it is there to
 *  stop a field being a plateau, not to compete with what height MEANS. */
const JITTER = 0.16;

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
  const ground = KIND_LADDER[kind] + (RARITY_LIFT[cell.rarity ?? 'common'] ?? 0);
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
