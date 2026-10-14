import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { LessonCard } from './LessonCard';
import { manualPrints } from './Manual';

/**
 * HOW TO PLAY › on a lesson card (2026-10-13), and the one place it must not be
 * offered: a term tapped before its moment has been told, whose section the
 * manual does not print yet. The link there opened the book on its first tab
 * and showed nothing for the tap.
 */

const s = stringsFor(pickLocale(['en']));
const theme = resolveTheme(null);

const lesson = (onManual?: () => void) =>
  render(
    <LessonCard
      id="magic"
      theme={theme}
      s={s}
      dismiss="GOT IT"
      onDismiss={() => {}}
      onTerm={() => {}}
      {...(onManual === undefined ? {} : { onManual })}
    />,
  );

describe('a lesson card', () => {
  it('offers HOW TO PLAY › when it is given a way to the book, and uses it', async () => {
    const onManual = vi.fn();
    lesson(onManual);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(s.ui.howToPlay) }));
    expect(onManual).toHaveBeenCalledTimes(1);
  });

  it('offers no link where there is no section to arrive at', () => {
    lesson();
    expect(document.querySelector('[data-action="card-manual"]')).toBeNull();
  });
});

describe('what the manual prints', () => {
  it('prints a lesson once a moment that tells it has been met, and not before', () => {
    // MAGIC is told by `rare` (and `rareUnique`); a stranger has met neither.
    expect(manualPrints('magic', [])).toBe(false);
    expect(manualPrints('magic', ['rare'])).toBe(true);
  });

  it('prints a lesson no moment ever gates, for anyone', () => {
    expect(manualPrints('expedition', [])).toBe(true);
  });
});
