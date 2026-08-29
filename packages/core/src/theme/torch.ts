import { BAND_LIFT, mix, type Rgb, type Theme } from './tokens';

/**
 * The torch, as arithmetic (Stage 2c, 2026-08-29).
 *
 * Ashwake 1 computed this inside `PixiRenderer` and handed the answer to a
 * sprite tint. That was fine while one renderer existed; it is not fine now,
 * because `theme.light.floor` (torchlit 0.42) and `MIN_LIT_FIELD_LIFT` were
 * TUNED AGAINST THIS EXACT OPERATOR, and a second renderer that tints a
 * different way silently invalidates both numbers. So the composition lives
 * here, in the layer that owns the palette, where the board and the budget test
 * read the same function.
 *
 * **It is a multiply in display space, not in linear light**, which is what
 * Pixi's `tint` did. A linear multiply by 0.42 is roughly a display multiply by
 * 0.70 — a materially brighter board than the one the field-lift thresholds
 * were graded against. The distinction is invisible in a screenshot and fatal
 * to a test.
 *
 * The torch is applied to the ALBEDO, before any light touches it. That is what
 * keeps it from being double-counted by the rig: the rig has no
 * position-dependent term, the torch has no angle-dependent one, and all
 * spatial falloff on the board comes from `cell.light` and only from there.
 */

/** What the renderer knows about one cell's light, and nothing else. */
export type CellLight = {
  /** The view's own resolved torch, 0..1. */
  readonly light: number;
  /** Which contour band this ground sits in; 0 where the world is flat. */
  readonly band: number;
  /** Ground remembered from an earlier run — drawn through the fog. */
  readonly remembered: boolean;
  /** Stepped back by the colour lens. */
  readonly dimmed: boolean;
};

/**
 * How far a lens-dimmed cell steps back. Ashwake 1 spent alpha here (0.25 on a
 * sprite); a 3D board cannot, because alpha on a prism shows the prism behind
 * it, so the step-back is taken out of the tint instead.
 */
export const DIMMED_STEP = 0.45;

/**
 * The tint one cell wears: the board's own background lifted toward white by
 * how lit the cell is, with the contour band adding a touch on top.
 *
 * `mix` toward white rather than a plain scale, because the background is what
 * an unlit hex must fade INTO — dropping toward black would show the page
 * through the board and turn distance into holes.
 */
export function cellTint(theme: Theme, cell: CellLight): Rgb {
  const lit = Math.min(1, cell.light * (1 + cell.band * BAND_LIFT));
  let tint = mix(theme.board.background, 0xffffff, lit);
  if (cell.remembered) tint = mix(tint, theme.board.background, theme.fog.veil);
  if (cell.dimmed) tint = mix(tint, theme.board.background, 1 - DIMMED_STEP);
  return tint;
}

/** The tint applied: a per-channel multiply in display space. */
export function torched(base: Rgb, tint: Rgb): Rgb {
  const channel = (shift: number): number => {
    const b = (base >> shift) & 0xff;
    const t = (tint >> shift) & 0xff;
    return Math.round((b * t) / 255) & 0xff;
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}
