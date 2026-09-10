import { useCallback, useRef } from 'react';
import type { WorldMemory } from '@meta/world';
import type { Keeper } from './keeper';
import { activeSlot, readWorld } from './storage';

/**
 * THIS SESSION'S LIVE COPY OF THE WORLD (`PASS.md` P2.9).
 *
 * A ref rather than state, and rather than a read per action: the world is
 * written by four separate seams — the ground a run walks, the perk shelf, the
 * settle that closes a run, and the crossing that mints the next one — and each
 * hands the keeper a WHOLE `WorldMemory`. Re-reading the disk for each would
 * mean decoding a blob carrying every hex the player has ever revealed, on
 * every tap; and two seams firing in one tick would each build from a copy that
 * predates the other, so whichever wrote second would silently undo the first.
 * **One held object, and the seam that touches it last is the one the keeper
 * writes.**
 *
 * ## Why this is a module and not four lines in `App`
 *
 * That invariant is the whole point of the ref, and it only holds if every
 * writer goes through one door. It did not: `settle`'s branch in `App.tsx`
 * spelled `keepWorld` out inline —
 *
 *     worldNow.current = after.world;
 *     keeper.saveWorld(after.world);
 *
 * — which is `keepWorld(after.world)` with the two statements copied, found on
 * the way out (2026-09-10). Nothing was wrong with it and nothing ever would
 * have been, until somebody added a third statement to `keepWorld` and this
 * site did not get it. **A rule with one name in a docblock and two spellings
 * in the file is a rule waiting to be half-changed.** There is one door now.
 *
 * The crossing is also why the block sat above the session in `App`:
 * `shell/cross.ts` states its invariant as *"the card's offer and the amount
 * actually banked are the same number by construction, because both call
 * `dowryOf`"*, and calling one function is not the construction — it has to be
 * the same WORLD. Three copies of it existed in `App` at once (the disk, a
 * panel-refresh snapshot, and this), and `dowryOf` pays per territory HELD, so
 * a crossing taken on the run that earned the territory offered one figure,
 * printed a second and banked a third.
 */

/**
 * Which copy answers for this seed, if either does.
 *
 * The RULE, and the reason it is a function: `null` means "not read yet, or a
 * different world", and the decision is made by SEED — exactly the way
 * `settle`'s guard and `memoryFor` do it. A held copy from another world is
 * not a miss to be filled from the disk, it is a wrong answer, and so is a
 * disk copy whose seed does not match. Ground unioned from a foreign geography
 * is unremovable afterwards, which is what makes this worth stating once.
 */
export function heldFor(
  held: WorldMemory | null,
  disk: WorldMemory | null,
  seed: number,
): WorldMemory | null {
  if (held !== null && held.worldSeed === seed) return held;
  return disk !== null && disk.worldSeed === seed ? disk : null;
}

export type Held = {
  /** The live world for this seed, or null when this device has none. */
  readonly worldHeld: (seed: number) => WorldMemory | null;
  /** Hold a new copy AND tell the keeper — the one door every writer uses. */
  readonly keepWorld: (next: WorldMemory) => void;
  /** A run is beginning somewhere else: let go, so nothing carries over. */
  readonly forgetWorld: () => void;
};

/** The held copy, with the keeper behind it. */
export function useHeldWorld(keeper: Keeper): Held {
  const now = useRef<WorldMemory | null>(null);

  const worldHeld = useCallback(
    (seed: number): WorldMemory | null => heldFor(now.current, readWorld(activeSlot()), seed),
    [],
  );

  const keepWorld = useCallback(
    (next: WorldMemory) => {
      now.current = next;
      keeper.saveWorld(next);
    },
    [keeper],
  );

  const forgetWorld = useCallback(() => {
    now.current = null;
  }, []);

  return { worldHeld, keepWorld, forgetWorld };
}
