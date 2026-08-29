import type { GameState } from '@engine/state';
import { arcSparkline, recordDaily, type DailyBook } from '@meta/daily';
import { recordRun, type RecordBook } from '@meta/records';
import { appendEntry, capShots, runHighlights, type Timeline } from '@meta/timeline';
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
export const SHOTS_KEPT = 20;

export type Settled = {
  readonly world: WorldMemory;
  readonly records: RecordBook;
  readonly timeline: Timeline;
};

export type Settling = {
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
  const world = rememberRun(before, now.state);
  const records = recordRun(now.records, now.state);

  const summary = now.hud.summary;
  const highlights = runHighlights(before, world, {
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

  return { world, records, timeline };
}

/* ---- the daily ------------------------------------------------------------ */

export type SettledDaily = {
  readonly book: DailyBook;
  readonly timeline: Timeline;
  readonly isNewBest: boolean;
};

export type SettlingDaily = {
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

  return { book, timeline, isNewBest };
}
