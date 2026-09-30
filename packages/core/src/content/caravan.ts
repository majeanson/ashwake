/**
 * THE CARAVAN — what it asks for, and what it sells (2026-09-29).
 *
 * Marc, over one long afternoon: _"we want people using size as a
 * flexibility so sometimes small is good sometimes its bad"_, then the
 * caravan as the thing that asks (_"market makers … slay the spire like"_),
 * _"outrageous pocket sizes too … so we both want small or big"_, a caravan
 * boon as the reward, and _"no hard points, could be dynamic … but no flat"_.
 *
 * So: the caravan names a pocket size that changes as the run goes on. The
 * first pop that fits is multiplied by its band's factor — most for small, so
 * a small ask is worth about what a large one is — and buys a pick of one of
 * three WARES. Measured in `scripts/study.ts` before a line of this was
 * written (`LOG.md` Session 117): a player who pops to the ask beats every
 * fixed habit by ~17% (16.6% over 1000 seeds), runs are no longer (102
 * placements against 105), and single tiles never qualify.
 *
 * Then Marc, the next day (2026-09-30): _"remove ui that displays when the
 * caravan arrives and its points, and it just becomes a randomizer so people
 * will want to pop"_, with _"caravan is in town" and "caravan left town" so
 * people can try their pop_. So the size is hidden, the caravan comes and
 * goes (`caravanAway`), the multiplier is off (its dials are 0), and the
 * wares carry the reward alone — twice as strong, and one more that pays
 * for popping itself.
 *
 * Every number here is balance, so it lives in `content/` — the dials that
 * switch it on and scale it are in `tuning.ts`.
 */

/**
 * The sizes the caravan wants: SMALL, BIG, and the OUTRAGEOUS ask. 15+ was
 * met by no scripted line in 400 runs — a pocket that size is almost never
 * built before the purse runs out — so the outrageous ask is 12+: hard, not
 * absent. Three is the floor, so a single tile (or a pair) never answers.
 *
 * Two ordinary bands, not three (2026-09-30): once the ask is hidden, the
 * player's only way to find it is to try a pop, and against 3-4 / 5-8 / 9-11
 * trying LOST — a line that popped a new size each visit scored 1382 to the
 * 1624 of one that simply popped at 12. Small-or-big is a guess one pop
 * settles: a pop in town the caravan passes on says which half it wants.
 * Trying pays about 8-9% over the same habit that does not, with all
 * thirteen wares (`try8` 1293 against `take:popAt8` 1199, `try12` 1387
 * against 1275; 1000 seeds, `scripts/study.ts`, `LOG.md` Sessions 118-119).
 */
export const CARAVAN_BANDS = [
  [3, 6],
  [7, Infinity],
  [12, Infinity],
] as const;

/** Which band: 0 small, 1 big, 2 outrageous. */
export type CaravanKind = 0 | 1 | 2;

/**
 * The wares, and what each does for the REST OF THE RUN. Doubled on
 * 2026-09-30, when they became the caravan's whole reward, and joined the
 * same day by eight more (Marc: _"id like more creative ideas"_), each an
 * existing system turned up for the rest of the run.
 *
 * The rule the first prototype taught (it sold "cost rises slower" and "12
 * tiles now", and the patient line played 524 placements instead of 104):
 * **a ware never buys SURVIVAL** — nothing here pays tiles or slows the cost,
 * which is what fed that runaway: a longer run met more caravans, which made
 * it longer. A ware may still make a run a little longer by making it better
 * — rare tiles match more easily — and Marc set how much on 2026-09-30:
 * _"~ < 20 placements being okay"_. So the length is MEASURED (`study.ts`,
 * `LOG.md` Session 118), and `sim/caravan.test.ts` holds it per seed.
 *
 * Strengths are the prototype's ×3, the level at which a ware is worth
 * reading the caravan for. Each is applied to the run's own `tuning`, which
 * the engine already carries and reads, so a replay re-plays it exactly.
 */
export const CARAVAN_WARES = {
  /** The placing (`identityBonusRate`) pays this much more. */
  placing: 3,
  /** Each extra tile in a pocket pays this much more (`harvestSizeBonus`). */
  size: 0.3,
  /** One more card in the hand, never more than this many. */
  handMax: 5,
  /** Luck, at once. */
  luck: 250,
  /** Forge costs this much less, never below `forgeFloor`. */
  forge: 60,
  forgeFloor: 20,
  /** Every pop scores this much more of its price (`pointsPerPop`). */
  pops: 0.1,
  /** RARER DRAWS: the draft's magic and unique odds, raised by this much. */
  magic: 0.05,
  unique: 0.01,
  /** RARES PAY: the jackpot a rare tile pays (`rareBonusRate`), raised. */
  jackpot: 3,
  /**
   * ALL POWERS: green, yellow and red's powers multiplied by this, and blue's
   * tide steps half as far with one more step. ONCE a run (`ONCE_WARES`):
   * a pop pays tiles by its worth, so a power is survival too — at ×2 a
   * line that took it played 321-470 placements, not 102. At ×1.5, taken
   * whenever offered, 101-109 (`LOG.md` Session 118).
   */
  powers: 1.5,
  /**
   * THE ROAD PAYS: the distance multiplier's ceiling, raised by this much —
   * for POINTS. The tiles a far pop pays (`popTilesPerRing`) stay at the old
   * ceiling (`ringTiles`); until review on 2026-09-30 they rose with it.
   */
  road: 1,
  /** BIGGER BOUNTIES: what a bounty multiplies by, raised by this much. */
  bounty: 2,
  /** LUCKY POPS: luck a pop pays, raised by this much (`luckPerPop`). */
  luckyPop: 9,
  /**
   * The widest the hand can lay out: cards dealt plus stash slots, one row
   * (`apps/game/src/screens/hand.ts`). ONE MORE CARD and A BIGGER STASH both
   * stop here — ONE MORE CARD did not until 2026-09-30, and with the DRAFT
   * and HOLD unlocks (4 + 2) it made a seventh column.
   */
  columns: 6,
} as const;

export const WARE_IDS = [
  'placing',
  'size',
  'hand',
  'luck',
  'forge',
  'pops',
  'rares',
  'jackpot',
  'powers',
  'road',
  'bounty',
  'lucky',
  'hold',
] as const;
export type WareId = (typeof WARE_IDS)[number];

/** Wares a run is offered once at most — see `CARAVAN_WARES.powers`. */
export const ONCE_WARES: readonly WareId[] = ['powers'];
