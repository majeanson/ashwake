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
 * Every number here is balance, so it lives in `content/` — the dials that
 * switch it on and scale it are in `tuning.ts`.
 */

/**
 * The four sizes the caravan asks for, smallest first: small, medium, large,
 * and the OUTRAGEOUS ask. 15+ was met by no scripted line in 400 runs — a
 * pocket that size is almost never built before the purse runs out — so the
 * outrageous ask is 12+: hard, not absent. Three is the floor, so a single
 * tile (or a pair) never answers the caravan.
 */
export const CARAVAN_BANDS = [
  [3, 4],
  [5, 8],
  [9, 11],
  [12, Infinity],
] as const;

/** Which of the four bands: 0 small, 1 medium, 2 large, 3 outrageous. */
export type CaravanKind = 0 | 1 | 2 | 3;

/**
 * The wares, and what each does for the REST OF THE RUN.
 *
 * The rule the first prototype taught (it sold "cost rises slower" and "12
 * tiles now", and the patient line played 524 placements instead of 104):
 * **a ware changes what a run is worth or how it plays, never how long it
 * lasts.** Nothing here pays tiles or slows the cost. That is a design rule,
 * not a proof: luck and a wider hand can help a run survive indirectly, so
 * the length is MEASURED — 102 placements with the caravan against 105
 * without (`study.ts`), and `sim/caravan.test.ts` holds it per seed.
 *
 * Strengths are the prototype's ×3, the level at which a ware is worth
 * reading the caravan for. Each is applied to the run's own `tuning`, which
 * the engine already carries and reads, so a replay re-plays it exactly.
 */
export const CARAVAN_WARES = {
  /** The placing (`identityBonusRate`) pays this much more. */
  placing: 1.5,
  /** Each extra tile in a pocket pays this much more (`harvestSizeBonus`). */
  size: 0.15,
  /** One more card in the hand, never more than this many. */
  handMax: 5,
  /** Luck, at once. */
  luck: 120,
  /** Forge costs this much less, never below `forgeFloor`. */
  forge: 30,
  forgeFloor: 20,
} as const;

export const WARE_IDS = ['placing', 'size', 'hand', 'luck', 'forge'] as const;
export type WareId = (typeof WARE_IDS)[number];
