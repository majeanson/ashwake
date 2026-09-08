import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { TUNING } from '@content/tuning';
import { newRun, reduce } from '@engine/reduce';
import { canSpend, spendCost } from '@engine/reduce';
import type { GameState } from '@engine/state';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { toHudView, type SpendView } from '@view/view';
import { Purse } from './Purse';

/**
 * The purse drawer, and whether its rows are wired to anything.
 *
 * `NEXT.md` §3 has carried this line since the file was written: *"the purse's
 * spend actions dispatch but nothing tests them."* That is the exact shape of
 * this body's six inert mechanics — a control that renders, is tappable, and
 * reaches a reducer nobody proved it reaches. The colour lens, the stash, the
 * board's tap-to-describe and unselecting a card each shipped rendering and
 * not wired, and every one of them looked fine.
 *
 * So there are two questions here, and the second is the one that matters:
 * does the row call back with the spend the player pointed at, and does that
 * spend MOVE A NUMBER when it reaches `reduce`? A test that only checked the
 * callback fired would stay green through a shell that dispatched the wrong
 * action, which is precisely how unselecting a card came to be a silent no-op.
 */

const s = stringsFor(pickLocale(['en']));
const theme = resolveTheme(null);

/** A run holding `luck`, which is what makes every row affordable. */
function rich(luck: number, tuning = TUNING): GameState {
  return { ...newRun(11, tuning), luck };
}

const drawer = (state: GameState) => {
  const spent: SpendView[] = [];
  render(
    <Purse hud={toHudView(state, s)} theme={theme} s={s} onSpend={(spend) => spent.push(spend)} />,
  );
  return spent;
};

/**
 * Every row of a drawn purse, ACTUALLY TAPPED.
 *
 * The list could be read straight out of `toHudView`, and that is the version
 * that would have stayed green through every one of this body's inert
 * mechanics: it would be testing the view model rather than the drawer. What
 * comes back here has been through a real click on a real button.
 */
const tapped = async (state: GameState): Promise<readonly SpendView[]> => {
  const spent = drawer(state);
  // The SPEND rows only: the drawer grew a way out of itself on 2026-09-05,
  // and a close button is not a purchase.
  const rows = screen.getAllByRole('button').filter((row) => row.hasAttribute('data-spend'));
  for (const row of rows) await userEvent.click(row);
  return spent;
};

/** The shell's own translation from a row to an action — `App.tsx`'s `onSpend`. */
const actionFor = (spend: SpendView) =>
  spend.on === 'steer' && spend.colour !== null
    ? ({ type: 'SPEND', on: 'steer', colour: spend.colour } as const)
    : ({ type: 'SPEND', on: spend.on } as const);

describe('the purse offers what the run can pay for', () => {
  it('shows every spend the economy has, affordable or not', () => {
    drawer(rich(0));
    // Shown and DISABLED rather than hidden: what luck is for is half the
    // reason to collect it, and a menu that appears only once you can afford
    // it teaches nobody what they were saving toward.
    // The SPEND rows: the way OUT of the drawer is not a purchase and is never
    // priced, so it is never disabled either (added 2026-09-05).
    const rows = screen.getAllByRole('button').filter((row) => row.hasAttribute('data-spend'));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).toBeDisabled();
  });

  it('enables the rows once there is luck to spend', () => {
    drawer(rich(500));
    expect(screen.getAllByRole('button').every((b) => !(b as HTMLButtonElement).disabled)).toBe(
      true,
    );
  });
});

describe('a tapped row reaches the reducer', () => {
  it('hands back the row that was tapped, colour and all', async () => {
    const state = rich(500);
    const spent = drawer(state);
    for (const row of screen.getAllByRole('button')) await userEvent.click(row);

    // One callback per row, in the order `spendsFor` lays them out.
    expect(spent.map((x) => x.on)).toEqual(toHudView(state, s).spends.map((x) => x.on));
    // The four STEER rows are four different colours and not four of one:
    // the colour is the whole of what that row is for, and a drawer that lost
    // it would still look right.
    const steers = spent.filter((x) => x.on === 'steer').map((x) => x.colour);
    expect(new Set(steers).size).toBe(steers.length);
  });

  /**
   * The half a rendering test cannot see. Each row, dispatched as `App.tsx`
   * dispatches it, and then a NUMBER checked — because a spend that returns
   * the same state is what the reducer does with an action it refuses, and
   * that is indistinguishable from a working button.
   */
  it('spends luck when REDRAW and FORGE are tapped', async () => {
    const state = rich(500);
    for (const spend of await tapped(state)) {
      if (spend.on === 'tithe') continue;
      const after = reduce(state, actionFor(spend));
      expect(after, `${spend.on} was a no-op`).not.toBe(state);
      expect(after.luck, `${spend.on} cost nothing`).toBe(
        state.luck - spendCost(state.tuning, spend.on),
      );
    }
  });

  it('redraws the hand under the colour a STEER row names', async () => {
    const state = rich(500);
    const steer = (await tapped(state)).find((x) => x.on === 'steer' && x.colour === 'red');
    expect(steer).toBeDefined();
    const after = reduce(state, actionFor(steer!));
    // Steering redraws the hand under the named colour rather than merely
    // biasing later draws — a bet you cannot see is not a decision.
    expect(after.bias?.colour).toBe('red');
    expect(after.draft).not.toEqual(state.draft);
  });

  // TITHE was cut from the shipped economy 2026-09-03 (`titheRate`/`titheMin`
  // both 0 in `TUNING` now — see tuning.ts) in favour of relics staying
  // passive. Priced against its own tuning here so the row's wiring — the
  // thing this file exists to prove, per the docblock above — stays tested
  // even though the shipped drawer never offers it.
  it('turns the whole purse into relics when TITHE is tapped', async () => {
    const priced = { ...TUNING, titheRate: 0.15, titheMin: 20 };
    const state = rich(500, priced);
    const tithe = (await tapped(state)).find((x) => x.on === 'tithe');
    expect(tithe, 'the purse has no way out of itself').toBeDefined();
    expect(canSpend(state, 'tithe')).toBe(true);

    const after = reduce(state, actionFor(tithe!));
    expect(after.luck, 'a tithe left luck in the purse').toBe(0);
    expect(after.relics).toBe(state.relics + Math.floor(state.luck * priced.titheRate));
    // The row prints that number before it is spent, so the tap and the
    // receipt cannot disagree.
    expect(tithe!.relics).toBe(after.relics - state.relics);
  });

  /*
   * ONE DOOR, and it is the LUCK button (2026-09-08).
   *
   * This asserted the opposite between 2026-09-05 and today, and the reason it
   * flipped is worth keeping: the drawer's own close button was added because
   * LUCK had moved to the board's far corner, and it was drawn right-aligned at
   * the foot — which is precisely the corner the camera cluster is pinned to,
   * at a higher rung on the z ladder. **It was under the two buttons from the
   * day it was added.** Marc, finding it: *"remove the go back button ... or
   * make it pop above the buttons of luck and camera so we dont get locked
   * out"*, and, asked which, both. So the drawer clears the cluster (`.spends`)
   * and closes by the toggle that opened it.
   *
   * Kept as a test rather than deleted: a drawer growing its own door again is
   * how it ends up back under the cluster, and the e2e suite holds the other
   * half — that LUCK actually shuts it.
   */
  it('has no door of its own: LUCK is the toggle', () => {
    drawer(rich(50));
    expect(
      document.querySelector('[data-action="purse-close"]'),
      'the purse grew a second door, which is how it got under the camera cluster',
    ).toBeNull();
  });
});
