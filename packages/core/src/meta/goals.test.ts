import { describe, expect, it } from 'vitest';
import { GOALS } from '@content/goals';
import { EMPTY_PROGRESS, PERKS, type Progress } from './progress';
import { decodeWorld, encodeWorld, newWorld, UNLOCKS, type WorldMemory } from './world';
import { isGoalMet, metGoalIds, newlyMetGoals, sealGoals } from './goals';

/**
 * The survey (2026-08-18): five world-scale goals, each paying relics once
 * per world. Detection lives in `isGoalMet`; the shell pays via
 * `newlyMetGoals`, once, comparing against `WorldMemory.goalsMet`.
 */

const worldWith = (over: Partial<WorldMemory>): WorldMemory => ({ ...newWorld(1), ...over });

describe('the survey — detection', () => {
  it('reach20: true at and past 20, false short of it', () => {
    expect(isGoalMet('reach20', worldWith({ farthestReach: 19 }), EMPTY_PROGRESS)).toBe(false);
    expect(isGoalMet('reach20', worldWith({ farthestReach: 20 }), EMPTY_PROGRESS)).toBe(true);
    expect(isGoalMet('reach20', worldWith({ farthestReach: 30 }), EMPTY_PROGRESS)).toBe(true);
  });

  it('territories4: counts held territories', () => {
    const three = ['a', 'b', 'c'] as const;
    const four = ['a', 'b', 'c', 'd'] as const;
    expect(isGoalMet('territories4', worldWith({ territories: three }), EMPTY_PROGRESS)).toBe(
      false,
    );
    expect(isGoalMet('territories4', worldWith({ territories: four }), EMPTY_PROGRESS)).toBe(true);
  });

  it('known40: reads knownFraction against the 40% line', () => {
    // knownFraction is revealed / (a disc sized by max(10, farthestReach)) —
    // a world that has revealed nearly every hex of its own small disc
    // clears 40% easily.
    const revealed = Array.from({ length: 200 }, (_, i) => `${i},0`);
    expect(
      isGoalMet('known40', worldWith({ farthestReach: 0, revealed: [] }), EMPTY_PROGRESS),
    ).toBe(false);
    expect(isGoalMet('known40', worldWith({ farthestReach: 0, revealed }), EMPTY_PROGRESS)).toBe(
      true,
    );
  });

  it('shrinesAll: needs every shrine in the ledger, no more, no fewer', () => {
    const short = UNLOCKS.slice(0, UNLOCKS.length - 1).map((_, i) => `s${i}`);
    const full = UNLOCKS.map((_, i) => `s${i}`);
    expect(isGoalMet('shrinesAll', worldWith({ shrines: short }), EMPTY_PROGRESS)).toBe(false);
    expect(isGoalMet('shrinesAll', worldWith({ shrines: full }), EMPTY_PROGRESS)).toBe(true);
  });

  it('perksAll: reads Progress, not the world — perks carry across worlds', () => {
    const some: Progress = {
      ...EMPTY_PROGRESS,
      found: PERKS.slice(0, PERKS.length - 1).map((p) => p.id),
    };
    const all: Progress = { ...EMPTY_PROGRESS, found: PERKS.map((p) => p.id) };
    expect(isGoalMet('perksAll', newWorld(1), some)).toBe(false);
    expect(isGoalMet('perksAll', newWorld(1), all)).toBe(true);
  });
});

describe('the survey — once-only payout', () => {
  it('lists a goal as newly met the first time it becomes true', () => {
    const world = worldWith({ farthestReach: 20 });
    expect(newlyMetGoals(world, EMPTY_PROGRESS)).toContain('reach20');
  });

  it('never lists a goal already paid for this world, even though it stays true', () => {
    const world = worldWith({ farthestReach: 20, goalsMet: ['reach20'] });
    expect(newlyMetGoals(world, EMPTY_PROGRESS)).not.toContain('reach20');
    // metGoalIds (the raw "is it true" list) still names it — only the
    // NEWLY-met list is once-only.
    expect(metGoalIds(world, EMPTY_PROGRESS)).toContain('reach20');
  });

  it('lists every goal met at once, the run that clears several together', () => {
    const world = worldWith({
      farthestReach: 25,
      territories: ['a', 'b', 'c', 'd'],
    });
    const newly = newlyMetGoals(world, EMPTY_PROGRESS);
    expect(newly).toContain('reach20');
    expect(newly).toContain('territories4');
  });
});

describe('the survey — a world PLANTED from a run it did not have', () => {
  /**
   * `sealGoals`, and the faucet it closes (2026-09-09).
   *
   * `worldFromRun` hands a fresh world the ground a daily or a shared board
   * walked, its territories and how far it got — three of the five goals' own
   * inputs. `goalsMet` starts empty and the payout runs at the END of the next
   * run, so one placement in the planted world collected `known40` (35),
   * `reach20` (25) and `territories4` (30) for a survey nothing there had done.
   * On a board that can be retried until it is good and re-planted every day,
   * that is 90 relics a day.
   *
   * The `known40` half has been live since the import shipped on 2026-09-05.
   */
  it('pays nothing for a survey the run did before the world existed', () => {
    const handed = worldWith({
      farthestReach: 25,
      territories: ['a', 'b', 'c', 'd'],
      // 40% of the disc a reach of 25 describes (3 x 25 x 26 + 1 = 1951).
      revealed: Array.from({ length: 900 }, (_, i) => `${i},0`),
    });
    // Every one of the three is true of the board as handed over.
    expect(newlyMetGoals(handed, EMPTY_PROGRESS)).toEqual(
      expect.arrayContaining(['reach20', 'territories4', 'known40']),
    );

    const sealed = sealGoals(handed, EMPTY_PROGRESS);
    expect(newlyMetGoals(sealed, EMPTY_PROGRESS), 'a planted world paid for its dowry').toEqual([]);
    // Sealed, not zeroed: the facts are true and the atlas should say so.
    expect(metGoalIds(sealed, EMPTY_PROGRESS)).toEqual(metGoalIds(handed, EMPTY_PROGRESS));
    expect(sealed.farthestReach).toBe(25);
    expect(sealed.territories).toEqual(['a', 'b', 'c', 'd']);
  });

  it('still pays for a goal the player goes on to meet in that world', () => {
    const sealed = sealGoals(worldWith({ farthestReach: 25 }), EMPTY_PROGRESS);
    expect(newlyMetGoals(sealed, EMPTY_PROGRESS)).not.toContain('reach20');
    const later = { ...sealed, territories: ['a', 'b', 'c', 'd'] };
    expect(newlyMetGoals(later, EMPTY_PROGRESS)).toContain('territories4');
  });

  it('leaves a world that has met nothing exactly as it was', () => {
    const blank = newWorld(3);
    expect(sealGoals(blank, EMPTY_PROGRESS)).toBe(blank);
  });
});

describe('the survey — old worlds', () => {
  it('decodes a world written before goalsMet existed as having met nothing', () => {
    const stale = JSON.stringify({ worldSeed: 1, revealed: [], territories: [] });
    const world = decodeWorld(stale);
    expect(world?.goalsMet).toEqual([]);
  });

  it('round-trips a world that has met goals', () => {
    const world = worldWith({ goalsMet: ['reach20', 'perksAll'] });
    expect(decodeWorld(encodeWorld(world))).toEqual(world);
  });
});

describe('the survey — content', () => {
  it('prices every goal well under a maxed shop upgrade, never at zero', () => {
    for (const goal of GOALS) {
      expect(goal.reward).toBeGreaterThan(0);
      expect(goal.reward).toBeLessThanOrEqual(60);
    }
  });
});
