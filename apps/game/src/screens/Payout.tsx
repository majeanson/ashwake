import { COLOURS, RARITIES, POINT_SOURCES } from '@content/tuning';
import { COLOUR_MARK } from '@theme/tokens';
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

export type PayoutProps = {
  readonly summary: NonNullable<HudView['summary']>;
  /** Every scoring harvest's points, in the order they were taken. */
  readonly harvests: readonly number[];
  readonly s: Strings;
};

export function Payout({ summary, harvests, s }: PayoutProps) {
  const split = summary.points;

  return (
    <Fold summary={s.ui.details}>
      <Arc points={harvests} label={s.payout.arc} />

      {split !== null && (
        <>
          <Bars
            heading={s.payout.byColour}
            rows={COLOURS.map((colour) => ({
              // The mark rather than a word: it is the one the board, the
              // purse and the manual already use for that colour, and the
              // symbol vocabulary is deliberately never re-invented per screen.
              label: COLOUR_MARK[colour],
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

      {summary.sitePoints > 0 && (
        <p className="note">
          {s.payout.sites} {summary.sitePoints}
        </p>
      )}
    </Fold>
  );
}
