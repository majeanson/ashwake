import { TUNING } from '@content/tuning';
import type { Theme } from '@theme/tokens';
import { lessonCardDefine, lessonDefine, lessonName, lessonOf, type LessonId } from '@view/lessons';
import type { Strings } from '@text/Strings';
import { Card } from '../ui/Card';
import { Figure } from '../ui/Figure';
import { ProseLines } from '../ui/Prose';
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
 * Its own prose carries no term buttons: a term inside a card would open a card
 * over a card, which is a stack nobody asked for.
 *
 * **`firstContact` is the one thing the trio does not share** (2026-08-30). A
 * lesson may keep a sentence for the moment it is first met — RIPE's "tap it to
 * price its pocket, then choose", MAGIC's "spend it where many tiles touch" —
 * and that sentence is for the card the game FIRES, not for the card a player
 * opens by tapping a word they already know. Both were printing
 * `lessonDefine`, so the `card` weight had no reader in this body at all and
 * those four sentences were written, translated, tested and never shown.
 */

export type LessonCardProps = {
  readonly id: LessonId;
  readonly theme: Theme;
  readonly s: Strings;
  readonly dismiss: string;
  readonly onDismiss: () => void;
  /** Fired BY a moment rather than opened by a tap: it adds the lesson's
   *  first-contact sentence, where the lesson keeps one. */
  readonly firstContact?: boolean | undefined;
};

export function LessonCard({ id, theme, s, dismiss, onDismiss, firstContact }: LessonCardProps) {
  const lesson = lessonOf(id);
  if (lesson === undefined) return null;

  // A lesson carries a figure OR rows, never both — `lessons.test.ts` says so,
  // which is why this reads as two independent optionals rather than a choice.
  return (
    <Card
      id={`lesson-${id}`}
      glyph={lesson.glyph}
      name={lessonName(lesson, s)}
      ink={lesson.ink}
      dismiss={dismiss}
      onDismiss={onDismiss}
    >
      <ProseLines
        text={
          firstContact === true
            ? lessonCardDefine(lesson, TUNING, theme, s)
            : lessonDefine(lesson, TUNING, theme, s)
        }
        s={s}
      />
      {lesson.figure !== undefined && <Figure id={lesson.figure} theme={theme} s={s} />}
      {lesson.rows !== undefined && (
        <TipRows rows={lesson.rows(TUNING, theme, s)} theme={theme} s={s} />
      )}
    </Card>
  );
}
