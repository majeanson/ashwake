import { LEARN_SEED } from '@content/learn';
import type { Tuning } from '@content/tuning';
import { EMPTY_PROGRESS, type Progress } from '@meta/progress';
import { newWorld } from '@meta/world';
import { economyFor } from './economy';
import { memoryOf, type RunMemory } from './storage';
import { phaseOf } from './teaching';

/**
 * THE TUTORIAL IS THE SAME EVERY TIME (2026-10-13, Marc: _"similar to a daily
 * we reset fog in tutorial so it's always the same"_).
 *
 * A world remembers: its fog, its claimed territories, its woken shrines, and
 * what the next run is dealt. That is the point of a world and the opposite of
 * what a tutorial wants — a stranger who restarts, or a veteran who replays,
 * would be walked through a map half-revealed and a shop half-stocked. A daily
 * has no world and so no memory; this gives the tutorial the same: while the
 * first run has not yet ended (`phaseOf` is not `free`) a run on the chosen
 * seed is handed a BRAND NEW world's memory and economy, whatever the slot
 * holds. The slot itself is not touched, so the player's own world stays as it
 * was and keeps whatever the run adds.
 */
export const isTutorialRun = (seed: number, progress: Progress): boolean =>
  seed === LEARN_SEED && phaseOf(progress) !== 'free';

/** The memory and the economy of a world that has never been played. */
export function tutorialDoor(): { readonly memory: RunMemory; readonly economy: Tuning } {
  const world = newWorld(LEARN_SEED);
  return {
    memory: memoryOf(world),
    economy: economyFor({ kind: 'home', world, progress: EMPTY_PROGRESS }, undefined, true),
  };
}
