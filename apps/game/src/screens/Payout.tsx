import { COLOURS, RARITIES, POINT_SOURCES, TUNING } from '@content/tuning';
import { COLOUR_ICON } from '@theme/icons';
import { namesOf, type Theme } from '@theme/tokens';
import type { HudView } from '@view/view';
import type { Strings } from '@text/Strings';
import { Arc } from '../ui/Arc';
import { Bars } from '../ui/Bars';
import { Fold } from '../ui/Fold';

/**
 * Where the points came from (Stage 4, 2026-08-29).
 *
 * Marc, 2026-08-27: *"in our stats end run we could see our points
 * distribution"*. The engine has counted it three ways since — by colour, by
 * rarity, by source — and until now nothing showed it.
 *
 * **Folded, not front and centre.** The end screen's job is the score, the
 * epitaph and the way back in; this is for the player who wants to know why
 * the number was what it was, and putting it above NEW RUN would push the one
 * button the v2.0 gate turns on off the first screen.
 *
 * Absent rather than zeroed when a run banked nothing from pops, and when a run
 * saved before the splits existed is finished — its harvests carry no split,
 * and inventing zeroes would be a lie shaped like data.
 */

type PayoutProps = {
  readonly summary: NonNullable<HudView['summary']>;
  /** The score itself, so the rows can add up to something on screen. */
  readonly points: number;
  /** How far out the run reached — the reach bonus is paid per ring of it. */
  readonly reach: number;
  /** The direction, for its own names for the four grounds. A bar labelled
   *  with a SHAPE was fine while the shape was a character in the same face as
   *  the words; an icon beside a nameless bar is a picture with no caption. */
  readonly theme: Theme;
  /** Every scoring harvest's points, in the order they were taken. */
  readonly harvests: readonly number[];
  readonly s: Strings;
};

export function Payout({ summary, points, reach, harvests, theme, s }: PayoutProps) {
  const split = summary.points;
  const names = namesOf(theme, s.locale);

  /*
   * THE SCORE, IN THE THREE TERMS THE ENGINE ADDS IT UP IN (2026-09-02).
   *
   * `endingBonus` pays two things once, at the moment a run stops: a bonus per
   * ring of reach, and one per destination claimed. Neither had ever been on a
   * screen in this body, so the bars below — which can only ever speak for
   * tiles that were POPPED — summed to a fraction of the total with nothing
   * accounting for the difference. A breakdown that does not add up reads as a
   * bug in the game rather than as an incomplete breakdown.
   *
   * Derived from the same numbers the reducer paid with rather than restated:
   * `reach` is `reachOf(state)` through the HUD, and `summary.claims` counts
   * the identical landmarks `endingBonus` counts. POPS is the remainder, which
   * is what makes the column honest — if a rule is ever added that pays points
   * some other way, it lands visibly in POPS instead of silently nowhere.
   *
   * Silent where both dials are off: there is nothing to break down, and four
   * rows of zero is worse than no rows.
   */
  const reachBonus = reach * TUNING.endReachBonus;
  const claimBonus = summary.claims * TUNING.endClaimBonus;
  const pops = points - reachBonus - claimBonus - summary.sitePoints;
  const bonuses = TUNING.endReachBonus > 0 || TUNING.endClaimBonus > 0;

  return (
    <Fold summary={s.ui.details}>
      {bonuses && (
        <dl className="payout-rows">
          <Row label={s.payout.pops} value={pops} />
          {summary.sitePoints > 0 && <Row label={s.payout.sites} value={summary.sitePoints} sign />}
          <Row label={s.payout.reachBonus(reach, TUNING.endReachBonus)} value={reachBonus} sign />
          <Row
            label={s.payout.claimBonus(summary.claims, TUNING.endClaimBonus)}
            value={claimBonus}
            sign
          />
          <Row label={s.payout.total} value={points} total />
        </dl>
      )}

      <Arc points={harvests} label={s.payout.arc} />

      {split !== null && (
        <>
          <Bars
            heading={s.payout.byColour}
            rows={COLOURS.map((colour) => ({
              // The mark rather than a word: it is the one the board, the
              // purse and the manual already use for that colour, and the
              // symbol vocabulary is deliberately never re-invented per screen.
              label: names[colour],
              icon: COLOUR_ICON[colour],
              value: split.byColour[colour],
              paint: `var(--tile-${colour})`,
            }))}
          />
          <Bars
            heading={s.payout.byRarity}
            rows={RARITIES.map((rarity) => ({
              label: s.payout.rarity[rarity],
              value: split.byRarity[rarity],
              // Common has no ink of its own — it is the ordinary tile, and
              // giving it one would say the three are three kinds rather than
              // a ladder with a plain bottom rung.
              paint: rarity === 'common' ? undefined : `var(--${rarity})`,
            }))}
          />
          <Bars
            heading={s.payout.bySource}
            rows={POINT_SOURCES.map((source) => ({
              label: s.payout.source[source],
              value: split.bySource[source],
            }))}
          />
        </>
      )}

      {/*
        SITES used to be a loose note here and is a ROW in the ledger above
        since 2026-09-02: it is a term of the total, and a fact that belongs in
        a sum reads wrong sitting beside it. Kept as a note only where there is
        no ledger to put it in, which is a build with both end dials at zero.
      */}
      {!bonuses && summary.sitePoints > 0 && (
        <p className="note">
          {s.payout.sites} {summary.sitePoints}
        </p>
      )}
    </Fold>
  );
}

/**
 * One line of the ledger: what it is called, and what it was worth.
 *
 * A `<dl>` rather than a table or a row of spans, because that is what this is
 * — terms and their values — and it is the markup a screen reader reads as
 * pairs rather than as ten loose numbers.
 */
function Row({
  label,
  value,
  sign,
  total,
}: {
  readonly label: string;
  readonly value: number;
  /** A bonus reads as an addition; the base and the total do not. */
  readonly sign?: boolean;
  readonly total?: boolean;
}) {
  return (
    <div className={total === true ? 'payout-row payout-total' : 'payout-row'}>
      <dt>{label}</dt>
      <dd>{sign === true ? `+${value}` : value}</dd>
    </div>
  );
}
