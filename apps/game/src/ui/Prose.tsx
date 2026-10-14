import { Fragment, type ReactNode } from 'react';
import type { LessonId, RowKey } from '@view/lessons';
import { conceptPattern, conceptTerms, rarityPattern } from '@view/tips';
import type { Strings } from '@text/Strings';
import { CONCEPT_ICON, type IconName } from '@theme/icons';
import { Icon } from './Icon';

/**
 * THE WORDS THAT ARE ALSO BUTTONS wear their mark in a sentence (2026-10-12,
 * Marc: _"when talking about luck or pop, use the same symbols as the
 * button"_). POP and LUCK are the two ideas a stranger meets as a mark first —
 * on the cluster — and as a word in the very next card; the same shape in both
 * places is how the word and the button become one thing. Only these two: the
 * registry's own rule is a mark for an idea that recurs, and these recur.
 */
const TERM_MARK: Partial<Record<LessonId, IconName>> = {
  pop: CONCEPT_ICON.pop,
  luck: CONCEPT_ICON.luck,
};

/**
 * POP is also the lesson of POCKET, WORTH and RIPENS (2026-10-13), and only the
 * verb is the button: those three open the same lesson and wear no mark.
 */
const wearsMark = (id: LessonId, term: string, s: Strings): boolean =>
  id !== 'pop' || s.lesson.pop.verb.includes(term.toLocaleUpperCase(s.locale));

/**
 * What a tapped term does: the lesson it opens, and the row of it to lead where
 * the word is a row's own (CACHE opens THE MAP at the cache row, 2026-10-13).
 */
export type OnTerm = (id: LessonId, row?: RowKey) => void;

/** The mark and the word, held together so a line never breaks between them. */
function Marked({
  id,
  worn,
  children,
}: {
  readonly id: LessonId;
  readonly worn: boolean;
  readonly children: ReactNode;
}) {
  const mark = TERM_MARK[id];
  if (mark === undefined || !worn) return <>{children}</>;
  return (
    <span className="term-marked">
      <span className="term-mark">
        <Icon name={mark} />
      </span>
      {children}
    </span>
  );
}

/**
 * Every sentence the game says, with its terms tappable (Stage 3, 2026-08-29).
 *
 * **This is the whole of "one glossary across all of it".** Ashwake 1 inked
 * concepts only inside the manual, so RIPE was a definition you could open on
 * one screen and a plain word on every other — the same sentence meaning two
 * different things depending on where you read it. Here every piece of prose
 * goes through this component, so a term is tappable in a teaching card, on
 * the end screen, in the shop and in settings, and the definition it opens is
 * the same `lessonDefine` in all of them.
 *
 * Two passes over one string, and the order matters. Concepts first, because
 * they are the tappable ones and the pattern is longest-first so RARE TILES
 * wins over RARE. Rarity second, over the pieces that are left, because MAGIC
 * and UNIQUE are COLOURED rather than tappable — the words are the palette
 * saying the same thing the star does.
 *
 * The patterns are the core's (`view/tips.ts`), memoised per locale there, and
 * their boundary is Unicode-aware: `\b` is ASCII and would never have matched
 * RÉSERVE, which is the bug Stage 1b found the hard way.
 */

type ProseProps = {
  readonly text: string;
  readonly s: Strings;
  /** Opens the term. Omitted only where prose is decorative; a card's body and
   *  the manual's sections carry one since 2026-10-13. */
  readonly onTerm?: OnTerm | undefined;
  /**
   * THE LESSON THIS PROSE IS PART OF (2026-10-13, Marc's linking decision). A
   * term that resolves to it is drawn as plain inked text, not a button: a card
   * for POP should not offer a button that opens POP, and neither should POP's
   * own section of the manual. Decided here, once, so no screen has to remember.
   */
  readonly within?: LessonId | undefined;
};

export function Prose({ text, s, onTerm, within }: ProseProps) {
  return <>{inked(text, s, onTerm, within)}</>;
}

/** Prose that may be several lines — `\n` is how the core joins sentences. */
export function ProseLines({ text, s, onTerm, within }: ProseProps) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        // The index is the identity: these are lines of one string, and there
        // is nothing else about a line to key on.
        <p key={i}>{inked(line, s, onTerm, within)}</p>
      ))}
    </>
  );
}

function inked(text: string, s: Strings, onTerm?: OnTerm, within?: LessonId): ReactNode {
  const terms = conceptTerms(s);
  const byWord = new Map(terms.map((term) => [term.term.toLocaleUpperCase(), term]));

  // `split` with a capturing group puts the matches at the odd indices.
  return text.split(conceptPattern(s)).map((piece, i) => {
    const term = i % 2 === 1 ? byWord.get(piece.toLocaleUpperCase()) : undefined;
    if (term === undefined) return <Fragment key={i}>{rarityInked(piece, s, i)}</Fragment>;
    if (onTerm === undefined || term.id === within) {
      return (
        <Marked key={i} id={term.id} worn={wearsMark(term.id, piece, s)}>
          <span className={term.ink}>{piece}</span>
        </Marked>
      );
    }
    return (
      <Marked key={i} id={term.id} worn={wearsMark(term.id, piece, s)}>
        <button
          key={i}
          type="button"
          className={['term', term.ink].filter(Boolean).join(' ')}
          /*
           * BELOW THE 44px FLOOR ON PURPOSE, and now saying so (2026-09-02).
           *
           * A term is a WORD INSIDE A SENTENCE. It is the size of the word, and
           * it cannot be anything else: padding it to a tap target would push
           * the lines of every paragraph in the manual apart around whichever
           * words happen to be glossary entries, which is a worse reading
           * experience for everyone in exchange for an easier tap on something
           * that only ever opens an explanation.
           *
           * `.stat` is the other exemption in this build and it declares itself
           * (`screens/Hud`). This one did not, so it was the one undeclared
           * sub-44px control in the app — sixty-odd rows a run in the audit's
           * unhandled column, drowning the ones that need deciding. The claim is
           * the same claim, made in the same attribute, which is what stops two
           * checks disagreeing about who is allowed to be small.
           */
          data-audit-compact=""
          onClick={() => onTerm(term.id, term.row)}
        >
          {piece}
        </button>
      </Marked>
    );
  });
}

/** MAGIC and UNIQUE wear their own colours wherever the words appear, so the
 *  prose and the palette agree about what a rare thing is. */
function rarityInked(text: string, s: Strings, offset: number): ReactNode {
  return text.split(rarityPattern(s)).map((piece, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{piece}</Fragment>;
    const magic = piece.toLocaleUpperCase() === s.lesson.magic.row.magic.name.toLocaleUpperCase();
    return (
      <span key={`${offset}-${i}`} className={magic ? 'ink-magic' : 'ink-unique'}>
        {piece}
      </span>
    );
  });
}
