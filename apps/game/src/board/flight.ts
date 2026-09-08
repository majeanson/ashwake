/**
 * How long the camera's excursions take — the numbers, with no renderer
 * attached (2026-09-08).
 *
 * These three lived in `Board.tsx`, which is right where they are USED and
 * wrong for the one caller outside it: `App` waits out a tour with `tourMs`,
 * and importing a function from `Board.tsx` imports `Board.tsx`, which imports
 * `@react-three/fiber`, which imports three. One arithmetic helper was
 * therefore holding a megabyte of renderer in the entry chunk — and the whole
 * of the front door, the manual, settings and the hall of fame had to wait for
 * it to parse before anything drew.
 *
 * So the numbers moved down here, where nothing imports a renderer, and
 * `Board.tsx` became the lazily-loaded thing it always could have been. This
 * file is the seam that made that possible; it has no other reason to exist
 * and should not grow one. Anything that needs three belongs above it.
 */

/** One leg of a camera flight, in ms. */
export const FLIGHT_MS = 320;

/** How long the tour sits at the wide shot before it dives, in ms. Shorter
 *  than the hold at the hex: the wide shot is context, not the subject. */
export const TOUR_WIDE_HOLD_MS = 320;

/**
 * How long a `tour` takes end to end, for a caller that has to wait it out.
 *
 * Three flights and two holds, stated once here rather than reassembled by
 * whoever needs the number. **A clock rather than a callback, deliberately.**
 * `tour` has four exits — reduced motion, either leg abandoned by a finger, and
 * the ordinary end — and a `done` that any one of them forgot to call would
 * leave `App`'s `touring` latched true, which is the teaching drip silently
 * stopping for the rest of the run. A duration cannot be forgotten: the worst a
 * trip cut short by a drag costs is that the next card waits out a journey
 * nobody is on any more, and every path converges within this many ms whatever
 * happened.
 */
export const tourMs = (holdMs: number): number => FLIGHT_MS * 3 + TOUR_WIDE_HOLD_MS + holdMs;
