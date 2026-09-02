import { Fragment, type ReactNode } from 'react';
import type { LessonId } from '@view/lessons';
import { conceptPattern, conceptTerms, rarityPattern } from '@view/tips';
import type { Strings } from '@text/Strings';

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

export type ProseProps = {
  readonly text: string;
  readonly s: Strings;
  /** Opens the term card. Omitted where prose is decorative — a card's own
   *  body, say, whose terms would open a card over a card. */
  readonly onTerm?: ((id: LessonId) => void) | undefined;
};

export function Prose({ text, s, onTerm }: ProseProps) {
  return <>{inked(text, s, onTerm)}</>;
}

/** Prose that may be several lines — `\n` is how the core joins sentences. */
export function ProseLines({ text, s, onTerm }: ProseProps) {
  return (
    <>
      {text.split('\n').map((line, i) => (
        // The index is the identity: these are lines of one string, and there
        // is nothing else about a line to key on.
        <p key={i}>{inked(line, s, onTerm)}</p>
      ))}
    </>
  );
}

function inked(text: string, s: Strings, onTerm?: (id: LessonId) => void): ReactNode {
  const terms = conceptTerms(s);
  const byWord = new Map(terms.map((term) => [term.term.toLocaleUpperCase(), term]));

  // `split` with a capturing group puts the matches at the odd indices.
  return text.split(conceptPattern(s)).map((piece, i) => {
    const term = i % 2 === 1 ? byWord.get(piece.toLocaleUpperCase()) : undefined;
    if (term === undefined) return <Fragment key={i}>{rarityInked(piece, s, i)}</Fragment>;
    if (onTerm === undefined) {
      return (
        <span key={i} className={term.ink}>
          {piece}
        </span>
      );
    }
    return (
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
        onClick={() => onTerm(term.id)}
      >
        {piece}
      </button>
    );
  });
}

/** MAGIC and UNIQUE wear their own colours wherever the words appear, so the
 *  prose and the palette agree about what a rare thing is. */
function rarityInked(text: string, s: Strings, offset: number): ReactNode {
  return text.split(rarityPattern(s)).map((piece, i) => {
    if (i % 2 === 0) return <Fragment key={i}>{piece}</Fragment>;
    const magic = piece.toLocaleUpperCase() === s.lesson.rare.name.toLocaleUpperCase();
    return (
      <span key={`${offset}-${i}`} className={magic ? 'ink-magic' : 'ink-unique'}>
        {piece}
      </span>
    );
  });
}
