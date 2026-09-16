import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { createSession } from '../shell/store';
import { walk } from '../shell/walk';
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
    render(<LensPanel hud={hud} theme={theme} s={s} onHold={() => {}} />);
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
      <LensPanel hud={sess.get().hud} theme={theme} s={s} onHold={onHold} />,
    );
    fireEvent.click(screen.getAllByRole('button')[2]!);
    expect(onHold).toHaveBeenCalledWith('red');

    // The shell writes the spotlight; the panel reads it back as the pressed row.
    sess.spotlight('red');
    rerender(<LensPanel hud={sess.get().hud} theme={theme} s={s} onHold={onHold} />);
    const pressed = screen.getAllByRole('button').map((b) => b.getAttribute('aria-pressed'));
    expect(pressed).toEqual(['false', 'false', 'true', 'false']);
  });

  it('says when nothing of a ground is ripe rather than printing a zero', () => {
    const sess = createSession({ seed: 7, theme, strings: s });
    // An opening board: nothing ripe anywhere.
    render(<LensPanel hud={sess.get().hud} theme={theme} s={s} onHold={() => {}} />);
    expect(screen.getAllByText(new RegExp(s.ui.lensPanel.ripeNone))).toHaveLength(4);
  });
});
