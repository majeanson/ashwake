import {
  CARAVAN_BANDS,
  CARAVAN_WARES,
  ONCE_WARES,
  WARE_IDS,
  type CaravanKind,
  type WareId,
} from '@content/caravan';
import type { Tuning } from '@content/tuning';
import type { GameState } from './state';

/**
 * The caravan's rule (2026-09-29) — `content/caravan.ts` has the why.
 *
 * Everything here is a pure function of the run's seed, its placements and
 * its tuning, so the board can show the ask before it is met, a replay meets
 * the same asks, and nothing needs a random stream of its own: adding one
 * would have moved every other stream's cursor and every saved run with it.
 */

/**
 * One visit: which it is in the run's sequence, its band, and the first
 * placement it stands at. When it leaves was a field too until 2026-09-30,
 * read only by the countdown the screen no longer shows.
 */
export type CaravanAsk = {
  readonly index: number;
  readonly kind: CaravanKind;
  readonly from: number;
};

/** A 32-bit mix of two numbers — the caravan's only source of chance. */
function mix(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 1, 0xc2b2ae35);
  h ^= h >>> 16;
  h = Math.imul(h, 0x27d4eb2d);
  h ^= h >>> 15;
  return h >>> 0;
}

/**
 * The caravan in town at `placements` and what it wants, or null — no
 * caravan in this tuning, or it is away.
 *
 * A seeded sequence of visits: each ordinary visit stands `caravanEvery`
 * placements, an outrageous one `caravanWildLife` times that, so a pocket of
 * 12 has the time it takes to be grown. Before each visit it is away for 1 to
 * `caravanAway` placements (2026-09-30; 0 is never away). The size is never
 * shown to the player — which pop meets it is the chance the caravan is.
 */
export function caravanAskAt(seed: number, placements: number, t: Tuning): CaravanAsk | null {
  const visit = caravanVisitAt(seed, placements, t);
  return visit === null || placements < visit.from ? null : visit;
}

/**
 * The visit standing at `placements`, or the NEXT one while the caravan is
 * away (`from` beyond `placements`) — which is how the screen tells "not yet
 * come" from "left town". Null only where there is no caravan.
 */
export function caravanVisitAt(seed: number, placements: number, t: Tuning): CaravanAsk | null {
  // `!(x > 0)`, never `x <= 0`: a run saved before the caravan carries a
  // tuning with no such key, `undefined <= 0` is false, and the loop below
  // never ended — every resumed pre-caravan run froze on its first frame
  // (found in review, 2026-09-29; `save.ts` has warned of exactly this since
  // 2026-08-18). A step that is not a finite positive number is no caravan.
  if (!(t.caravanEvery > 0) || !Number.isFinite(t.caravanEvery)) return null;
  const wildLife =
    t.caravanWildLife > 1 && Number.isFinite(t.caravanWildLife) ? t.caravanWildLife : 1;
  // The same guard, for the same reason: a run saved before 2026-09-30 has no
  // `caravanAway`, and plays on with the caravan never away.
  const away = t.caravanAway >= 1 && Number.isFinite(t.caravanAway) ? Math.floor(t.caravanAway) : 0;
  let ended = 0;
  for (let index = 0; ; index++) {
    const h = mix(seed, index);
    const wild = (h % 10000) / 10000 < t.caravanWild;
    const kind = (wild ? 2 : (h >>> 14) % 2) as CaravanKind;
    // A hash of its own, so how long it was away says nothing of the band.
    const from = ended + (away > 0 ? 1 + (mix(seed ^ 0x2545f491, index) % away) : 0);
    const ends = from + t.caravanEvery * (wild ? wildLife : 1);
    if (placements < ends) return { index, kind, from };
    ended = ends;
  }
}

/** Whether a pocket of `size` answers an ask of this band. */
export const answers = (size: number, kind: CaravanKind): boolean =>
  size >= CARAVAN_BANDS[kind][0] && size <= CARAVAN_BANDS[kind][1];

/** What the pop that answers an ask of this band is multiplied by. */
export function caravanMultiplier(kind: CaravanKind, t: Tuning): number {
  const m = [t.caravanMultSmall, t.caravanMultLarge, t.caravanMultWild][kind] ?? 0;
  return m > 0 ? m : 1;
}

/**
 * The ask THIS pocket would answer, or null — standing, not yet met, and the
 * right size. One ask pays once: the second pop that fits the same window
 * pays nothing extra, so a small ask cannot be farmed with a string of threes.
 */
export function caravanFor(state: GameState, size: number): CaravanAsk | null {
  const ask = caravanAskAt(state.rootSeed, state.placements, state.tuning);
  if (ask === null || state.caravan.met.includes(ask.index)) return null;
  return answers(size, ask.kind) ? ask : null;
}

/** How many wares an answered ask pays. */
export const picksFor = (kind: CaravanKind, t: Tuning): number =>
  kind === 2 && t.caravanWildPicks > 1 ? Math.floor(t.caravanWildPicks) : 1;

/**
 * Three different wares, for the `pick`-th offer the run has been made.
 * Seeded like the asks, so the same run is offered the same wares.
 */
export function offerFor(
  seed: number,
  pick: number,
  t: Tuning,
  taken: readonly WareId[],
): readonly WareId[] {
  const out: WareId[] = [];
  // Never more than the run can use; there are always three that can
  // (placing, size and luck are never used up).
  const usable = WARE_IDS.filter((w) => wareDoesSomething(w, t, taken));
  const want = Math.min(3, usable.length);
  for (let n = 0; out.length < want; n++) {
    const ware = WARE_IDS[mix(seed ^ 0x5bd1e995, pick * 97 + n) % WARE_IDS.length]!;
    if (usable.includes(ware) && !out.includes(ware)) out.push(ware);
  }
  return out;
}

/**
 * Every ware this tuning's caravan can sell, in the catalogue's order — what
 * the manual lists (2026-09-30), by the same test an offer draws from.
 */
export const waresOnSale = (t: Tuning): readonly WareId[] =>
  WARE_IDS.filter((w) => wareDoesSomething(w, t, []));

/**
 * Whether a ware would change anything for this run (found in review,
 * 2026-09-29): a fifth card is the most a hand holds, and a forge at its floor
 * — or not built at all — has nothing left to cheapen. Likewise a pop that
 * scores nothing.
 */
function wareDoesSomething(ware: WareId, t: Tuning, taken: readonly WareId[]): boolean {
  const w = CARAVAN_WARES;
  if (ONCE_WARES.includes(ware) && taken.includes(ware)) return false;
  const roomy = t.draftWidth + Math.max(0, t.holdSlots) < w.columns;
  if (ware === 'hand') return t.draftWidth < w.handMax && roomy;
  if (ware === 'hold') return t.holdSlots > 0 && roomy;
  if (ware === 'rares') return t.magicChance > 0;
  if (ware === 'jackpot') return t.rareBonusRate > 0 && t.magicChance > 0;
  if (ware === 'powers')
    return (
      t.greenCrowdBonus > 0 ||
      t.yellowCompanyBonus > 0 ||
      (t.redAshMatches && t.redAshBonus > 0) ||
      t.blueTideEvery > 0
    );
  if (ware === 'road') return t.distanceMultiplierCap > 0;
  if (ware === 'bounty') return t.questNeed > 0 && t.questBonus > 0;
  if (ware === 'lucky') return t.luckPerPop > 0;
  if (ware === 'forge') return t.luckForgeCost > CARAVAN_WARES.forgeFloor;
  // Nor builds a system the tuning has switched off (2026-09-30).
  if (ware === 'pops') return t.pointsPerPop > 0;
  return true;
}

/** A ware, applied to the rest of the run. Never to its length — see `CARAVAN_WARES`. */
export function applyWare(state: GameState, ware: WareId): GameState {
  const t = state.tuning;
  const w = CARAVAN_WARES;
  // One guard for every ware: none builds a system the tuning has off, or
  // grows past its own limit.
  if (!wareDoesSomething(ware, t, state.caravan.taken)) return state;
  switch (ware) {
    case 'placing':
      return { ...state, tuning: { ...t, identityBonusRate: t.identityBonusRate + w.placing } };
    case 'size':
      return { ...state, tuning: { ...t, harvestSizeBonus: t.harvestSizeBonus + w.size } };
    case 'hand':
      return { ...state, tuning: { ...t, draftWidth: Math.min(w.handMax, t.draftWidth + 1) } };
    case 'luck':
      return { ...state, luck: Math.min(t.luckCap, state.luck + w.luck) };
    case 'forge':
      // Where forge is not built (a cost of 0), a ware must not build it.
      if (t.luckForgeCost <= 0) return state;
      return {
        ...state,
        tuning: { ...t, luckForgeCost: Math.max(w.forgeFloor, t.luckForgeCost - w.forge) },
      };
    case 'pops':
      return { ...state, tuning: { ...t, pointsPerPop: t.pointsPerPop + w.pops } };
    case 'rares':
      return {
        ...state,
        tuning: {
          ...t,
          magicChance: t.magicChance + w.magic,
          uniqueChance: t.uniqueChance + w.unique,
        },
      };
    case 'jackpot':
      return { ...state, tuning: { ...t, rareBonusRate: t.rareBonusRate + w.jackpot } };
    case 'powers':
      return {
        ...state,
        tuning: {
          ...t,
          greenCrowdBonus: t.greenCrowdBonus * w.powers,
          yellowCompanyBonus: t.yellowCompanyBonus * w.powers,
          redAshBonus: t.redAshBonus * w.powers,
          blueTideEvery: t.blueTideEvery > 0 ? Math.max(1, Math.round(t.blueTideEvery / 2)) : 0,
          blueTideCap: t.blueTideCap > 0 ? t.blueTideCap + 1 : 0,
        },
      };
    case 'road':
      return {
        ...state,
        tuning: { ...t, distanceMultiplierCap: t.distanceMultiplierCap + w.road },
      };
    case 'bounty':
      return { ...state, tuning: { ...t, questBonus: t.questBonus + w.bounty } };
    case 'lucky':
      return { ...state, tuning: { ...t, luckPerPop: t.luckPerPop + w.luckyPop } };
    case 'hold':
      return { ...state, tuning: { ...t, holdSlots: t.holdSlots + 1 } };
  }
}
