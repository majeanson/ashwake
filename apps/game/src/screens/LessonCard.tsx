import { TUNING } from '@content/tuning';
import type { Theme } from '@theme/tokens';
import { lessonDefine, lessonName, lessonOf, type LessonId } from '@view/lessons';
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
 */

export type LessonCardProps = {
  readonly id: LessonId;
  readonly theme: Theme;
  readonly s: Strings;
  readonly dismiss: string;
  readonly onDismiss: () => void;
};

export function LessonCard({ id, theme, s, dismiss, onDismiss }: LessonCardProps) {
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
      <ProseLines text={lessonDefine(lesson, TUNING, theme, s)} s={s} />
      {lesson.figure !== undefined && <Figure id={lesson.figure} theme={theme} s={s} />}
      {lesson.rows !== undefined && (
        <TipRows rows={lesson.rows(TUNING, theme, s)} theme={theme} s={s} />
      )}
    </Card>
  );
}
