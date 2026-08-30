import { describe, expect, it } from 'vitest';
import { TUNING } from '@content/tuning';
import { EMPTY_PROGRESS } from '@meta/progress';
import { newWorld, UNLOCKS } from '@meta/world';
import { economyFor } from './economy';

/**
 * The shop, the perks and the shrines, and whether any of them do anything.
 *
 * They did not. `createSession` has taken a `tuning` since Stage 1 and no
 * caller ever passed one, so every run in this body played the bare `TUNING`:
 * `applyProgress` — whose own docblock calls itself "the ONLY place progress
 * touches balance" — had zero callers, `withWorldPerks` had zero callers, and
 * `unlockedBy` was read three times, all of them to print a label. A shrine
 * announced DRAFT and the hand stayed four cards wide.
 *
 * So these tests are mostly one question asked four ways: does the number
 * actually move? A suite that only checked `economyFor` returned *a* Tuning
 * would have been just as green the whole time it was broken.
 */

/** A world with the first `n` shrines woken, in the ledger's own order. */
const woken = (n: number) => ({
  ...newWorld(1),
  shrines: Array.from({ length: n }, (_, i) => `${i + 1},0`),
});

describe('the economy a run opens under', () => {
  it('widens the hand when the DRAFT shrine is woken', () => {
    const t = economyFor({ kind: 'home', world: woken(1), progress: EMPTY_PROGRESS });
    expect(t.draftWidth, 'DRAFT was announced and the hand never grew').toBe(TUNING.draftWidth + 1);
  });

  it('adds a stash slot when the HOLD shrine is woken', () => {
    const t = economyFor({ kind: 'home', world: woken(2), progress: EMPTY_PROGRESS });
    expect(t.holdSlots).toBe(TUNING.holdSlots + 1);
    // The ladder is cumulative: nobody moves backward down it.
    expect(t.draftWidth).toBe(TUNING.draftWidth + 1);
  });

  it('doubles the rare odds when the LUCK shrine is woken', () => {
    const t = economyFor({ kind: 'home', world: woken(3), progress: EMPTY_PROGRESS });
    expect(t.magicChance).toBe(TUNING.magicChance * 2);
    expect(t.uniqueChance).toBe(TUNING.uniqueChance * 2);
  });

  it('doubles the beacon horizon when the REACH shrine is woken', () => {
    const t = economyFor({ kind: 'home', world: woken(4), progress: EMPTY_PROGRESS });
    expect(t.beaconHorizon).toBe(TUNING.beaconHorizon * 2);
  });

  it('leaves every dial alone on a world with no shrines woken yet', () => {
    expect(economyFor({ kind: 'home', world: newWorld(1), progress: EMPTY_PROGRESS })).toEqual(
      TUNING,
    );
  });

  /**
   * CAMP is the fifth rung and is deliberately not a dial — it gates a door.
   * Pinned so a later reading of "the last unlock does nothing" does not
   * become a bug report against this file.
   */
  it('changes no number for CAMP, which gates a door instead', () => {
    const all = economyFor({
      kind: 'home',
      world: woken(UNLOCKS.length),
      progress: EMPTY_PROGRESS,
    });
    const four = economyFor({ kind: 'home', world: woken(4), progress: EMPTY_PROGRESS });
    expect(all).toEqual(four);
  });

  it('spends what the shop bought, on top of what the shrines woke', () => {
    const world = woken(3);
    const bare = economyFor({ kind: 'home', world, progress: EMPTY_PROGRESS });
    const bought = economyFor({
      kind: 'home',
      world,
      progress: { ...EMPTY_PROGRESS, bought: { tiles: 2 } },
    });
    expect(bought.startingTiles, 'relics bought an upgrade that did nothing').toBeGreaterThan(
      bare.startingTiles,
    );
    // Composed, not overwritten: the LUCK shrine's doubling survives a purchase.
    expect(bought.magicChance).toBeGreaterThanOrEqual(bare.magicChance);
  });

  it('wears the perk this world holds, and only that one', () => {
    // OPEN HAND is `draftWidth` 5 with `holdSlots` 0 — two dials that already
    // existed, which is why it is the perk this test can see move.
    const world = { ...newWorld(1), perks: ['openhand' as const], worn: 'openhand' as const };
    const t = economyFor({ kind: 'home', world, progress: EMPTY_PROGRESS });
    expect(t, 'a worn perk changed nothing at all').not.toEqual(TUNING);
  });
});

describe('the two kinds of run that earn nothing', () => {
  it('pays a daily no relics, and rewrites its doors into rewards', () => {
    const t = economyFor({ kind: 'daily' });
    expect(t.shrinesReborn, 'a daily kept shrines that unlock nothing').toBe(true);
    expect([t.burnRelics, t.claimRelics, t.luckToRelics, t.titheRate]).toEqual([0, 0, 0, 0]);
  });

  it('plays a shared seed on the plain economy, with no relics', () => {
    const t = economyFor({ kind: 'detour' });
    expect(t.shrinesReborn, 'a detour is not a daily').toBe(TUNING.shrinesReborn);
    expect([t.burnRelics, t.claimRelics, t.luckToRelics, t.titheRate]).toEqual([0, 0, 0, 0]);
    // Everything else is untouched: a replay scored under this device's
    // upgrades would not be a replay of anything.
    expect({ ...t, burnRelics: TUNING.burnRelics }).toEqual({
      ...TUNING,
      claimRelics: 0,
      luckToRelics: 0,
      titheRate: 0,
    });
  });
});
