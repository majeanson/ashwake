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

  /**
   * The other half of the same ruling (2026-09-01). A find grants a perk, a
   * perk lives on the world, and a daily has no world — so a daily's finds
   * shimmered, cost a placement to reach and paid nothing. See `NO_LEDGER`.
   */
  it('puts no hidden finds in a daily, nor in a shared board', () => {
    for (const kind of ['daily', 'detour'] as const) {
      const t = economyFor({ kind });
      expect([t.findEvery, t.findChance, t.findSense], kind).toEqual([0, 0, 0]);
    }
  });

  /**
   * A SHARED BOARD IS A DAILY YOU WERE HANDED (2026-09-09, Marc: *"For a
   * shared world, it should be able to be played like a daily for a first
   * run"*).
   *
   * This file used to pin the opposite — "a detour is not a daily", on the
   * argument that somebody else's world should be played as it stands. That
   * argument is about the GEOGRAPHY and it still holds: nothing in `NO_LEDGER`
   * touches ground, walls, caches, sites or territories, so a shared link is
   * still the board the sharer walked. What it takes away is the two landmark
   * kinds that pay into a ledger a detour does not have.
   */
  it('plays a shared board on a daily’s economy, geography untouched', () => {
    const daily = economyFor({ kind: 'daily' });
    const detour = economyFor({ kind: 'detour' });
    expect(detour).toEqual(daily);
    // The board itself is the sharer's: every dial that decides where a hex,
    // a wall or a landmark stands is the shipped one.
    for (const dial of [
      'destinationEvery',
      'destinationChance',
      'cacheShareNear',
      'siteShareNear',
      'territoryShareNear',
      'territoryRadius',
      'worldWalls',
      'elevationEvery',
    ] as const) {
      expect(detour[dial], dial).toBe(TUNING[dial]);
    }
  });

  /**
   * SACRIFICE, held up by a chain three files long — see `NO_LEDGER`.
   *
   * `toHudView`'s `harvestBurn` falls back from `burnRelics` to `burnLuck`,
   * and `ActionBar` draws the button only above zero. Both dials are zero in a
   * daily, so the button is gone; if either ever moves, this is what says so
   * before a player is offered a burn that pays nothing.
   */
  it('offers a daily no burn, because a burn there buys nothing', () => {
    const t = economyFor({ kind: 'daily' });
    expect([t.burnRelics, t.burnLuck]).toEqual([0, 0]);
  });

  it('changes nothing a shared board does not need changed', () => {
    const t = economyFor({ kind: 'detour' });
    // Every dial, listed: a replay scored under this device's upgrades would
    // not be a replay of anything, so the shop and the perks reach neither of
    // the two kinds that earn nothing.
    expect(t).toEqual({
      ...TUNING,
      burnRelics: 0,
      claimRelics: 0,
      luckToRelics: 0,
      titheRate: 0,
      shrinesReborn: true,
      findEvery: 0,
      findChance: 0,
      findSense: 0,
      territoryPays: TUNING.cachePays,
    });
  });

  /**
   * A TERRITORY PAYS TILES WHERE THERE IS NO LEDGER, AND ONLY THERE
   * (2026-09-09, Marc: *"maybe they could give tiles in daily too? (not in
   * world?)"*).
   *
   * Three of a territory's four payments are dead outside a world: the
   * `territoryTiles` bonus to later runs, the +10 relics on the crossing, and
   * greeting a later run already yours. `territoryPays` is the substitute and
   * the one landmark dial that is HIGHER outside a world than in one.
   */
  it('pays a territory in tiles outside a world, and never inside one', () => {
    for (const kind of ['daily', 'detour'] as const) {
      expect(economyFor({ kind }).territoryPays, kind).toBe(TUNING.cachePays);
    }
    expect(TUNING.territoryPays, 'a world paid a territory in tiles').toBe(0);
    const home = economyFor({
      kind: 'home',
      world: newWorld(7),
      progress: EMPTY_PROGRESS,
    });
    expect(home.territoryPays, 'a world paid a territory in tiles').toBe(0);
  });
});
