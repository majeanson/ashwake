import { CROSSING } from '@content/goals';
import { endingPayout } from '@engine/reduce';
import type { GameState } from '@engine/state';
import type { Progress } from '@meta/progress';
import { appendEntry, type Timeline } from '@meta/timeline';
import { newWorld, type WorldMemory } from '@meta/world';

/**
 * Leaving a world for a fresh one (Stage 4, 2026-08-29).
 *
 * A world's shrines switch its systems on one at a time; once every unlock is
 * yours, a further shrine has nothing left to give. Ashwake 1's answer — and
 * the reason a fully-awake world is not a dead end — is that it becomes the
 * way ONWARD: cross to a new world, carrying relics for what you leave.
 *
 * **Priced in one place.** The card's offer and the amount actually banked are
 * the same number by construction, because both call `dowryOf`. Ashwake 1
 * makes the same point in the same words; a crossing that offers one figure
 * and pays another is the worst kind of bug, since the player only finds out
 * after the world is gone.
 *
 * **What carries, and what does not.** Relics carry, and so do the perks the
 * player has found — those live on `Progress`, which is a device fact.
 * Everything that is the PLACE stays behind: the ground, the territories, the
 * shrines woken here, and everything bought with this world's shop levels.
 * That split was rewritten on Marc's own evidence (2026-08-28): losing hard-
 * found perks for 75 relics was "not worth it", and this card had been saying
 * the opposite since perks moved onto the world.
 *
 * The run itself is settled the way any ending settles it — `endingPayout` is
 * the engine's own arithmetic, reused rather than re-derived, so **a crossing
 * pays exactly what walking to that shrine and stopping would have paid**,
 * plus the dowry.
 */

/**
 * What this world pays to leave it: a base, plus every territory held.
 *
 * Finishing a world thoroughly pays better than rushing its exit, which is the
 * whole reason the dowry is not flat. Both numbers are balance and live in
 * `content/goals.ts`.
 */
export const dowryOf = (world: WorldMemory | null): number =>
  CROSSING.baseRelics + (world?.territories.length ?? 0) * CROSSING.relicsPerTerritory;

/** Everything the crossing would hand over, before it is taken. */
export const carriedBy = (state: GameState, world: WorldMemory | null): number =>
  dowryOf(world) + endingPayout(state).relics;

export type Crossing = {
  readonly state: GameState;
  readonly world: WorldMemory | null;
  readonly progress: Progress;
  readonly timeline: Timeline;
  /** The seed of the world being crossed INTO. The shell rolls it, because a
   *  new world is the one thing here that may not be deterministic. */
  readonly seed: number;
  /** Epoch ms, supplied by the shell — the core has no clock. */
  readonly at: number;
};

export type Crossed = {
  readonly world: WorldMemory;
  readonly progress: Progress;
  readonly timeline: Timeline;
  /** What was actually carried, so the shell can say it. */
  readonly carried: number;
};

/**
 * Cross. Pure — the caller writes the result, which is what lets a keeper
 * refuse it and what keeps this testable by handing it a finished world.
 *
 * The relic farm this could become is guarded upstream, in the keeper: a
 * dropped or dead keeper crosses nothing a second time, which is the one thing
 * standing between a slow double-tap and a double-paid dowry.
 */
export function cross(now: Crossing): Crossed {
  const carried = carriedBy(now.state, now.world);

  return {
    // A fresh world in the same slot. Nothing of the old one comes with it —
    // that is what "leaving" means, and it is why the offer is a two-tap arm.
    world: newWorld(now.seed),
    /*
     * Relics and perks carry; the BUILD does not.
     *
     * `Progress` is mostly a device fact — the relics, the perks found, the
     * teaching ledger — and all of that follows the player. `bought` is the
     * exception: upgrade levels belong to the world they were bought in, which
     * is what makes the card's "everything you have BOUGHT stays behind" true
     * rather than a sentence. Until 2026-08-29 it was a sentence: the shop was
     * device-wide, so crossing was pure profit and the dowry — 25 relics plus
     * ten a territory — was a bonus rather than the trade it was tuned as.
     */
    progress: { ...now.progress, relics: now.progress.relics + carried, bought: {} },
    timeline: appendEntry(now.timeline, {
      at: now.at,
      kind: 'world',
      event: 'crossed',
      slot: 0,
      // The world LEFT BEHIND, which is what the diary row is about.
      worldSeed: now.world?.worldSeed ?? now.state.rootSeed,
      n: carried,
    }),
    carried,
  };
}
