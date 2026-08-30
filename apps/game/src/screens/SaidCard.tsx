import { CONCEPT_MARK, LANDMARK_GLYPH, TILE_GLYPH, type Theme } from '@theme/tokens';
import type { TipRow } from '@view/view';
import type { LessonId } from '@view/lessons';
import type { Strings } from '@text/Strings';
import { Card } from '../ui/Card';
import { Confirming } from '../ui/Confirming';
import { ProseLines } from '../ui/Prose';
import { TipRows } from '../ui/TipRows';

/**
 * A receipt that holds the screen (Stage 4, 2026-08-29).
 *
 * What the game says when a rare claim lands — a find, a shrine, a territory.
 * The words are `view/receipts.ts`'s and the shape is `Card`'s; this only
 * decides that a claim's first line is its HEADING and the rest is its body,
 * which is how every receipt in Ashwake 1 was written.
 *
 * Deliberately not `LessonCard`. A lesson is keyed on a `LessonId` and looks
 * its own text up; a receipt is a thing that just happened and arrives with
 * its sentences already written. Making one component serve both would mean
 * inventing a lesson id for every claim, which is a registry entry standing in
 * for a fact.
 */

/**
 * Every mark a receipt may lead with.
 *
 * A CLAIM's first line is `{glyph}  {HEADING}` — `receipts.ts` prefixes the
 * mark itself, from `LANDMARK_GLYPH`, precisely so the words and the thing
 * that paid are one object. A POP's is not: `harvestNote` opens with
 * "POPPED 5, total worth 12", and the first pop of a device opens with "YOUR
 * FIRST POP".
 *
 * Splitting on whitespace and calling the first token a glyph therefore drew
 * "POPPED" and "YOUR" in the 1.3em glyph face and left "5, total worth 12" as
 * the heading — on the two cards a player sees most, and on the very first one
 * they ever see. Found 2026-08-30 while making a pop's card brief.
 *
 * So the first token is a glyph only when it IS one, and the registries are
 * the authority on that. A lead with no mark keeps its whole first line.
 */
const MARKS = new Set<string>([
  ...Object.values(LANDMARK_GLYPH),
  ...Object.values(CONCEPT_MARK),
  TILE_GLYPH,
]);

export type SaidCardProps = {
  readonly text: string;
  readonly rows?: readonly TipRow[] | undefined;
  readonly theme: Theme;
  readonly s: Strings;
  readonly onDismiss: () => void;
  readonly onTerm: (id: LessonId) => void;
  /**
   * An offer the receipt makes. Only the crossing has one, and it is a
   * two-tap arm because it forgets a world — the dismiss button becomes STAY
   * rather than GOT IT, so the two choices read as a choice.
   */
  readonly offer?:
    { readonly label: string; readonly armed: string; readonly onTake: () => void } | undefined;
  /**
   * A receipt for something the player has already seen the card for once —
   * a pop after their first. Goes on its own, and any tap sends it away.
   */
  readonly brief?: boolean | undefined;
};

export function SaidCard({ text, rows, theme, s, onDismiss, onTerm, offer, brief }: SaidCardProps) {
  // The glyph and the heading are the receipt's own first line — `receipts.ts`
  // writes `{glyph}  {HEADING}` and the body under it. Split rather than
  // passed separately, so there is one place the sentence is composed and one
  // place it is taken apart.
  const [lead = '', ...rest] = text.split('\n');
  const [first = '', ...words] = lead.trim().split(/\s+/);
  const marked = MARKS.has(first);
  const glyph = marked ? first : undefined;
  const name = marked ? words.join(' ') : lead.trim();

  return (
    <Card
      id="said"
      glyph={glyph}
      name={name}
      dismiss={offer === undefined ? s.ui.gotIt : s.claim.stay}
      onDismiss={onDismiss}
      // An offer has to be chosen, never waited out — so a receipt that makes
      // one is never brief, whatever the caller asked for.
      brief={brief === true && offer === undefined}
      {...(offer === undefined
        ? {}
        : {
            action: <Confirming label={offer.label} armed={offer.armed} onConfirm={offer.onTake} />,
          })}
    >
      <ProseLines text={rest.join('\n')} s={s} onTerm={onTerm} />
      {rows !== undefined && <TipRows rows={rows} theme={theme} s={s} onTerm={onTerm} />}
    </Card>
  );
}
