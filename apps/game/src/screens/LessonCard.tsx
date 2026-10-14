import { TUNING } from '@content/tuning';
import type { Theme } from '@theme/tokens';
import {
  cardDraws,
  lessonCardDefine,
  lessonDefine,
  lessonName,
  lessonOf,
  type LessonId,
  type RowKey,
} from '@view/lessons';
import type { Strings } from '@text/Strings';
import { Card } from '../ui/Card';
import { Figure } from '../ui/Figure';
import { ProseLines, type OnTerm } from '../ui/Prose';
import { TipRows } from '../ui/TipRows';

/**
 * One lesson, as a card (Stage 3, 2026-08-29).
 *
 * **This is the whole trio.** A teaching card fired by a moment and a term card
 * opened by tapping a word are the same component reading the same
 * `lessonDefine`, so the manual, the card and the glossary cannot say the same
 * thing three ways. Ashwake 1 kept them in step by hand; here there is nothing
 * to keep in step.
 *
 * **Its terms are buttons since 2026-10-13** (Marc's linking decision: if the
 * game names it, you can tap it). Until then a card's prose carried none, on
 * 2026-08-29's argument that a term inside a card opens a card over a card.
 * The stack is capped where the card is hosted (`App` holds ONE term slot, so
 * a tap replaces the card) and the term that names THIS lesson is plain text
 * (`Prose`'s `within`).
 *
 * **`firstContact` is the one thing the trio does not share** (2026-08-30). A
 * lesson may keep a sentence for the moment it is first met — RIPE's "tap it to
 * price its pocket, then choose", MAGIC's "spend it where many tiles touch" —
 * and that sentence is for the card the game FIRES, not for the card a player
 * opens by tapping a word they already know. Both were printing
 * `lessonDefine`, so the `card` weight had no reader in this body at all and
 * those four sentences were written, translated, tested and never shown.
 */

type LessonCardProps = {
  readonly id: LessonId;
  readonly theme: Theme;
  readonly s: Strings;
  readonly dismiss: string;
  readonly onDismiss: () => void;
  /** Fired BY a moment rather than opened by a tap: it adds the lesson's
   *  first-contact sentence, where the lesson keeps one. */
  readonly firstContact?: boolean | undefined;
  /** The row of the lesson to lead, where it has rows and one was asked about:
   *  a chip for CACHE, a tap on a cache, a destination just found. */
  readonly row?: RowKey | undefined;
  /** A tapped term in the body or the rows. */
  readonly onTerm: OnTerm;
  /** HOW TO PLAY ›: close this card and open the manual at this lesson (at the
   *  row it was opened at, where it has one). */
  readonly onManual: () => void;
};

export function LessonCard({
  id,
  theme,
  s,
  dismiss,
  onDismiss,
  firstContact,
  row,
  onTerm,
  onManual,
}: LessonCardProps) {
  const lesson = lessonOf(id);
  if (lesson === undefined) return null;
  const draws = cardDraws(lesson, row);

  return (
    <Card
      id={`lesson-${id}`}
      icon={lesson.icon}
      name={lessonName(lesson, s)}
      ink={lesson.ink}
      dismiss={dismiss}
      onDismiss={onDismiss}
      manual={{ label: s.ui.howToPlay, onOpen: onManual }}
    >
      <ProseLines
        text={
          firstContact === true
            ? lessonCardDefine(lesson, TUNING, theme, s)
            : lessonDefine(lesson, TUNING, theme, s)
        }
        s={s}
        onTerm={onTerm}
        within={id}
      />
      {draws === 'figure' && lesson.figure !== undefined && (
        <Figure id={lesson.figure} theme={theme} s={s} />
      )}
      {draws === 'rows' && lesson.rows !== undefined && (
        <TipRows
          rows={lesson.rows(TUNING, theme, s)}
          theme={theme}
          s={s}
          lead={row}
          onTerm={onTerm}
          within={id}
        />
      )}
    </Card>
  );
}
