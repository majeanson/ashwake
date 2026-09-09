import { GOALS, type GoalId } from '@content/goals';
import { PERKS, type Progress } from './progress';
import { knownFraction, UNLOCKS, type WorldMemory } from './world';

/**
 * The survey's detection half (2026-08-18). Payout and the ledger write live
 * in the shell (`src/main.ts`, where `mergeRun`/`rememberRun` already run);
 * this module only answers "is this goal true right now", so the shell, the
 * settings ledger and the tests all read the same one question.
 *
 * Every threshold is `content/goals.ts`'s own `target` — read from there,
 * never restated here, so the number a goal is measured against cannot drift
 * from the number its own label speaks in words. Two of the five goals
 * (`shrinesAll`, `perksAll`) measure against pool sizes `content/goals.ts`
 * cannot import (content/ imports nothing) — read here instead, from
 * `UNLOCKS.length` and `PERKS.length`, their real source of truth; `target`
 * is `undefined` for both, and this module never reads it for either.
 */

const targetOf = (id: GoalId): number => GOALS.find((g) => g.id === id)?.target ?? 0;

export function isGoalMet(id: GoalId, world: WorldMemory, progress: Progress): boolean {
  switch (id) {
    case 'reach20':
      return world.farthestReach >= targetOf('reach20');
    case 'territories4':
      return world.territories.length >= targetOf('territories4');
    case 'known40':
      return knownFraction(world) >= targetOf('known40');
    case 'shrinesAll':
      return world.shrines.length >= UNLOCKS.length;
    case 'perksAll':
      return progress.found.length >= PERKS.length;
  }
}

/** Every goal true right now, in ledger order — met or not paid makes no difference here. */
export const metGoalIds = (world: WorldMemory, progress: Progress): readonly GoalId[] =>
  GOALS.filter((g) => isGoalMet(g.id, world, progress)).map((g) => g.id);

/**
 * Goals true right now that this world has not been PAID for yet — what the
 * shell owes relics for, once, the moment it sees this list is non-empty.
 */
export function newlyMetGoals(world: WorldMemory, progress: Progress): readonly GoalId[] {
  const already = new Set(world.goalsMet);
  return metGoalIds(world, progress).filter((id) => !already.has(id));
}

/**
 * A world PLANTED from a run that happened before it existed, with every goal
 * it already satisfies marked as paid (2026-09-09).
 *
 * `meta/world.ts`'s `worldFromRun` hands a fresh world the ground a daily or a
 * shared board walked, its territories, and how far it got. Three of the five
 * goals read exactly those fields, `goalsMet` starts empty, and the payout runs
 * at the end of the NEXT run — so one placement in the planted world was enough
 * to collect `known40` (35 relics), `reach20` (25) and `territories4` (30) for
 * a survey nothing in that world had done. On a board that can be retried until
 * it is good and re-planted every day, that is a faucet.
 *
 * **The `known40` half of it is live on `main` today** and has been since the
 * import shipped on 2026-09-05: `worldFromRun` carried `revealed` with a
 * `farthestReach` of zero, so `knownFraction` divided a few hundred remembered
 * hexes by a ten-hex disc and answered 100%.
 *
 * Sealing rather than zeroing the fields, because the fields are TRUE — the
 * ground was walked, the territories were taken, the reach was reached, and the
 * atlas should say so. What is not true is that this world's survey earned
 * anything, and `goalsMet` is precisely the ledger of "already accounted for".
 * Anything the player goes on to meet HERE still pays, once, exactly as it
 * always did.
 *
 * It lives in this file rather than beside `worldFromRun` because the detector
 * is here: `meta/world.ts` cannot import `meta/goals.ts`, which imports it.
 */
export function sealGoals(world: WorldMemory, progress: Progress): WorldMemory {
  const already = metGoalIds(world, progress);
  if (already.length === 0) return world;
  return { ...world, goalsMet: [...new Set([...world.goalsMet, ...already])] };
}
