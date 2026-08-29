import type { Theme } from '@theme/tokens';
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
};

export function SaidCard({ text, rows, theme, s, onDismiss, onTerm, offer }: SaidCardProps) {
  // The glyph and the heading are the receipt's own first line — `receipts.ts`
  // writes `{glyph}  {HEADING}` and the body under it. Split rather than
  // passed separately, so there is one place the sentence is composed and one
  // place it is taken apart.
  const [lead = '', ...rest] = text.split('\n');
  const [glyph, ...heading] = lead.trim().split(/\s+/);

  return (
    <Card
      id="said"
      glyph={glyph}
      name={heading.join(' ')}
      dismiss={offer === undefined ? s.ui.gotIt : s.claim.stay}
      onDismiss={onDismiss}
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
