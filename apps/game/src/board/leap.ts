import type { HexKey } from '@engine/hex';
import type { Motion } from '@theme/tokens';

/**
 * The pop's leap (Stage 2c, 2026-08-29 — lifted out of `HexField`).
 *
 * The whole animation is two pure functions, so how long a harvest takes and
 * how high a tile rises can be tested without a canvas or a clock. The field
 * calls them once a frame and stops asking for frames when `done` is true.
 *
 * Stage 2d owes this file the rest of Ashwake 1's pop: the stagger that makes a
 * cascade ripple out from the pocket the player actually tapped, the additive
 * light pool underneath it, and the cover that keeps a popped tile its own
 * colour until its leap is over rather than grey from the first frame.
 */

export type Leap = {
  readonly keys: ReadonlySet<HexKey>;
  readonly startedAt: number;
};

/** How long a leap of this many tiles lasts, in milliseconds. */
export const leapMs = (motion: Motion, tiles: number): number =>
  motion.popMs + motion.popStaggerMs * tiles;

/**
 * How high a leaping tile sits above its resting place, and whether the leap is
 * over. A half-sine: it rises, hangs, and falls back to exactly where it began,
 * so a leap that is interrupted never leaves a tile stranded.
 */
export function jumpOf(
  motion: Motion,
  leap: Leap,
  now: number,
): { readonly lift: number; readonly done: boolean } {
  const total = leapMs(motion, leap.keys.size);
  if (total <= 0) return { lift: 0, done: true };
  const t = (now - leap.startedAt) / total;
  const k = Math.min(1, Math.max(0, t));
  return { lift: motion.popLift * Math.sin(Math.PI * k), done: t >= 1 };
}
