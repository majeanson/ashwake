import { useState } from 'react';
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
  /** A NEW chip's card: the concept was already told, so THE MAP's opening
   *  page is left out and the card opens straight on its row. */
  readonly skipIntro?: boolean | undefined;
  /** The row of the lesson to lead, where it has rows and one was asked about:
   *  a chip for CACHE, a tap on a cache, a destination just found. */
  readonly row?: RowKey | undefined;
  /** A tapped term in the body or the rows. */
  readonly onTerm: OnTerm;
  /** HOW TO PLAY ›: close this card and open the manual at this lesson (at the
   *  row it was opened at, where it has one). Absent where the manual does not
   *  print the lesson yet, so there is no link to a section that is not there. */
  readonly onManual?: (() => void) | undefined;
};

export function LessonCard({
  id,
  theme,
  s,
  dismiss,
  onDismiss,
  firstContact,
  skipIntro,
  row,
  onTerm,
  onManual,
}: LessonCardProps) {
  // The page belongs to the card it was turned on: a term that replaces this
  // card (one slot) starts again at its first page.
  const cardKey = `${id}/${row ?? ''}`;
  const [turned, setTurned] = useState({ cardKey, page: 0 });
  const page = turned.cardKey === cardKey ? turned.page : 0;
  const setPage = (next: number): void => setTurned({ cardKey, page: next });
  const lesson = lessonOf(id);
  if (lesson === undefined) return null;

  /*
   * THE MAP IS ONE CARD PER THING, AND A THING WITH DEPTH GETS MORE THAN ONE
   * (2026-10-16, Marc: split every kind of thing on the map across cards, one
   * card was too big). Opened at a row, THE MAP prints that row alone, not the
   * six, and its `lines` (the site's bounty, the territory's native ground)
   * follow as pages of their own. A concept card that is FIRED leads with the
   * lesson's words, as a page, so the row is not stacked under them.
   */
  if (id === 'map' && row !== undefined && lesson.rows !== undefined) {
    const own = lesson.rows(TUNING, theme, s).find((r) => r.key === row);
    if (own !== undefined) {
      const intro = firstContact === true && !skipIntro;
      // ONE PAGE WHEN FIRED (2026-10-23, a stranger's review: THE MAP was two
      // pages mid-run, SITE then BOUNTY). The concept's own words when this is
      // the first card of the family, the row alone after it; the bounty and the
      // native-ground pages stay for a tapped chip and the manual.
      const pages = [
        ...(intro ? [{ text: lessonCardDefine(lesson, TUNING, theme, s), row: null }] : []),
        ...(intro ? [] : [{ text: null, row: own }]),
        ...(firstContact === true ? [] : (own.lines ?? [])).map((line) => ({
          text: null,
          row: {
            ...own,
            ...((line.head ?? own.name) === undefined ? {} : { name: line.head ?? own.name }),
            text: line.text,
          },
        })),
      ];
      const at = Math.min(page, pages.length - 1);
      const last = at === pages.length - 1;
      const shown = pages[at]!;
      return (
        <Card
          id={`lesson-${id}`}
          icon={lesson.icon}
          name={lessonName(lesson, s)}
          ink={lesson.ink}
          dismiss={last ? dismiss : s.ui.cardNext}
          onDismiss={last ? onDismiss : () => setPage(at + 1)}
          manual={onManual === undefined ? undefined : { label: s.ui.howToPlay, onOpen: onManual }}
        >
          {shown.row === null ? (
            <ProseLines text={shown.text ?? ''} s={s} onTerm={onTerm} within={id} />
          ) : (
            <TipRows rows={[shown.row]} theme={theme} s={s} onTerm={onTerm} within={id} />
          )}
        </Card>
      );
    }
  }
  const draws = cardDraws(lesson, row);

  return (
    <Card
      id={`lesson-${id}`}
      icon={lesson.icon}
      name={lessonName(lesson, s)}
      ink={lesson.ink}
      dismiss={dismiss}
      onDismiss={onDismiss}
      manual={onManual === undefined ? undefined : { label: s.ui.howToPlay, onOpen: onManual }}
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
