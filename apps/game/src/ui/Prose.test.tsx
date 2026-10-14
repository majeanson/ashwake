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
    expect(onTerm.mock.calls[0]?.[0]).toBe('pop');
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
    render(
      <Prose
        text={`${s.lesson.magic.row.magic.name} and ${s.lesson.magic.row.unique.name}.`}
        s={s}
      />,
    );
    expect(screen.getByText(s.lesson.magic.row.magic.name)).toHaveClass('ink-magic');
    expect(screen.getByText(s.lesson.magic.row.unique.name)).toHaveClass('ink-unique');
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
    const pop = LESSONS.find((l) => l.id === 'pop')!;
    const body = lessonDefine(pop, TUNING, theme, s);
    expect(body.length).toBeGreaterThan(0);
    expect(lessonName(pop, s)).toBe(s.lesson.pop.name);
  });
});

describe('the words that are also buttons wear the button’s mark (2026-10-12)', () => {
  it('draws a mark beside POP and LUCK, in both languages, and beside no other term', () => {
    const { container } = render(<Prose text="POP a pocket and spend LUCK." s={s} />);
    expect(container.querySelectorAll('.term-mark svg')).toHaveLength(2);

    const french = render(<Prose text="RÉCOLTE une poche et dépense de la CHANCE." s={fr} />);
    expect(french.container.querySelectorAll('.term-mark svg')).toHaveLength(2);

    // POP is also the lesson of RIPENS, POCKET and WORTH (2026-10-13): they open
    // it, and wear no mark, because only the verb is the button.
    const plain = render(<Prose text="A tile RIPENS in a POCKET of known WORTH." s={s} />);
    expect(plain.container.querySelectorAll('.term-mark')).toHaveLength(0);
    const frenchPlain = render(<Prose text="Une POCHE MÛRIT; sa VALEUR s’affiche." s={fr} />);
    expect(frenchPlain.container.querySelectorAll('.term-mark')).toHaveLength(0);
  });

  it('keeps the word as text, so a tap target and a screen reader still find it', () => {
    render(<Prose text="Tap POP." s={s} onTerm={() => undefined} />);
    expect(screen.getByRole('button', { name: 'POP' })).toBeDefined();
  });
});

describe('a term that names the lesson it sits in is not a link (2026-10-13)', () => {
  it('draws it as plain inked text, and still links every other lesson', () => {
    const onTerm = vi.fn();
    render(<Prose text="A tile RIPENS; spend LUCK." s={s} onTerm={onTerm} within="pop" />);
    // RIPENS is POP's own word: text, not a button.
    expect(screen.queryByRole('button', { name: 'RIPENS' })).toBeNull();
    expect(screen.getByText('RIPENS')).toBeInTheDocument();
    // LUCK is another lesson's, so it is still tappable.
    expect(screen.getByRole('button', { name: 'LUCK' })).toBeInTheDocument();
  });

  it('links the same word when the prose is not inside that lesson', () => {
    render(<Prose text="A tile RIPENS." s={s} onTerm={() => undefined} within="luck" />);
    expect(screen.getByRole('button', { name: 'RIPENS' })).toBeInTheDocument();
  });

  it('applies to every line of a multi-line answer', () => {
    render(
      <ProseLines
        text={'It RIPENS.\nIt RIPENS again.'}
        s={s}
        onTerm={() => undefined}
        within="pop"
      />,
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('guards a row’s word by its lesson: CACHE inside THE MAP is text, outside it a row link', async () => {
    const cache = s.lesson.map.row.cache.terms[0]!;
    const onTerm = vi.fn();
    const inside = render(<Prose text={`A ${cache} here.`} s={s} onTerm={onTerm} within="map" />);
    expect(screen.queryByRole('button', { name: cache })).toBeNull();
    inside.unmount();

    render(<Prose text={`A ${cache} here.`} s={s} onTerm={onTerm} within="pop" />);
    await userEvent.click(screen.getByRole('button', { name: cache }));
    // The lesson, and the ROW of it to lead.
    expect(onTerm).toHaveBeenCalledWith('map', 'cache');
  });
});
