import { distance, parse, type HexKey } from '@engine/hex';
import type { CellView } from '@render/Renderer';
import type { Motion } from '@theme/tokens';

/**
 * The leap, as arithmetic (Stage 2d, 2026-08-29).
 *
 * Marc: *"the pop must be glorious, arcade like — the colour pops up in the air
 * while the grey happens."* That sentence is a specification, and it is one
 * Ashwake 1 already met with four overlapping effects. The important half is the
 * one it is easiest to get wrong:
 *
 * **The board turns the popped cells to stone the instant the reducer runs.** So
 * the leap cannot be the board's own hexes rising — those are already grey. It
 * is a SEPARATE set of hexes, drawn from the cells as they were, in their own
 * colour, standing where they stood, on top of a board that has already moved
 * on. Ashwake 1 called that a `cover` and needed it because the grey arrived
 * first (Marc, 2026-08-20: *"tiles are not grey from the start — they go from
 * coloured to grey after the animation"*). Here it is the whole leap.
 *
 * Every curve below is Ashwake 1's, with one addition the third dimension pays
 * for: a leaping tile SHRINKS to nothing at the top of its arc instead of
 * fading. A prism that fades needs transparency, sorting and a shader; a prism
 * that shrinks needs a matrix, which is free, per-instance, and reads as
 * *flew up and was gone* rather than *dissolved*.
 */

/** How long one tile's own leap lasts, before its stagger. */
export const LEAP_MS = (motion: Motion): number => motion.popMs * 1.25;

/** How long the whole cascade lasts, stagger included. */
export const cascadeMs = (motion: Motion, tiles: number): number =>
  LEAP_MS(motion) + motion.popStaggerMs * Math.max(0, tiles - 1) + 60;

/**
 * When each cell leaves, in milliseconds after the pop.
 *
 * Ordered by hex distance from the pocket the player actually TAPPED, so the
 * ripple radiates from the point of contact rather than from object-key order.
 * That is the difference between a cascade and a flicker.
 */
export function cascadeDelays(
  cells: readonly CellView[],
  at: HexKey | null,
  motion: Motion,
): readonly number[] {
  const origin = at === null ? null : parse(at);
  const order = cells
    .map((cell, index) => ({
      index,
      away: origin === null ? 0 : distance(origin, { q: cell.q, r: cell.r }),
    }))
    .sort((a, b) => a.away - b.away || a.index - b.index);

  const delays = new Array<number>(cells.length).fill(0);
  order.forEach((entry, rank) => {
    delays[entry.index] = rank * motion.popStaggerMs;
  });
  return delays;
}

/**
 * How much higher a leap flies here than Ashwake 1's jump did.
 *
 * `motion.popLift` was tuned against a board seen flat on, where a vertical
 * hex-radius was a vertical hex-radius. A tilted camera spends most of that on
 * foreshortening — at 35 degrees a unit of height is 0.57 of a unit on screen,
 * and against a hex two units tall that is a nudge. The theme's number stays
 * the direction's opinion of how energetic a pop is; this is the conversion
 * from a flat board's units into a leaning one's.
 */
const ARCADE_LIFT = 3.2;

/** Turns a leaping tile makes on its way up. Under one, so it reads as a
 *  thing tumbling out of the board rather than a coin in a slot machine. */
const SPIN_TURNS = 0.42;

export type LeapPhase = {
  /** How far above its resting top the tile has risen, in hex radii. */
  readonly lift: number;
  /** Uniform scale; reaches zero when the tile is gone. */
  readonly scale: number;
  /** Radians turned about its own axis — the tumble. */
  readonly spin: number;
  readonly gone: boolean;
};

/**
 * One tile's leap at a moment.
 *
 * Up fast, over the top, and gone — a parabola for the rise so it lands back
 * where it began if anything interrupts it, a swell on the way up so it reads
 * as bursting rather than sliding, and a shrink over the last third so it
 * leaves rather than stops.
 */
export function leapPhase(motion: Motion, elapsed: number, delay: number): LeapPhase {
  const life = LEAP_MS(motion);
  const t = (elapsed - delay) / life;
  if (t <= 0) return { lift: 0, scale: 1, spin: 0, gone: false };
  if (t >= 1) return { lift: 0, scale: 0, spin: 0, gone: true };

  // Launch, not lob: fast off the board and slowing toward the top, which is
  // what makes it read as thrown. A symmetric parabola peaks halfway through
  // and spends half the animation coming back down, which reads as a bounce.
  const rise = 1 - (1 - t) ** 2;
  const lift = motion.popLift * ARCADE_LIFT * rise;
  const swell = 1 + 0.45 * Math.sin(Math.PI * t);
  // Nothing for two thirds, then away — the tile is fully itself for most of
  // its flight and disappears at the end, which is what makes it read as a
  // thing leaving rather than a thing dimming.
  const shrink = t < 0.66 ? 1 : 1 - (t - 0.66) / 0.34;
  return { lift, scale: swell * shrink, spin: SPIN_TURNS * Math.PI * 2 * t, gone: false };
}

export type GlowPhase = {
  readonly scale: number;
  /** 0..1, applied to an ADDITIVE material, where dark is the same as gone. */
  readonly strength: number;
  readonly gone: boolean;
};

/**
 * The light pool under the leap.
 *
 * Fast up and slow down — *the asymmetry is what makes it read as something
 * having happened* — and additive, so overlapping glows in a cascade stack
 * brighter instead of averaging out. That stacking is most of why a five-tile
 * pocket feels bigger than a two.
 */
export function glowPhase(motion: Motion, elapsed: number, delay: number): GlowPhase {
  const t = (elapsed - delay) / motion.popMs;
  if (t <= 0) return { scale: 0, strength: 0, gone: false };
  if (t >= 1) return { scale: 0, strength: 0, gone: true };
  const rise = t < 0.15 ? t / 0.15 : (1 - (t - 0.15) / 0.85) ** 2;
  return { scale: 1 + t * 0.35, strength: motion.popAlpha * rise, gone: false };
}

/**
 * The reduced-motion pop: no arc, no stagger, no cascade — one still flash held
 * briefly and taken away. It says a harvest happened without moving anything,
 * which is the whole contract.
 */
export const REDUCED_MS = 200;
