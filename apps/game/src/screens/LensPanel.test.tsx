import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { pickLocale } from '@content/locale';
import { fmt1, stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { createSession } from '../shell/store';
import { walk } from '../shell/walk';
import { harvestValue, ripeClusters, scoreOf } from '@engine/rules';
import { colourLesson, priceRows } from '@view/view';
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
    // Focused on one (Marc, 2026-09-25: 'remove other colors when were
    // focused on one'): only the held ground's row is left, pressed.
    const rows = screen.getAllByRole('button').filter((b) => b.hasAttribute('data-lens-row'));
    expect(rows.map((b) => b.getAttribute('data-lens-row'))).toEqual(['red']);
    expect(rows[0]!.getAttribute('aria-pressed')).toBe('true');
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

/*
 * THE HELD GROUND EXPLAINS ITSELF (Marc, 2026-09-25: "i wanted you to remove
 * only the expand button + most of the text info inside but not the points
 * detail", and "hints on each so we can learn more about the calculation").
 * The ground's power sentence is up, the price table is up even with nothing
 * ripe, and every row opens its own hint on a tap, one at a time.
 */
describe('a held ground, explained', () => {
  it('shows the ground first, and the price on its own tab', () => {
    const sess = board();
    sess.spotlight('red');
    const { container } = panelFor(sess);
    expect(container.querySelector('[data-lens-stats="red"]')).not.toBeNull();
    expect(container.querySelector('[data-lens-sum="red"]')).toBeNull();
    fireEvent.click(container.querySelector('[data-tab="price"]')!);
    expect(container.querySelector('[data-lens-stats="red"]')).toBeNull();
    expect(container.querySelector('[data-lens-sum="red"]')).not.toBeNull();
    expect(container.querySelector('[role="tabpanel"]')?.id).toBe('lens-tabpanel-price');
    expect(container.querySelector('[data-tab="price"]')?.getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(container.querySelector('[data-tab="ground"]')?.getAttribute('aria-selected')).toBe(
      'false',
    );
  });

  const panelFor = (sess: ReturnType<typeof createSession>) =>
    render(
      <LensPanel
        hud={sess.get().hud}
        tuning={sess.get().state.tuning}
        theme={theme}
        s={s}
        onHold={() => {}}
      />,
    );

  it("leads with the ground's power, in words", () => {
    const sess = board();
    sess.spotlight('green');
    const { container } = panelFor(sess);
    const rule = colourLesson('green', sess.get().state.tuning, theme, s);
    expect(rule, 'green has no power sentence at this tuning').not.toBeNull();
    expect(container.querySelector('.lens-rule')?.textContent).toBe(rule);
  });

  it('shows the price table with nothing ripe, its terms unknown', () => {
    const sess = createSession({ seed: 7, theme, strings: s });
    walk(sess, 2);
    const hud0 = sess.get().hud;
    const bare = hud0.colours.find((c) => c.best === null && c.count > 0);
    expect(bare, 'no placed, unripe ground on the opening board').toBeDefined();
    sess.spotlight(bare!.colour);
    const { container } = panelFor(sess);
    expect(sess.get().hud.showPoints, 'this board hides its points').toBe(true);
    // The price is the second of the held ground's two tabs.
    fireEvent.click(container.querySelector('[data-tab="price"]')!);
    expect(container.textContent).toContain(s.ui.lensPanel.sum.none);
    const table = container.querySelector(`[data-lens-sum="${bare!.colour}"]`);
    expect(table, 'no price table with nothing ripe').not.toBeNull();
    const values = [...table!.querySelectorAll('.tip-value')].map((v) => v.textContent);
    expect(values.at(-1)).toBe(s.ui.lensPanel.sum.unknown);
    expect(values[0]).toBe(s.ui.lensPanel.sum.unknown);
  });

  it('opens one hint at a time, under the row that was tapped', () => {
    const sess = board();
    sess.spotlight('red');
    const { container } = panelFor(sess);
    const rows = [...container.querySelectorAll<HTMLButtonElement>('.tip-hinted')];
    // The ground tab's stat rows, every one hinted.
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(container.querySelectorAll('.tip-hint')).toHaveLength(0);

    fireEvent.click(rows[0]!);
    expect(rows[0]!.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelectorAll('.tip-hint')).toHaveLength(1);

    // Another row in the same table takes over; the same row again closes it.
    fireEvent.click(rows[1]!);
    expect(rows[0]!.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelectorAll('.tip-hint')).toHaveLength(1);
    fireEvent.click(rows[1]!);
    expect(container.querySelectorAll('.tip-hint')).toHaveLength(0);

    // And the ✕ on an open hint closes it (Marc, 2026-09-25: "add a small X
    // to remove hint too").
    fireEvent.click(rows[2]!);
    expect(container.querySelectorAll('.tip-hint')).toHaveLength(1);
    fireEvent.click(container.querySelector('.tip-hint-close')!);
    expect(container.querySelectorAll('.tip-hint')).toHaveLength(0);
    expect(rows[2]!.getAttribute('aria-expanded')).toBe('false');
  });
});
