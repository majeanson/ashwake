/**
 * WHAT A SHARE HANDS OVER, DECIDED IN ONE PLACE (`PASS.md` P2.7).
 *
 * `shell/share.ts` calls this the game's entire distribution mechanism, and
 * `meta/share.ts` owns the words and the query. What sat in `App.tsx` between
 * them was a hundred lines deciding WHICH run this is — and that decision is
 * the same one twice, because a daily and a world run share nothing but the
 * verb:
 *
 *   - a daily's line is a scoreboard entry carrying its DATE, so the receiver
 *     plays the same board and the seed would mean nothing to them;
 *   - a world run carries its SEED, and has no date worth printing.
 *
 * Both halves of that fork were spelled out twice in `App` — once for the
 * SENTENCE (`ShareSubject`) and again for the PICTURE (`ShareCardText`) — and
 * the two spellings had to agree or the card would say a number the text did
 * not. They agree by construction here: one branch, two outputs.
 *
 * Pure, so the fork is testable. The canvas is not: `renderShareCard` needs a
 * `document`, and `App` keeps that call and the `try` around it.
 */
import { arcSparkline, dailyBadge, type DailyBook } from '@meta/daily';
import type { ShareSubject } from '@meta/share';
import type { Strings } from '@text/Strings';
import type { GameState } from '@engine/state';
import type { HudView } from '@view/view';
import type { ShareCardData } from './shareCard';

/** What the end screen already knows about the run being handed over. */
type HandOver = {
  /** The date, or null for a world run — the whole fork. */
  readonly daily: string | null;
  readonly state: GameState;
  readonly hud: HudView;
  /** `Settled.standing` — NEW BEST, or how far short. Null on a detour. */
  readonly standing: { readonly isNewBest: boolean; readonly run: number } | null;
  /**
   * The daily book, decoded ONCE by the caller (2026-09-02).
   *
   * It was read twice inside the one handler — for the tries the sentence
   * confesses, and again for the badge on the card — which is two decodes of
   * one blob a few lines apart. Worse than the cost: two reads of a store a
   * settle could write between, so the sentence and the picture could disagree
   * about which try this was, on the one artefact whose whole job is being
   * screenshotted. Null for a world run, which has no book to read.
   */
  readonly book: DailyBook | null;
};

/**
 * The card's words: everything `renderShareCard` takes except the shot and the
 * theme, which are the shell's to supply.
 *
 * `Omit` off the real type rather than six fields written again — a second
 * declaration of one shape is what lets a card and a sentence drift apart, and
 * that is the drift this module exists to make impossible.
 */
type ShareCardText = Omit<ShareCardData, 'shot'>;

/**
 * The sentence's subject and the card's words, from one fork.
 *
 * Every field is one the ending has already drawn from the same `hud` and
 * `standing`, so the card cannot say a number the screen did not.
 */
export function handOverOf(
  run: HandOver,
  s: Strings,
): { readonly subject: ShareSubject; readonly card: ShareCardText } {
  const { daily, state, hud, standing, book } = run;
  const arc = arcSparkline(state.log.harvests);
  const subject: ShareSubject =
    daily === null
      ? {
          kind: 'run',
          points: hud.points,
          placements: hud.placements,
          seed: state.rootSeed,
          arc,
        }
      : {
          kind: 'daily',
          date: daily,
          points: hud.points,
          reach: hud.depthValue,
          arc,
          // The try this was, confessed rather than hidden — the daily's own
          // honesty rule. Read after settling, so it counts this run.
          tries: book?.[daily]?.tries ?? 1,
        };

  return {
    subject,
    card: {
      scoreLine: s.share.cardScore(hud.points),
      reachLine: s.share.cardReach(hud.depthValue),
      arc: state.log.harvests.map((h) => h.points),
      headline: standing?.isNewBest === true ? s.ui.ending.newBest : null,
      // A daily's ladder line already carries the number RUN/TRY would say.
      topLine:
        daily !== null
          ? dailyBadge(book ?? {}, daily, s)
          : standing !== null && standing.run > 0
            ? s.ui.ending.run(standing.run)
            : '',
      // A daily plays a DATE, and a date is not a seed anybody outside this
      // device's book can open. The footer stays empty rather than printing a
      // number that means nothing, exactly as the text share drops it.
      footerLine: daily !== null ? '' : s.share.cardSeed(state.rootSeed),
    },
  };
}
