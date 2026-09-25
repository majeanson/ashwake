import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { pickLocale } from '@content/locale';
import { fmt1, stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { createSession } from '../shell/store';
import { walk } from '../shell/walk';
import { harvestValue, ripeClusters, scoreOf } from '@engine/rules';
import { priceRows } from '@view/view';
import { LensPanel } from './LensPanel';

/**
 * The lens panel prints the numbers the view computes, and a row holds the
 * lens (2026-09-16). The numbers themselves are `view.test.ts`'s; this is the
 * screen: four rows, a total that is the sum of the rows, and a press that
 * names the ground it was on.
 */

const s = stringsFor(pickLocale(['en']));
const theme = resolveTheme(null);

function board() {
  const sess = createSession({ seed: 7, theme, strings: s });
  walk(sess, 14);
  return sess;
}

describe('the lens panel', () => {
  it('prints one row per ground and a total that is their sum', () => {
    const sess = board();
    const hud = sess.get().hud;
    render(
      <LensPanel
        hud={hud}
        tuning={sess.get().state.tuning}
        theme={theme}
        s={s}
        onHold={() => {}}
      />,
    );
    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(4);
    const sum = hud.colours.reduce((n, c) => n + c.worth, 0);
    expect(screen.getByText(s.ui.lensPanel.worth(sum))).toBeTruthy();
    // A walked board has something standing, or the panel is testing nothing.
    expect(sum).toBeGreaterThan(0);
  });

  it('holds the lens on the ground that was pressed, and shows which is held', () => {
    const sess = board();
    const onHold = vi.fn();
    const { rerender } = render(
      <LensPanel
        hud={sess.get().hud}
        tuning={sess.get().state.tuning}
        theme={theme}
        s={s}
        onHold={onHold}
      />,
    );
    fireEvent.click(screen.getAllByRole('button')[2]!);
    expect(onHold).toHaveBeenCalledWith('red');

    // The shell writes the spotlight; the panel reads it back as the pressed row.
    sess.spotlight('red');
    rerender(
      <LensPanel
        hud={sess.get().hud}
        tuning={sess.get().state.tuning}
        theme={theme}
        s={s}
        onHold={onHold}
      />,
    );
    const pressed = screen.getAllByRole('button').map((b) => b.getAttribute('aria-pressed'));
    expect(pressed).toEqual(['false', 'false', 'true', 'false']);
  });

  it('says when nothing of a ground is ripe rather than printing a zero', () => {
    const sess = createSession({ seed: 7, theme, strings: s });
    // An opening board: nothing ripe anywhere.
    render(
      <LensPanel
        hud={sess.get().hud}
        tuning={sess.get().state.tuning}
        theme={theme}
        s={s}
        onHold={() => {}}
      />,
    );
    expect(screen.getAllByText(new RegExp(s.ui.lensPanel.ripeNone))).toHaveLength(4);
  });

  /*
   * THE HELD GROUND, IN DETAIL (2026-09-24, Marc: "on lens color click, add
   * the most detail you can, keep things comprehensible"). Only the held row
   * opens, it leads with the ground's own power sentence, and its lines are
   * the view's facts in the catalogue's words.
   */
  it('opens the held ground, and only that one, into its detail', () => {
    const sess = board();
    sess.spotlight('red');
    const hud = sess.get().hud;
    const { container } = render(
      <LensPanel
        hud={hud}
        tuning={sess.get().state.tuning}
        theme={theme}
        s={s}
        onHold={() => {}}
      />,
    );
    const open = container.querySelectorAll('[data-lens-detail]');
    expect(open).toHaveLength(1);
    expect(open[0]!.getAttribute('data-lens-detail')).toBe('red');

    const red = hud.colours.find((c) => c.colour === 'red')!;
    const text = open[0]!.textContent ?? '';
    expect(text).toContain(s.ui.lensPanel.rows.inHand);
    if (red.count > 0) expect(text).toContain(fmt1(red.worth / red.count, s.locale));
    if (red.best !== null)
      expect(text).toContain(s.ui.lensPanel.best(red.best.count, red.best.paid));
  });

  it('finds a ripe pocket on a walked board, and prices the best of it', () => {
    const sess = board();
    const hud = sess.get().hud;
    const ripeGround = hud.colours.find((c) => c.best !== null);
    // A walked board has a ripe pocket somewhere, or this proves nothing.
    expect(ripeGround, 'nothing ripe on the walked board').toBeDefined();
    expect(ripeGround!.pockets).toBeGreaterThan(0);
    expect(ripeGround!.best!.count).toBeGreaterThan(0);
    // The table's terms are the price's own (Marc: the pop's arithmetic 'as a
    // table'), so they add up to the raw points — and the table ends at what
    // POP PAYS, which is the per-pop scaling of those (the row the first
    // table was missing: it said 17 beside a POP button saying 5).
    const b = ripeGround!.best!;
    expect(
      Math.floor((b.worth * b.sizeBonus * b.multiplier + b.placing + b.jackpot) * b.bounty + 1e-9),
    ).toBe(b.points);
    const state = sess.get().state;
    expect(b.paid).toBe(scoreOf(b.points, state.tuning));
    const rows = priceRows(b, state.tuning, s);
    expect(rows.at(-1)?.value).toBe(s.ui.lensPanel.equals(b.paid));
  });
});

/*
 * A POCKET IS EVERY RIPE TILE JOINED TO ANOTHER, WHATEVER ITS COLOUR (the
 * 2026-09-24 review). The first build counted a mixed pocket under each of its
 * colours by walking clusters per colour, and priced only as far as it walked.
 * The count per ground must be the engine's own pockets that hold that ground,
 * and the best must be one of those pockets, whole.
 */
describe('a ground and its pockets', () => {
  it('counts the pockets it is in, and prices the best of them whole', () => {
    const sess = board();
    const state = sess.get().state;
    const clusters = ripeClusters(state.cells);
    expect(clusters.length, 'nothing ripe on the walked board').toBeGreaterThan(0);
    for (const c of sess.get().hud.colours) {
      const holding = clusters.filter((keys) =>
        keys.some((k) => {
          const cell = state.cells[k];
          return cell?.kind === 'tile' && cell.colour === c.colour;
        }),
      );
      expect(c.pockets, `${c.colour}: pockets`).toBe(holding.length);
      if (holding.length === 0) {
        expect(c.best).toBeNull();
        continue;
      }
      const prices = holding.map((keys) => harvestValue(state, keys[0]));
      const top = Math.max(...prices.map((v) => v.points));
      expect(c.best?.points, `${c.colour}: best points`).toBe(top);
      expect(prices.some((v) => v.count === c.best?.count && v.points === top)).toBe(true);
    }
  });
});
