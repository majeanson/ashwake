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

type Ring = {
  readonly colour: number;
  readonly width: number;
  /** The pocket POP will take: its ring flashes (`targetPulse`, 2026-09-24). */
  readonly pulse?: true;
};

type PlacedRing = Ring & {
  readonly x: number;
  readonly z: number;
  /** The top the ring floats a hair above. */
  readonly top: number;
};

/** How far above the ground a ring floats, so it never z-fights the top face. */
const RING_LIFT = 0.012;

/**
 * A LOOK FINDING, STATED WHERE THE RULE IS (2026-09-16, `NEXT.md` §1a).
 *
 * `targeted` is the pocket POP will take — `view.ts`'s `targetCluster`, the
 * tapped ripe tile's pocket or the biggest — and it IS drawn: the accent ring
 * below, at the ripe edge's width. Marc, looking at his phone, asked for it
 * anyway: *"we should know with a highlight which pop will pop."* So the ring
 * is not missing; it is not loud enough to be read as an answer, at the width
 * a ripe edge has and in an ink the action bar already wears. What it should
 * be instead — wider, a fill, a breath of its own — is a screen and an eye,
 * not a derivation, and this comment is the finding rather than a guess at it.
 *
 * **Answered 2026-09-24**, on the phone sheet: _"it was hard to know between
 * two pops, make sure the selected one flashes or something."_ So the ring
 * keeps its ink and width and FLASHES (every 2 s since the same night: _"flash
 * slower"_, then _"go 2000"_) — `pulse` below, `targetPulse` for the
 * wave, `HexField` for the clock.
 */
export function ringOf(cell: CellView, theme: Theme): Ring | null {
  const b = theme.board;
  if (cell.targeted) return { colour: theme.ink.accent, width: b.ripeEdgeWidth, pulse: true };
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

/**
 * AND A NOTE ON `previewColour`, which this file deliberately does not read
 * (tried and reverted 2026-09-02).
 *
 * The field is real and Ashwake 1 read it: a legal hex was stroked in the
 * colour of the card you were holding, because *"the ghost used to draw as one
 * fixed tint regardless of what you were actually holding."* The 2026-09-02
 * audit found it unread here, wired it into the legal branch above, and Marc
 * caught the result on a phone within the hour: **"the first tile I put seems
 * to refresh the whole map display."**
 *
 * He was describing exactly what it does. After a placement the hand redraws
 * and the auto-selected card is usually a different colour, so EVERY legal
 * edge on the board — a dozen of them, more later — changes colour in one
 * frame. The most frequent action in the game became the loudest visual event
 * on the screen, and it is not an event at all.
 *
 * **The reason it worked there and not here is weight, not colour.** Ashwake
 * 1 drew a hairline stroke at `alpha: 0.75` over a flat board: a tint on a
 * thin line. `HexField` draws a `0.16`-radius ring band at full opacity, which
 * is an order of magnitude more ink. The colour source was ported and the
 * weight was not, so four grounds authored to be FILLS became four outlines,
 * none of them tuned for the job — `legalEdge` is one authored colour
 * precisely so it can be balanced once against every terrain, and daylight's
 * tan reads as nearly invisible on cream while its red outshouts the ripe
 * edge, which is meant to be the loudest thing on the board.
 *
 * So the ring keeps `legalEdge`. If the held colour is ever worth showing on
 * this board it belongs to the preview FILL or a ghost, not to the outline,
 * and picking which is a look decision — it belongs to Marc on a phone, like
 * the width above, and not to a second guess in the same session as the first.
 */
