import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { stringsFor } from '@text/index';
import { LESSONS, lessonDefine, lessonName } from '@view/lessons';
import { resolveTheme } from '@theme/index';
import { TUNING } from '@content/tuning';
import { Prose, ProseLines } from './Prose';

/**
 * **One glossary across all of it.**
 *
 * Ashwake 1 inked concepts only inside the manual, so a term was a definition
 * on one screen and a plain word everywhere else. These tests pin the property
 * that replaces that: any prose rendered through `Prose` offers the same terms,
 * and the term a player taps is the one the core says it is.
 */

const s = stringsFor('en');
const fr = stringsFor('fr-CA');
const theme = resolveTheme('torchlit');

describe('prose', () => {
  it('makes a concept tappable, and reports which one', async () => {
    const onTerm = vi.fn();
    render(
      <Prose text="A tile RIPENS when it is touched on all six sides." s={s} onTerm={onTerm} />,
    );

    const term = screen.getByRole('button', { name: 'RIPENS' });
    await userEvent.click(term);

    expect(onTerm).toHaveBeenCalledTimes(1);
    // The id is the core's, not a string this component invented.
    expect(onTerm.mock.calls[0]?.[0]).toBe('ripe');
  });

  it('leaves prose alone where there is nothing to open', () => {
    // A card's own body has no term buttons: a term inside a card would open a
    // card over a card, which is a stack nobody asked for.
    render(<Prose text="A tile RIPENS when it is touched." s={s} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('RIPENS')).toBeInTheDocument();
  });

  it('finds a French term with an accent in it', () => {
    // `\b` is ASCII and would never have matched RÉSERVE — the bug Stage 1b
    // found. The core's pattern is Unicode-aware and this proves the component
    // is using it rather than a convenience of its own.
    const accented = fr.lesson.stash.terms.find((t) => /[À-Ý]/.test(t));
    expect(accented, 'the French glossary should carry an accented term').toBeDefined();
    render(<Prose text={`Une tuile ${accented!} ici.`} s={fr} onTerm={() => undefined} />);
    expect(screen.getByRole('button', { name: accented! })).toBeInTheDocument();
  });

  it('colours MAGIC and UNIQUE wherever the words appear', () => {
    render(<Prose text={`${s.lesson.rare.name} and ${s.lesson.rareUnique.name}.`} s={s} />);
    expect(screen.getByText(s.lesson.rare.name)).toHaveClass('ink-magic');
    expect(screen.getByText(s.lesson.rareUnique.name)).toHaveClass('ink-unique');
  });

  it('splits a multi-line answer into paragraphs', () => {
    const { container } = render(<ProseLines text={'First line.\nSecond line.'} s={s} />);
    expect(container.querySelectorAll('p')).toHaveLength(2);
  });

  it('offers every lesson term the core defines, in both languages', () => {
    // The invariant that makes the glossary complete rather than partial: if a
    // lesson names a term, prose containing that term must offer it.
    for (const strings of [s, fr]) {
      for (const lesson of LESSONS) {
        for (const term of strings.lesson[lesson.id].terms) {
          const { unmount } = render(
            <Prose text={`… ${term} …`} s={strings} onTerm={() => undefined} />,
          );
          expect(
            screen.queryByRole('button', { name: term }),
            `${strings.locale}: ${term} should be tappable`,
          ).not.toBeNull();
          unmount();
        }
      }
    }
  });

  it('opens the same definition the core would print', () => {
    // The trio's pin: what a tapped term shows is `lessonDefine`, not a
    // sentence this layer wrote.
    const ripe = LESSONS.find((l) => l.id === 'ripe')!;
    const body = lessonDefine(ripe, TUNING, theme, s);
    expect(body.length).toBeGreaterThan(0);
    expect(lessonName(ripe, s)).toBe(s.lesson.ripe.name);
  });
});
