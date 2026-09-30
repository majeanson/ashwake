import { describe, expect, it } from 'vitest';
import { TUNING } from '@content/tuning';
import { answers, caravanAskAt, picksFor } from '@engine/caravan';
import { newRun, reduce } from '@engine/reduce';
import { stream } from '@engine/rng';
import type { GameState } from '@engine/state';
import { decodeRun, encodeRun } from '@meta/save';
import { decodeReplay, encodeReplay, replayTo } from '@meta/replay';
import { bank20, greedy, type Policy } from './policy';

/**
 * THE CARAVAN, over whole runs (2026-09-29). Marc's two conditions are the
 * spine of this file: _"make sure the strategy of always popping only 1 tile
 * doesnt work out either"_ and _"dont want to have too much longer games"_.
 * `greedy` pops every pocket the moment it ripens, singles and pairs
 * included; `bank20` is the patient line. Both take every ware offered.
 */
const taking = (policy: Policy): Policy => ({
  name: `taking:${policy.name}`,
  note: policy.note,
  decide(state, s) {
    if (state.caravan.offers.length > 0) return [[{ type: 'CARAVAN', pick: 0 }], s];
    return policy.decide(state, s);
  },
});

function play(policy: Policy, seed: number, tuning = TUNING) {
  let state: GameState = newRun(seed, tuning);
  let dice = stream(seed);
  const moves: Parameters<typeof reduce>[1][] = [];
  const from = state;
  for (let steps = 0; state.phase === 'placing' && steps < 20000; steps++) {
    const [move, next] = policy.decide(state, dice);
    dice = next;
    if (move.length === 0) break;
    for (const a of move) {
      const after = reduce(state, a);
      if (after !== state) moves.push(a);
      state = after;
    }
  }
  return { from, state, moves };
}

describe('the caravan, over whole runs', () => {
  const runs = [greedy, bank20].flatMap((p) =>
    Array.from({ length: 12 }, (_, i) => ({ name: p.name, ...play(taking(p), i + 1) })),
  );

  it('is answered only by a pop of the size it asked for, once per ask', () => {
    for (const { state } of runs) {
      expect(new Set(state.caravan.met).size).toBe(state.caravan.met.length);
      for (const index of state.caravan.met) {
        const answered = state.log.harvests.filter((h) => {
          const ask = caravanAskAt(state.rootSeed, h.at, state.tuning);
          return ask?.index === index && answers(h.count, ask.kind);
        });
        expect(answered.length).toBeGreaterThan(0);
      }
    }
  });

  it('never counts a single tile or a pair', () => {
    for (const { state } of runs)
      for (const h of state.log.harvests) {
        if (h.count >= 3) continue;
        const ask = caravanAskAt(state.rootSeed, h.at, state.tuning);
        // A pop this small can land while the caravan is in town; it can
        // never answer it.
        if (ask !== null) expect(answers(h.count, ask.kind)).toBe(false);
      }
  });

  it('owes exactly the wares its answered asks paid, and every one was taken', () => {
    for (const { state } of runs) {
      let owed = 0;
      for (const index of state.caravan.met) {
        const h = state.log.harvests.find(
          (x) => caravanAskAt(state.rootSeed, x.at, state.tuning)?.index === index,
        )!;
        owed += picksFor(caravanAskAt(state.rootSeed, h.at, state.tuning)!.kind, state.tuning);
      }
      expect(state.caravan.made).toBe(owed);
      expect(state.caravan.taken.length + state.caravan.offers.length).toBe(owed);
    }
  });

  it('does not reward popping singles, and makes a run at most a little longer', () => {
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;
    const greedyPts = runs.filter((r) => r.name === 'greedy').map((r) => r.state.points);
    const patientPts = runs.filter((r) => r.name === 'bank20').map((r) => r.state.points);
    expect(median(greedyPts)).toBeLessThan(median(patientPts) / 2);

    for (let seed = 1; seed <= 12; seed++) {
      const withIt = play(taking(bank20), seed).state.placements;
      const without = play(bank20, seed, { ...TUNING, caravanEvery: 0 }).state.placements;
      // Marc, 2026-09-30: _"~ < 20 placements being okay"_ — a ware may make
      // a run better, and a better run lasts a little longer; it may never
      // buy survival outright (`content/caravan.ts`).
      expect(withIt).toBeLessThanOrEqual(without + 20);
    }
  });

  it('survives a reload with an offer waiting, and a poked caravan decodes clean', () => {
    const played = runs.find((r) => r.state.caravan.made > 0)!.state;
    const waiting: GameState = {
      ...played,
      phase: 'placing',
      caravan: { ...played.caravan, offers: [['placing', 'hand', 'luck']] },
    };
    expect(decodeRun(encodeRun(waiting))?.caravan).toEqual(waiting.caravan);

    const poked = JSON.parse(encodeRun(waiting)) as Record<string, unknown>;
    poked['caravan'] = { met: [1, -2, 'x'], offers: [['placing', 'nope', 'hand']], made: 'a' };
    expect(decodeRun(JSON.stringify(poked))?.caravan).toEqual({
      met: [1],
      offers: [],
      made: 0,
      taken: [],
    });
    const old = JSON.parse(encodeRun(waiting)) as Record<string, unknown>;
    delete old['caravan'];
    expect(decodeRun(JSON.stringify(old))?.caravan).toEqual({
      met: [],
      offers: [],
      made: 0,
      taken: [],
    });
  });

  it('replays a run with wares taken to the very same end', () => {
    const r = runs.find((x) => x.state.caravan.taken.length > 0)!;
    const film = decodeReplay(encodeReplay({ from: r.from, moves: r.moves }))!;
    expect(film.moves).toEqual(r.moves);
    const end = replayTo(film, film.moves.length);
    expect(end.points).toBe(r.state.points);
    expect(end.caravan).toEqual(r.state.caravan);
  });
});
