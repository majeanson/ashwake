import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { TUNING } from '@content/tuning';
import { caravanAskAt } from '@engine/caravan';
import { legalPlacements, ripeClusters } from '@engine/rules';
import { newRun, reduce } from '@engine/reduce';
import type { GameState } from '@engine/state';
import { decodeRun, encodeRun } from '@meta/save';
import { stringsFor } from '@text/index';
import { toHudView } from './view';

/**
 * A RUN SAVED BEFORE THE CARAVAN, resumed after it (2026-09-29).
 *
 * Found in review the same evening the caravan shipped: a save keeps its own
 * tuning whole, so a dial added later decodes as `undefined`, and the ask's
 * guard read `caravanEvery <= 0` — false for `undefined` — so the ask loop
 * never ended and every resumed pre-caravan run froze on its first frame.
 * `save.ts` had warned of exactly this since 2026-08-18. This is the test
 * that makes the warning a check: a real run, its new keys stripped the way
 * an old save lacks them, decoded, drawn and played on.
 */
const s = stringsFor(pickLocale(['en']));

const NEW_KEYS = [
  'caravanEvery',
  'caravanAway',
  'caravanWild',
  'caravanWildLife',
  'caravanMultSmall',
  'caravanMultLarge',
  'caravanMultWild',
  'caravanWildPicks',
  'steerSure',
  'steerDraws',
] as const;

/** A run as a pre-caravan build wrote it: no caravan, no new dials, no new split row. */
function oldSave(state: GameState): GameState {
  const raw = JSON.parse(encodeRun(state)) as Record<string, unknown>;
  const tuning = raw['tuning'] as Record<string, unknown>;
  for (const k of NEW_KEYS) delete tuning[k];
  delete raw['caravan'];
  const log = raw['log'] as { harvests: { split?: { bySource: Record<string, number> } }[] };
  for (const h of log.harvests) if (h.split !== undefined) delete h.split.bySource['caravan'];
  const back = decodeRun(JSON.stringify(raw));
  if (back === null) throw new Error('the old save did not decode');
  return back;
}

/** Place and pop until the run ends — a real game on the decoded state. */
function playOn(state: GameState, moves: number): GameState {
  let s = state;
  for (let i = 0; i < moves && s.phase === 'placing'; i++) {
    const pocket = ripeClusters(s.cells)[0];
    if (pocket?.[0] !== undefined) {
      s = reduce(s, { type: 'HARVEST', choice: 'tiles', at: pocket[0] });
      continue;
    }
    const hex = legalPlacements(s.cells, s.tuning)[0];
    if (hex === undefined) break;
    s = reduce(reduce(s, { type: 'SELECT', index: 0 }), { type: 'PLACE', hex });
  }
  return s;
}

describe('a run saved before the caravan', () => {
  it('decodes with no caravan, draws, and plays on without hanging', () => {
    const played = playOn(newRun(9, TUNING), 60);
    const old = oldSave(played);

    expect(old.caravan).toEqual({ met: [], offers: [], made: 0, taken: [] });
    expect(caravanAskAt(old.rootSeed, old.placements, old.tuning)).toBeNull();
    expect(toHudView(old, s).caravan).toBeNull();

    const later = playOn(old, 400);
    expect(later.caravan.met).toEqual([]);
    expect(toHudView(later, s).caravan).toBeNull();
  });

  it('adds up its old harvests on the end screen with no NaN in the sources', () => {
    let ended = oldSave(playOn(newRun(9, TUNING), 60));
    ended = playOn(ended, 2000);
    if (ended.phase !== 'ended') ended = { ...ended, phase: 'ended' };
    const summary = toHudView(ended, s).summary;
    const split = summary?.points ?? null;
    expect(split, 'the ending has no points split').not.toBeNull();
    for (const v of Object.values(split?.bySource ?? {})) expect(Number.isFinite(v)).toBe(true);
  });
});
