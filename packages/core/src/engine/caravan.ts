import {
  CARAVAN_BANDS,
  CARAVAN_WARES,
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

/** One ask: which it is in the run's sequence, its band, and when it stands. */
export type CaravanAsk = {
  readonly index: number;
  readonly kind: CaravanKind;
  /** The first placement it stands at, and the first it no longer does. */
  readonly from: number;
  readonly ends: number;
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
 * The ask standing at `placements`, or null where there is no caravan.
 *
 * A seeded sequence: each ordinary ask stands `caravanEvery` placements, an
 * outrageous one `caravanWildLife` times that, so a pocket of 12 has the time
 * it takes to be grown.
 */
export function caravanAskAt(seed: number, placements: number, t: Tuning): CaravanAsk | null {
  if (t.caravanEvery <= 0) return null;
  let from = 0;
  for (let index = 0; ; index++) {
    const h = mix(seed, index);
    const wild = (h % 10000) / 10000 < t.caravanWild;
    const kind = (wild ? 3 : (h >>> 14) % 3) as CaravanKind;
    const ends = from + t.caravanEvery * (wild ? Math.max(1, t.caravanWildLife) : 1);
    if (placements < ends) return { index, kind, from, ends };
    from = ends;
  }
}

/** Whether a pocket of `size` answers an ask of this band. */
export const answers = (size: number, kind: CaravanKind): boolean =>
  size >= CARAVAN_BANDS[kind][0] && size <= CARAVAN_BANDS[kind][1];

/** What the pop that answers an ask of this band is multiplied by. */
export function caravanMultiplier(kind: CaravanKind, t: Tuning): number {
  const m =
    [t.caravanMultSmall, t.caravanMultMedium, t.caravanMultLarge, t.caravanMultWild][kind] ?? 0;
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
  kind === 3 ? Math.max(1, t.caravanWildPicks) : 1;

/**
 * Three different wares, for the `pick`-th offer the run has been made.
 * Seeded like the asks, so the same run is offered the same wares.
 */
export function offerFor(seed: number, pick: number): readonly WareId[] {
  const out: WareId[] = [];
  for (let n = 0; out.length < 3; n++) {
    const ware = WARE_IDS[mix(seed ^ 0x5bd1e995, pick * 97 + n) % WARE_IDS.length]!;
    if (!out.includes(ware)) out.push(ware);
  }
  return out;
}

/** A ware, applied to the rest of the run. Never to its length — see `CARAVAN_WARES`. */
export function applyWare(state: GameState, ware: WareId): GameState {
  const t = state.tuning;
  const w = CARAVAN_WARES;
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
  }
}
