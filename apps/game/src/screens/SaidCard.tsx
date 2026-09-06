import type { IconName } from '@theme/icons';
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

/**
 * **The mark arrives BESIDE the words** (2026-08-30).
 *
 * A claim's mark used to be prefixed into its own first line
 * (`${glyph}  ${HEADING}`) and split back out here by whitespace, which is
 * fine for a claim and wrong for everything else: a POP's lead is "POPPED 5,
 * total worth 12" and a device's first pop is "YOUR FIRST POP", so "POPPED"
 * and "YOUR" were drawn in the 1.3em mark face with the rest as the heading.
 * That was patched by checking the token against the registries, and then made
 * moot: a mark is an ICON now, which cannot live in a string at all, so it
 * rides on `Said` and the heading is whatever the catalogue wrote, whole.
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
  /**
   * WEAR IT, FROM THE CARD THAT SAYS YOU FOUND IT (2026-09-05, Marc: *"i
   * should see a card popping explaining, a way to equip/unequip"*).
   *
   * The find card already named the perk and printed its three rows — what it
   * gives, what it takes, how to play it — and then ended with directions:
   * *"WEAR it in THE SHOP, on the end screen."* Only the FIRST perk a world
   * finds is worn automatically (`grantFind`), so every find after it was a
   * thing you had been handed, explained, and could not use until the run was
   * over and you had gone looking through two menus for it.
   *
   * A single tap, not `Confirming`'s two: an `offer` arms because it forgets a
   * world, and wearing a perk is reversible by pressing the same button again.
   * An offer still wins the slot where both exist — a placement can reach a
   * find and the last shrine at once — because the crossing is the one that
   * cannot be undone.
   */
  readonly wear?: { readonly label: string; readonly onWear: () => void } | undefined;
  /**
   * A receipt for something the player has already seen the card for once —
   * a pop after their first. Goes on its own, and any tap sends it away.
   */
  readonly brief?: boolean | undefined;
  /** The mark this receipt happened to, where it has one. A pop has none: the
   *  board is the thing that popped. */
  readonly icon?: IconName | undefined;
};

export function SaidCard({
  text,
  rows,
  theme,
  s,
  onDismiss,
  onTerm,
  offer,
  wear,
  brief,
  icon,
}: SaidCardProps) {
  // The glyph and the heading are the receipt's own first line — `receipts.ts`
  // writes `{glyph}  {HEADING}` and the body under it. Split rather than
  // passed separately, so there is one place the sentence is composed and one
  // place it is taken apart.
  const [lead = '', ...rest] = text.split('\n');

  return (
    <Card
      id="said"
      icon={icon}
      name={lead.trim()}
      dismiss={offer === undefined ? s.ui.gotIt : s.claim.stay}
      onDismiss={onDismiss}
      // An offer has to be chosen, never waited out — so a receipt that makes
      // one is never brief, whatever the caller asked for.
      brief={brief === true && offer === undefined && wear === undefined}
      {...(offer !== undefined
        ? {
            action: <Confirming label={offer.label} armed={offer.armed} onConfirm={offer.onTake} />,
          }
        : wear === undefined
          ? {}
          : {
              action: (
                <button type="button" data-action="wear-found" onClick={wear.onWear}>
                  {wear.label}
                </button>
              ),
            })}
    >
      <ProseLines text={rest.join('\n')} s={s} onTerm={onTerm} />
      {rows !== undefined && <TipRows rows={rows} theme={theme} s={s} onTerm={onTerm} />}
    </Card>
  );
}
