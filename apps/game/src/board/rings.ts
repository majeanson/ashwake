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
  /*
   * A LEGAL HEX WEARS THE COLOUR YOU ARE HOLDING (2026-09-02).
   *
   * `CellView.previewColour` — "the selected draft tile's own colour, mirrored
   * wherever `preview` is" — exists because Ashwake 1 found and fixed exactly
   * the bug this line had: *"the ghost used to draw as one fixed tint
   * regardless of what you were actually holding."* The field came across with
   * the core and **nothing in this body ever read it**, so the fix came with
   * it and the bug came back.
   *
   * It matters more here than it did there. Every legal edge in one ink asks a
   * player to hold the selected card's colour in their head while they read a
   * board of glowing outlines; wearing the ground it would become answers the
   * question the glow is asking. It is also the same channel the card, the
   * purse's steer row and the manual's legend already use, so nothing new is
   * being taught.
   *
   * `legalEdge` stays the fallback, and it is the honest one: with no card
   * selected there is no colour to promise, and a legal hex is then only
   * saying "something could go here".
   */
  if (cell.legal) {
    const held = cell.previewColour;
    return {
      colour: held === null ? b.legalEdge : theme.terrain[held].fill,
      width: b.edgeWidth * 2.5,
    };
  }
  if (cell.lensed) return { colour: theme.ink.accent, width: b.edgeWidth * 2 };
  /*
   * A SPENT destination keeps its outline, greyed (2026-09-01).
   *
   * It had none: the branch above reads `!cell.claimed`, so reaching a cache
   * did not dim its ring, it deleted it — and the ring is what says "this hex
   * is a PLACE" from across a board. Marc, on the whole class: *"symbols used
   * on used shrines, sites, caches, etc. [should be] the same as when they are
   * highlighted and active, just grey and look deactivated instead."*
   *
   * `inkDim` is the voice the claimed prop and the claimed glyph already use
   * (`Props.tsx`, `Labels.tsx`'s `inkFor`), so all four channels of a spent
   * destination now say one thing in one tone: still here, still what it was,
   * already spent. The width is authored thinner than a live one for the same
   * reason — a live destination is somewhere to GO and should win the glance —
   * though this renderer does not draw it yet; see the note at the bottom of
   * this file, and do not read the number as a promise about pixels.
   *
   * DOWN HERE rather than beside its unclaimed twin, and that placement is the
   * whole of "nothing that had a ring changes": every live state above it keeps
   * the edge it already won, including the lens's own accent on a claimed
   * territory of the lit colour. This only fills a hex that was drawing
   * nothing.
   */
  if (cell.kind === 'landmark' && cell.claimed) {
    return { colour: theme.ink.inkDim, width: b.ripeEdgeWidth * 0.55 };
  }
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

/**
 * A NOTE ON `width`, which this renderer does not draw (found 2026-09-01).
 *
 * `HexField` draws every ring from one shared `ringGeometry` with a hard-coded
 * `0.16` band, and never reads `Ring.width` at all — so a ripe pocket's heavy
 * outline, a legal hex's edge and home's deliberately quiet ring ("`ringWidth`
 * sits well under `ripeEdgeWidth`", says torchlit's own comment) all draw
 * identically. Every direction authors three widths and this ladder computes
 * six values out of them; none reaches the screen.
 *
 * **Left dead on purpose, for now.** Wiring it is easy — a ring's width IS its
 * geometry and an instanced mesh shares one, so it wants a mesh per width, the
 * shape `groundBatches` already uses. It was built, measured and backed out in
 * the same session, because honouring the authored numbers makes EVERY outline
 * on the board thinner than the one it draws today: the legal edge, which is
 * the most-used affordance the board has, loses 45% of its weight. The numbers
 * were tuned by eye against the 0.16 render, so honouring them is not a fix but
 * a re-tune of the whole board's line weight — and that is a look decision,
 * which belongs to Marc on a phone rather than to a session that cannot see it.
 *
 * The values stay because they are what the ladder MEANS, and the day the
 * channel is wired the intent is already written down. `NEXT.md` carries it.
 */
