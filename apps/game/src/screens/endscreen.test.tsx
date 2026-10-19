import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { pickLocale } from '@content/locale';
import { EMPTY_PROGRESS } from '@meta/progress';
import { newWorld } from '@meta/world';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { createSession } from '../shell/store';
import { walk } from '../shell/walk';
import { EndScreen } from './EndScreen';

/**
 * THE TUTORIAL A DAILY LINK SENT THE PLAYER TO (2026-10-19, Marc: _"a button
 * to go back to the daily and a clear indication that the tutorial is done, no
 * relics screen at all"_; _"relics will belong in WORLD mode only"_).
 */

const s = stringsFor(pickLocale(['en']));
const theme = resolveTheme(null);

const ending = (learned?: { day: string; onBack: () => void }) => {
  const session = createSession({ seed: 7, theme, strings: s });
  walk(session, 12);
  const hud = { ...session.get().hud, relics: 5 };
  return render(
    <EndScreen
      hud={hud}
      harvests={[]}
      s={s}
      theme={theme}
      progress={EMPTY_PROGRESS}
      onNewRun={() => {}}
      onTerm={() => {}}
      onProgress={() => {}}
      onMore={() => {}}
      onShare={() => Promise.resolve('copied')}
      goals={[]}
      onWalk={() => {}}
      world={newWorld(7)}
      onMainMenu={() => {}}
      tour
      learned={learned}
    />,
  );
};

describe('the tutorial a daily link sent the player to', () => {
  it('says it is done, offers that daily first, and shows nothing of relics', () => {
    const onBack = vi.fn();
    const { container } = ending({ day: 'OCT 19', onBack });
    expect(screen.getByText(s.ui.ending.tutorialDone)).toBeInTheDocument();
    const back = container.querySelector('[data-action="back-to-daily"]')!;
    expect(back.textContent).toBe(s.ui.beginDaily('OCT 19'));
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalledOnce();
    // NEW RUN stays, as the quieter second door.
    expect(container.querySelector('[data-action="new-run"]')?.className).toBe('door-daily');
    expect(container.querySelector('[data-hud="banked"]')).toBeNull();
    expect(container.querySelector('[data-end="shop"]')).toBeNull();
    expect(container.querySelector('[data-end-cue]')).toBeNull();
  });

  it('is an ordinary first ending otherwise, relics and shop included', () => {
    const { container } = ending();
    expect(screen.queryByText(s.ui.ending.tutorialDone)).toBeNull();
    expect(container.querySelector('[data-action="back-to-daily"]')).toBeNull();
    expect(container.querySelector('[data-hud="banked"]')).not.toBeNull();
    expect(container.querySelector('[data-end="shop"]')).not.toBeNull();
  });
});
