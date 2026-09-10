import { endingPayout } from '@engine/reduce';
import type { GameState } from '@engine/state';
import { arcSparkline, dailySeed, recordDaily, type DailyBook } from '@meta/daily';
import { ONLY_WORLD, recordRun, type RecordBook } from '@meta/records';
import { appendEntry, capShots, runHighlights, type Timeline } from '@meta/timeline';
import { GOALS, type GoalId } from '@content/goals';
import { newlyMetGoals } from '@meta/goals';
import { newWorld, rememberRun, type WorldMemory } from '@meta/world';
import type { Progress } from '@meta/progress';
import type { HudView } from '@view/view';
import type { Slot } from './storage';

/**
 * What a finished run leaves behind (Stage 4, 2026-08-29).
 *
 * Until now a run ended and nothing happened: the end screen printed a number
 * and the next run started from nothing. **This is the file that makes a run
 * count** — and therefore the file that gives the shop, the hall of fame and
 * the world's own memory anything to show.
 *
 * Every piece of it is the core's arithmetic. `rememberRun` folds the ground
 * walked into the world, `recordRun` keeps the shelf of bests, `runHighlights`
 * decides what was worth saying about the run, and `arcSparkline` draws its
 * shape. Nothing here decides anything a rule decides; it is the wiring
 * between a run ending and three ledgers, and it is a pure function of
 * (state, hud, what was already there) so it can be tested by handing it a
 * finished run.
 *
 * **The diary is capped.** Ashwake 1 kept the last twenty board snapshots and
 * dropped the rest, because a phone's storage quota is real and a diary that
 * grows forever is a game that one day cannot save at all.
 */

/** How many end-of-run board pictures the diary keeps. */
const SHOTS_KEPT = 20;

type Settled = {
  readonly world: WorldMemory;
  readonly records: RecordBook;
  readonly timeline: Timeline;
  /**
   * Goals this run was the one to meet — the world SURVEY, which had no
   * consumer in this body until 2026-08-29.
   *
   * Reported at settle rather than mid-run because a goal is a fact about a
   * WORLD across every run it has held, and the world only learns what a run
   * did when the run is folded into it. Saying "GOAL MET" the moment a
   * placement happened would mean maintaining a second, live projection of
   * the world — a second place for it to be wrong.
   */
  readonly goals: readonly GoalId[];
  /**
   * The device's ledger with this run's RELICS in it.
   *
   * Marc, 2026-08-29: *"I never get relics ... in the old game I still had
   * some."* He was right, and the reason is that this function returned
   * everything a run leaves behind EXCEPT the one thing the player takes with
   * them. The world was folded, the records kept, the diary written — and
   * `progress` was taken as an argument, read for the survey, and handed back
   * unchanged. Every run ended with the shop as empty as it started, which is
   * the roguelite loop not running at all.
   *
   * `endingPayout` is the engine's own arithmetic and already what the
   * crossing banks: relics earned by burning, plus what unspent luck is worth
   * on the way out. One source, so an ordinary ending and a crossing cannot
   * disagree about what a run was worth.
   */
  readonly progress: Progress;
  /**
   * WHERE THIS RUN STANDS — computed here since the rules were lifted, and
   * thrown away until 2026-09-02.
   *
   * `recordRun` folds the run into the book, so this function has always known
   * whether the score beat the standing best and which run it was. It returned
   * the book and nothing else, and the end screen had no records prop at all —
   * so the single most screenshot-worthy line the game can print, NEW BEST, has
   * never been printed in this body.
   *
   * `previousBest` is the book BEFORE this run, which is the only version of
   * the number worth comparing against: after the fold, a new best equals its
   * own record and every run is "0 short".
   */
  readonly standing: Standing;
};

/** How a finished run compares to the ones before it. */
export type Standing = {
  /** Which run this was, device-wide. Zero where nothing was recorded. */
  readonly run: number;
  readonly isNewBest: boolean;
  /**
   * The best before this run, or null where there was none.
   *
   * Null is not zero: a device that has never finished a home run has no
   * standing best, and "0 short of best" under a score is a line lying twice.
   */
  readonly previousBest: number | null;
};

/** A run that banked nothing has no standing to report. */
const NO_STANDING: Standing = { run: 0, isNewBest: false, previousBest: null };

type Settling = {
  readonly state: GameState;
  readonly hud: HudView;
  readonly slot: Slot;
  readonly world: WorldMemory | null;
  readonly records: RecordBook;
  readonly timeline: Timeline;
  readonly progress: Progress;
  /** Epoch ms, supplied by the shell — the core has no clock. */
  readonly at: number;
  /** A picture of the board as it ended, if one could be taken. */
  readonly shot?: string | undefined;
};

/**
 * Bank a finished run.
 *
 * The world is created here if the slot had none: a run played before a world
 * existed is still a run that happened, and losing it because the bookkeeping
 * was not ready is the kind of loss a player never forgives.
 */
export function settle(now: Settling): Settled {
  const before = now.world ?? newWorld(now.state.rootSeed);

  /*
   * THE SEED GUARD (Ashwake 1, 2026-08-20; missing here until 2026-08-29).
   *
   * A run may only ever be merged into the world it was PLAYED on. Ground
   * unioned from a foreign geography is **unremovable** afterwards — the
   * world remembers hexes that its own seed never generated, and no later
   * run can un-see them.
   *
   * Nothing *should* be able to produce a mismatch, and two things can. A
   * `?seed=` link plays somebody else's world on this device, which is
   * exactly what SHARE hands out. And the quota ladder can shed a world while
   * leaving its run, so the next boot mints a fresh world and resumes a run
   * that no longer matches it — the precise bug that put this guard in
   * Ashwake 1.
   *
   * A mismatched run is a DETOUR: it still ends, it still shows its score,
   * and it leaves the device's own world exactly as it found it.
   */
  const detour = now.state.rootSeed !== before.worldSeed;
  if (detour) {
    return {
      // Untouched. Not `before` rebuilt — the very object, so a caller that
      // compares by identity can see that nothing happened.
      world: before,
      records: now.records,
      /*
       * EXCEPT THE DIARY, WHICH IS NOT A LEDGER (2026-09-09, Marc's ruling on
       * `NEXT.md` §1: *"1. yes"*).
       *
       * A shared run banked nothing at all until today, including the fact
       * that it happened — and the guard above is right about every other
       * ledger for reasons that do not reach this one. The world must not take
       * foreign ground (unremovable afterwards). The purse must not pay the
       * person who opened a link (a link people would post on purpose). The
       * shelf of bests must not rank a run excluded from the race. **None of
       * those is an argument about a record of what you did**, and playing a
       * friend's board is a thing you did.
       *
       * Its own `kind` (`SharedEntry`), so `runsOf` — which feeds the TOTALS
       * run count and `prehistory`'s arithmetic, both about this device's own
       * worlds — cannot pick it up. The seed rather than a slot, because a
       * shared board belongs to no world of yours.
       */
      timeline: capShots(
        appendEntry(now.timeline, {
          at: now.at,
          kind: 'shared',
          seed: now.state.rootSeed,
          score: now.hud.points,
          reach: now.hud.depthValue,
          arc: arcSparkline(now.state.log.harvests),
          detail: {
            placements: now.hud.placements,
            harvests: now.hud.summary?.harvests ?? 0,
            popped: now.hud.summary?.tilesTaken ?? 0,
            bigPop: now.hud.summary?.biggestHarvest ?? 0,
            bigPopAt: now.hud.summary?.biggestAt ?? 0,
            claims: now.hud.summary?.claims ?? 0,
            quests: now.hud.summary?.quests ?? 0,
            // Zero, and not `hud.relics`: a shared run mints none (`NO_RELICS`),
            // and a row claiming otherwise would be the screen disagreeing with
            // the purse.
            relics: 0,
            epitaph: now.hud.epitaph ?? '',
            ...(now.shot === undefined ? {} : { shot: now.shot }),
          },
        }),
        SHOTS_KEPT,
      ),
      goals: [],
      /*
       * A detour pays NO relics either.
       *
       * The seed guard exists because a run on somebody else's world must not
       * touch this device's ledgers, and the purse is a ledger. A shared
       * `?seed=` link that banked relics would be a link that pays the person
       * who opened it — which is a thing people would post on purpose.
       */
      progress: now.progress,
      // A detour is not on the shelf of bests and never was. Saying "3 short"
      // against records it did not compete for would be the ending claiming a
      // rank in a race it was excluded from.
      standing: NO_STANDING,
    };
  }

  const walked = rememberRun(before, now.state);
  const wasBest = now.records[ONLY_WORLD]?.bestPoints ?? 0;
  const hadRuns = (now.records[ONLY_WORLD]?.runs ?? 0) > 0;
  const records = recordRun(now.records, now.state);
  const standing: Standing = {
    run: records[ONLY_WORLD]?.runs ?? 0,
    // Strictly greater: equalling the best is not beating it, and a run that
    // ties should not get the loudest line on the screen.
    isNewBest: now.hud.points > wasBest,
    // A device with no finished run has no best to be short of — see
    // `Standing.previousBest`.
    previousBest: hadRuns && wasBest > 0 ? wasBest : null,
  };

  // The survey, read against the world this run just made and then WRITTEN
  // into it — a goal reports once, and the world is what remembers that it
  // already did.
  const goals = newlyMetGoals(walked, now.progress);
  const world: WorldMemory =
    goals.length === 0 ? walked : { ...walked, goalsMet: [...walked.goalsMet, ...goals] };

  /*
   * THE SURVEY'S OWN PAYOUT, which nothing in this body had ever paid
   * (2026-08-30).
   *
   * `content/goals.ts` opens with the sentence "five world-scale goals, each
   * paying relics ONCE per world the moment it is first met", and `Goal.reward`
   * — 25 to 40 relics apiece — had **no consumer anywhere in this repository**.
   * Detection ran, the ledger was written, the end screen listed what the run
   * had proved, and the purse did not move. Ashwake 1 pays it in
   * `keeper.ts`'s `checkGoals`.
   *
   * Seventh of this body's signature miss and the third of the INVISIBLE kind,
   * after the world seed and the economy: a milestone that pays nothing still
   * fires, still lists itself, still reads as a milestone. Only the number
   * disagreed. It is paid here rather than in a live checker because this is
   * where `newlyMetGoals` already runs and where `goalsMet` is already
   * written — a second site would be a second thing to forget.
   */
  const survey = goals.reduce((n, id) => n + (GOALS.find((g) => g.id === id)?.reward ?? 0), 0);

  // What the run pays out, banked onto the device ledger.
  const banked: Progress = {
    ...now.progress,
    relics: now.progress.relics + endingPayout(now.state).relics + survey,
  };

  const summary = now.hud.summary;
  const highlights = runHighlights(before, walked, {
    points: now.hud.points,
    perksBefore: now.progress.found.length,
    perksAfter: now.progress.found.length,
    // A camp start is Stage 4's crossing, which does not exist yet. Stated
    // rather than defaulted, so the day it does the compiler asks here.
    campStart: false,
  });

  const timeline = capShots(
    appendEntry(now.timeline, {
      at: now.at,
      kind: 'run',
      slot: now.slot,
      worldSeed: world.worldSeed,
      score: now.hud.points,
      reach: now.hud.depthValue,
      // The arc is drawn from the run's OWN harvests — the whole question Gate
      // D asks is whether the biggest number came near the end, and a total
      // cannot answer it. `state.log.harvests` is where the reducer kept them.
      arc: arcSparkline(now.state.log.harvests),
      highlights,
      detail: {
        placements: now.hud.placements,
        harvests: summary?.harvests ?? 0,
        popped: summary?.tilesTaken ?? 0,
        bigPop: summary?.biggestHarvest ?? 0,
        bigPopAt: summary?.biggestAt ?? 0,
        claims: summary?.claims ?? 0,
        quests: summary?.quests ?? 0,
        relics: now.hud.relics,
        epitaph: now.hud.epitaph ?? '',
        ...(now.shot === undefined ? {} : { shot: now.shot }),
      },
    }),
    SHOTS_KEPT,
  );

  return { world, records, timeline, goals, progress: banked, standing };
}

/* ---- the daily ------------------------------------------------------------ */

type SettledDaily = {
  readonly book: DailyBook;
  readonly timeline: Timeline;
  readonly isNewBest: boolean;
  /**
   * Which try this was, confessed (2026-09-02).
   *
   * `recordDaily` has counted tries since the rules were lifted and the number
   * reached the diary and the share line, never the ending — so the one screen
   * where a player is deciding whether to press TRY AGAIN was the one screen
   * that would not say how many times they already had. The design's honesty
   * rule is that replaying is allowed and the count is stated, and half of that
   * rule was missing here.
   */
  readonly try: number;
};

type SettlingDaily = {
  readonly date: string;
  readonly state: GameState;
  readonly hud: HudView;
  readonly book: DailyBook;
  readonly timeline: Timeline;
  readonly at: number;
  readonly shot?: string | undefined;
};

/**
 * Bank a finished daily.
 *
 * Deliberately NOT `settle`: a daily leaves two things behind rather than
 * four. It touches the ladder for its date and the diary, and it touches
 * neither the world (every phone plays the same board — there is no ground
 * "this world" walked) nor the shelf of bests (a shared seed compared against
 * runs on private ones would make the record book meaningless). Ashwake 1 kept
 * these apart for exactly that reason, and the split is the rule rather than
 * an omission.
 *
 * The try count is confessed rather than enforced: replaying today's board is
 * allowed and the ladder simply says which attempt this was.
 */
export function settleDaily(now: SettlingDaily): SettledDaily {
  /*
   * THE SEED GUARD, WHICH THIS HALF NEVER HAD (2026-09-09).
   *
   * `settle` has refused a run played on a foreign seed since 2026-08-29 —
   * "a run may only ever be merged into the world it was PLAYED on" — and this
   * function, the other half of the same fork, took the date on trust. A
   * daily's seed is a pure function of its date, so the same guard is one line
   * here, and without it a run on ANY board could be banked as today's score.
   *
   * It is reachable. RESET ALL, from inside a daily, mints a fresh world and
   * restarts the session on the world's seed — and never cleared `daily`, so
   * the next run was played on that world and banked here as today's daily.
   * The ladder is the one ledger in this game that is compared between people;
   * a score on it from a private board is the only kind of wrong that cannot be
   * noticed from the outside. `App` clears `daily` on reset now, and this is
   * the guard that holds if a sixth door forgets.
   *
   * Refused the way `settle` refuses: everything back untouched, the very
   * objects, so a caller comparing by identity can see that nothing happened.
   * `try` is what the date already stood at rather than a fresh count, because
   * this attempt did not happen on this board.
   */
  if (now.state.rootSeed !== dailySeed(now.date)) {
    return {
      book: now.book,
      timeline: now.timeline,
      isNewBest: false,
      try: now.book[now.date]?.tries ?? 0,
    };
  }

  const { book, record, isNewBest } = recordDaily(now.book, now.date, now.hud.points);
  const summary = now.hud.summary;

  const timeline = capShots(
    appendEntry(now.timeline, {
      at: now.at,
      kind: 'daily',
      date: now.date,
      score: now.hud.points,
      reach: now.hud.depthValue,
      arc: arcSparkline(now.state.log.harvests),
      try: record.tries,
      best: isNewBest,
      detail: {
        placements: now.hud.placements,
        harvests: summary?.harvests ?? 0,
        popped: summary?.tilesTaken ?? 0,
        bigPop: summary?.biggestHarvest ?? 0,
        bigPopAt: summary?.biggestAt ?? 0,
        claims: summary?.claims ?? 0,
        quests: summary?.quests ?? 0,
        relics: now.hud.relics,
        epitaph: now.hud.epitaph ?? '',
        ...(now.shot === undefined ? {} : { shot: now.shot }),
      },
    }),
    SHOTS_KEPT,
  );

  return { book, timeline, isNewBest, try: record.tries };
}
