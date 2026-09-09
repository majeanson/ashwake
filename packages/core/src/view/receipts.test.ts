import { describe, expect, it } from 'vitest';
import { TUNING, type Tuning } from '@content/tuning';
import { newRun } from '@engine/reduce';
import { homeOf, territoryPaysAt } from '@engine/rules';
import type { Cell, GameState, LandmarkReward } from '@engine/state';
import { LANDMARK_ICON } from '@theme/icons';
import { resolveTheme } from '@theme/index';
import { stringsFor } from '@text/index';
import { claimsBetween, saidOf } from './receipts';

/**
 * The reward loop's own voice.
 *
 * Reaching a shrine, a cache, a territory or a find is what the whole game is
 * FOR, and this body claimed them all in silence until 2026-08-29. These are
 * the assertions that would have caught that — and, more usefully, the ones
 * that pin the two decisions inside it: which claim leads when two land at
 * once, and which of them hold the screen.
 */

const theme = resolveTheme('torchlit');
const s = stringsFor('en');
const ctx = { theme, strings: s, detour: false };

/**
 * A run with landmarks standing on it. Built by handing the reducer's own
 * state new CELLS rather than by casting a literal — the cells map is the only
 * thing these tests care about, and everything else stays exactly what
 * `newRun` produced.
 */
function board(...landmarks: readonly Landmark[]): GameState {
  const base = newRun(7, TUNING);
  const cells: Record<string, Cell> = { ...base.cells };
  for (const { hex, reward, claimed } of landmarks) {
    cells[hex] = { kind: 'landmark', reward, claimed, colour: 'green' };
  }
  return { ...base, cells };
}

type Landmark = {
  readonly hex: string;
  readonly reward: LandmarkReward;
  readonly claimed: boolean;
};

/** One landmark, the common case. */
const withLandmark = (hex: string, reward: LandmarkReward, claimed: boolean): GameState =>
  board({ hex, reward, claimed });

describe('a claim speaks', () => {
  for (const reward of ['cache', 'site', 'territory', 'shrine', 'find'] as const) {
    it(`says something, led by its own glyph, for a ${reward}`, () => {
      const before = withLandmark('2,0', reward, false);
      const after = withLandmark('2,0', reward, true);
      const said = claimsBetween(before, after, ctx);

      expect(said).toHaveLength(1);
      expect(said[0]?.reward).toBe(reward);
      // The mark it happened to leads the sentence — "a star gave me that",
      // never "some text appeared". `LANDMARK_ICON` is the one authority, and
      // the mark rides BESIDE the words since 2026-08-30 — it is an icon now,
      // and an icon cannot be prefixed into a sentence.
      expect(said[0]?.icon).toBe(LANDMARK_ICON[reward]);
      expect(said[0]?.text.length).toBeGreaterThan(20);
    });
  }

  it('says nothing at all when nothing was claimed', () => {
    const still = withLandmark('2,0', 'cache', false);
    expect(claimsBetween(still, still, ctx)).toHaveLength(0);
    expect(saidOf([])).toBeNull();
  });

  it('says nothing for a landmark that was ALREADY claimed', () => {
    const claimed = withLandmark('2,0', 'shrine', true);
    expect(claimsBetween(claimed, claimed, ctx)).toHaveLength(0);
  });
});

describe('a territory on a board with no ledger behind it', () => {
  /**
   * THE RECEIPT SAYS THE NUMBER THE PURSE RECEIVED (2026-09-09).
   *
   * `territoryPays` is 0 in a world, where the sentence is the one it always
   * was — "it stays yours between runs", which is true there. Raised on a
   * daily and a shared board, where it is NOT true unless the player keeps the
   * board, the receipt has to carry both new facts: the tiles it just paid, and
   * that the field lasts the run otherwise. Read from `territoryPaysAt`, the
   * same function the engine paid from, for `cachePaysAt`'s own reason: Ashwake
   * 1's UI once priced a cache from world origin instead of from home and
   * announced several times what it actually banked.
   */
  const noLedger: Tuning = { ...TUNING, territoryPays: TUNING.cachePays };
  const held = (hex: string, claimed: boolean, tuning: Tuning): GameState => {
    const base = newRun(7, tuning);
    return {
      ...base,
      cells: {
        ...base.cells,
        [hex]: { kind: 'landmark', reward: 'territory', claimed, colour: 'green' },
      },
    };
  };

  it('quotes the tiles the engine paid, and only where they were paid', () => {
    const hex = '2,0';
    const paid = territoryPaysAt(hex, noLedger, homeOf(held(hex, true, noLedger)));
    expect(paid, 'the fixture pays nothing, so this test proves nothing').toBeGreaterThan(0);

    const said = claimsBetween(held(hex, false, noLedger), held(hex, true, noLedger), ctx);
    expect(said[0]?.text).toContain(String(paid));

    // A world's receipt is unchanged, and does not quote a payment it did not
    // make: `territoryPays` is 0 there.
    const inWorld = claimsBetween(held(hex, false, TUNING), held(hex, true, TUNING), ctx);
    expect(inWorld[0]?.text).toBe(s.claim.territory(TUNING.territoryRadius, 'FARM'));
  });
});

describe('when two land at once', () => {
  const before = board(
    { hex: '2,0', reward: 'cache', claimed: false },
    { hex: '3,0', reward: 'find', claimed: false },
  );
  const after = board(
    { hex: '2,0', reward: 'cache', claimed: true },
    { hex: '3,0', reward: 'find', claimed: true },
  );

  it('leads with the rarest, not the first one found on the board', () => {
    const said = claimsBetween(before, after, ctx);
    expect(said.map((r) => r.reward)).toEqual(['find', 'cache']);
  });

  it('is ONE thing to show, with the rest following after a blank line', () => {
    const shown = saidOf(claimsBetween(before, after, ctx));
    expect(shown?.text).toContain('\n\n');
    // A placement that reaches a find and a cache at once is a FIND moment:
    // one card, one subject.
    expect(shown?.icon).toBe(LANDMARK_ICON.find);
  });

  it('holds the screen for the rare ones and not for the common ones', () => {
    expect(saidOf(claimsBetween(before, after, ctx))?.card).toBe(true);

    const onlyCache = claimsBetween(
      withLandmark('2,0', 'cache', false),
      withLandmark('2,0', 'cache', true),
      ctx,
    );
    // A cache is tiles and a number. It does not stop the game.
    expect(saidOf(onlyCache)?.card).toBe(false);
  });
});

describe('a find', () => {
  const before = withLandmark('2,0', 'find', false);
  const after = withLandmark('2,0', 'find', true);

  it('names the perk and carries its three rows', () => {
    const said = claimsBetween(before, after, {
      ...ctx,
      perkAt: () => 'stonewalker',
      worn: () => false,
    });
    expect(said[0]?.text).toContain(s.perk.stonewalker.name);
    // YOU GAIN / YOU LOSE / PLAY IT — the same three the shop folds open.
    expect(said[0]?.rows).toHaveLength(3);
  });

  it('tells the truth about a perk that is already worn', () => {
    const worn = claimsBetween(before, after, {
      ...ctx,
      perkAt: () => 'stonewalker',
      worn: () => true,
    });
    const notWorn = claimsBetween(before, after, {
      ...ctx,
      perkAt: () => 'stonewalker',
      worn: () => false,
    });
    expect(worn[0]?.text).not.toBe(notWorn[0]?.text);
  });

  it('says so plainly when there was nothing new inside', () => {
    const said = claimsBetween(before, after, { ...ctx, perkAt: () => null });
    expect(said[0]?.icon).toBe(LANDMARK_ICON.find);
    expect(said[0]?.rows).toBeUndefined();
  });
});

describe('a shrine', () => {
  it('names the unlock it is actually turning on', () => {
    const said = claimsBetween(
      withLandmark('2,0', 'shrine', false),
      withLandmark('2,0', 'shrine', true),
      ctx,
    );
    // The first shrine of a world turns on the first unlock in the ledger.
    expect(said[0]?.text).toContain(s.unlock.draft);
  });

  it('says what shrines ARE on a detour, never what a home world would unlock', () => {
    const said = claimsBetween(
      withLandmark('2,0', 'shrine', false),
      withLandmark('2,0', 'shrine', true),
      { ...ctx, detour: true },
    );
    expect(said[0]?.text).not.toContain(s.unlock.draft);
    expect(said[0]?.text).toBe(s.claim.shrineDetour);
    expect(said[0]?.icon).toBe(LANDMARK_ICON.shrine);
  });

  it('names the unlock the WORLD is actually turning on, not this run alone (2026-09-03)', () => {
    // A world already three shrines awake from earlier runs — this run has
    // touched none of them, so `countShrines` of its own cells reads 0 and
    // would announce the unlock this player already has.
    const said = claimsBetween(
      withLandmark('2,0', 'shrine', false),
      withLandmark('2,0', 'shrine', true),
      { ...ctx, shrinesClaimed: 3 },
    );
    expect(said[0]?.text).toContain(s.unlock.reach);
    expect(said[0]?.text).not.toContain(s.unlock.draft);
  });
});
