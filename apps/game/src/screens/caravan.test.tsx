import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { TUNING } from '@content/tuning';
import { CARAVAN_WARES } from '@content/caravan';
import { caravanVisitAt } from '@engine/caravan';
import { newRun, reduce } from '@engine/reduce';
import type { GameState } from '@engine/state';
import { stringsFor } from '@text/index';
import { toHudView } from '@view/view';
import { CaravanAsk, CaravanPicker } from './Caravan';

/**
 * The caravan on the board (2026-09-29), and whether it is wired to anything.
 *
 * The purse test's rule, kept: a control is proven wired only when what it
 * calls back with, sent through `reduce`, MOVES A NUMBER. A picker that renders
 * three wares and dispatches nothing is the exact shape of this body's inert
 * mechanics, and would look fine.
 */
const s = stringsFor(pickLocale(['en']));

describe('the caravan, on the board', () => {
  it('says whether it is in town, from the run itself, and never what it wants', () => {
    const run = newRun(4, TUNING);
    const first = caravanVisitAt(4, 0, TUNING)!;
    // The first placement it no longer stands at, found by walking the rule.
    const leaves = (v: typeof first): number => {
      let p = v.from;
      while (caravanVisitAt(4, p, TUNING)!.index === v.index) p++;
      return p;
    };
    for (const [placements, where] of [
      [0, 'coming'],
      [first.from, 'town'],
      [leaves(first), 'left'],
    ] as const) {
      const hud = toHudView({ ...run, placements }, s);
      expect(hud.caravan).toBe(where);
      const { container, unmount } = render(
        <CaravanAsk hud={hud} s={s} picking={false} onOpen={() => {}} />,
      );
      expect(container.textContent).toBe(s.caravan[where]);
      expect(container.textContent).not.toMatch(/\d/);
      unmount();
    }
  });

  it('is not there when the caravan is off', () => {
    const hud = toHudView(newRun(4, { ...TUNING, caravanEvery: 0 }), s);
    const { container } = render(<CaravanAsk hud={hud} s={s} picking={false} onOpen={() => {}} />);
    expect(container.textContent).toBe('');
  });

  it('becomes the way back to a ware that was put down', async () => {
    const run = newRun(4, TUNING);
    const owed: GameState = {
      ...run,
      caravan: { ...run.caravan, offers: [['placing', 'size', 'hand']], made: 1 },
    };
    let opened = 0;
    render(<CaravanAsk hud={toHudView(owed, s)} s={s} picking={false} onOpen={() => opened++} />);
    await userEvent.click(screen.getByRole('button', { name: s.caravan.open(1) }));
    expect(opened).toBe(1);
  });
});

describe('the caravan sells, and the pick reaches the run', () => {
  it('offers the three wares owed, and each tap moves the number that ware names', async () => {
    const run = newRun(4, TUNING);
    const owed: GameState = {
      ...run,
      caravan: { ...run.caravan, offers: [['placing', 'size', 'hand']], made: 1 },
    };
    const hud = toHudView(owed, s);
    const picks: number[] = [];
    render(
      <CaravanPicker
        offer={hud.offer!}
        waiting={hud.offersWaiting}
        s={s}
        onPick={(i) => picks.push(i)}
        onLater={() => {}}
      />,
    );
    for (const ware of ['placing', 'size', 'hand'] as const)
      await userEvent.click(screen.getByText(s.caravan.ware[ware].name));
    expect(picks).toEqual([0, 1, 2]);

    // Through the shell's own translation — `App.tsx`'s `onPick`.
    const took = picks.map((pick) => reduce(owed, { type: 'CARAVAN', pick }));
    expect(took[0]!.tuning.identityBonusRate).toBe(
      TUNING.identityBonusRate + CARAVAN_WARES.placing,
    );
    expect(took[1]!.tuning.harvestSizeBonus).toBeCloseTo(
      TUNING.harvestSizeBonus + CARAVAN_WARES.size,
      9,
    );
    expect(took[2]!.tuning.draftWidth).toBe(TUNING.draftWidth + 1);
    for (const t of took) expect(t.caravan.offers).toEqual([]);
  });

  it('can be put down, and says how many more are waiting', async () => {
    let later = 0;
    render(
      <CaravanPicker
        offer={['luck', 'forge', 'size']}
        waiting={3}
        s={s}
        onPick={() => {}}
        onLater={() => later++}
      />,
    );
    expect(screen.getByText(s.caravan.waiting(2))).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: s.caravan.later }));
    expect(later).toBe(1);
  });
});
