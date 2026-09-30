import { describe, expect, it } from 'vitest';
import { CARAVAN_WARES, WARE_IDS } from '@content/caravan';
import { TUNING } from '@content/tuning';
import { answers, applyWare, caravanAskAt, caravanMultiplier, offerFor, picksFor } from './caravan';
import { newRun, reduce } from './reduce';
import { legalPlacements, ripeClusters } from './rules';
import type { GameState } from './state';

/**
 * The caravan's rule (2026-09-29). `content/caravan.ts` has the why; the run
 * it produces is pinned in `sim/caravan.test.ts`, where a whole game is played.
 */
const T = TUNING;
const off = { ...T, caravanEvery: 0 };

describe('the caravan asks', () => {
  it('is not there at all with its dial at zero', () => {
    for (let p = 0; p < 200; p += 7) expect(caravanAskAt(1, p, off)).toBeNull();
  });

  it('asks the same thing of the same seed, every time', () => {
    for (let seed = 1; seed <= 20; seed++)
      for (let p = 0; p < 150; p += 3)
        expect(caravanAskAt(seed, p, T)).toEqual(caravanAskAt(seed, p, T));
  });

  it('runs its asks end to end, the outrageous ones three times as long', () => {
    let wild = 0;
    for (let seed = 1; seed <= 60; seed++) {
      let last = caravanAskAt(seed, 0, T)!;
      expect(last.from).toBe(0);
      for (let p = 1; p < 300; p++) {
        const ask = caravanAskAt(seed, p, T)!;
        if (ask.index !== last.index) {
          expect(ask.index).toBe(last.index + 1);
          expect(ask.from).toBe(last.ends);
          last = ask;
        }
        expect(ask.ends - ask.from).toBe(T.caravanEvery * (ask.kind === 3 ? T.caravanWildLife : 1));
        if (ask.kind === 3 && ask.from === p) wild++;
      }
    }
    // One in seven or so, across sixty runs of thirty-odd asks.
    expect(wild).toBeGreaterThan(100);
    expect(wild).toBeLessThan(500);
  });

  it('never takes a single tile or a pair, at any band', () => {
    for (const kind of [0, 1, 2, 3] as const) {
      expect(answers(1, kind)).toBe(false);
      expect(answers(2, kind)).toBe(false);
    }
    expect([3, 4].every((n) => answers(n, 0))).toBe(true);
    expect([5, 8].every((n) => answers(n, 1))).toBe(true);
    expect([9, 11].every((n) => answers(n, 2))).toBe(true);
    expect([12, 40].every((n) => answers(n, 3))).toBe(true);
    expect(answers(5, 0) || answers(4, 1) || answers(12, 2) || answers(11, 3)).toBe(false);
  });

  it('pays most for the smallest ask, and more wares for the outrageous one', () => {
    expect(caravanMultiplier(0, T)).toBe(3);
    expect(caravanMultiplier(1, T)).toBe(2);
    expect(caravanMultiplier(2, T)).toBe(1.5);
    expect(caravanMultiplier(3, T)).toBe(2);
    expect(caravanMultiplier(0, off)).toBe(3);
    expect(picksFor(0, T)).toBe(1);
    expect(picksFor(3, T)).toBe(3);
  });
});

describe('the caravan sells', () => {
  it('offers three different wares, the same three for the same pick', () => {
    for (let seed = 1; seed <= 30; seed++)
      for (let pick = 0; pick < 10; pick++) {
        const offer = offerFor(seed, pick, T);
        expect(new Set(offer).size).toBe(3);
        expect(offer.every((w) => (WARE_IDS as readonly string[]).includes(w))).toBe(true);
        expect(offerFor(seed, pick, T)).toEqual(offer);
      }
  });

  it('changes what the rest of the run is worth, never how long it lasts', () => {
    const run = newRun(3, T);
    const w = CARAVAN_WARES;
    expect(applyWare(run, 'placing').tuning.identityBonusRate).toBe(
      T.identityBonusRate + w.placing,
    );
    expect(applyWare(run, 'size').tuning.harvestSizeBonus).toBeCloseTo(
      T.harvestSizeBonus + w.size,
      9,
    );
    expect(applyWare(run, 'luck').luck).toBe(run.luck + w.luck);
    expect(applyWare(run, 'forge').tuning.luckForgeCost).toBe(
      Math.max(w.forgeFloor, T.luckForgeCost - w.forge),
    );
    // Nothing a ware touches is the purse, the cost curve or the clock.
    for (const ware of WARE_IDS) {
      const after = applyWare(run, ware);
      expect(after.tiles).toBe(run.tiles);
      expect(after.tuning.costRisesEvery).toBe(T.costRisesEvery);
      expect(after.tuning.baseCost).toBe(T.baseCost);
      expect(after.tuning.runLength).toBe(T.runLength);
    }
  });

  it('caps the hand, floors the forge, and never builds a forge that is not there', () => {
    let s: GameState = newRun(3, T);
    for (let i = 0; i < 6; i++) s = applyWare(s, 'hand');
    expect(s.tuning.draftWidth).toBe(CARAVAN_WARES.handMax);
    for (let i = 0; i < 6; i++) s = applyWare(s, 'forge');
    expect(s.tuning.luckForgeCost).toBe(CARAVAN_WARES.forgeFloor);
    const noForge = newRun(3, { ...T, luckForgeCost: 0 });
    expect(applyWare(noForge, 'forge')).toBe(noForge);
  });

  it('takes the ware picked from the oldest offer, and refuses what it cannot', () => {
    const run = newRun(5, T);
    const offered: GameState = {
      ...run,
      caravan: {
        ...run.caravan,
        made: 2,
        offers: [
          ['placing', 'size', 'hand'],
          ['luck', 'forge', 'size'],
        ],
      },
    };
    const took = reduce(offered, { type: 'CARAVAN', pick: 1 });
    expect(took.tuning.harvestSizeBonus).toBeCloseTo(T.harvestSizeBonus + CARAVAN_WARES.size, 9);
    // The offer still waiting is drawn again against the run as it now is.
    expect(took.caravan.offers).toEqual([offerFor(5, 1, took.tuning)]);
    expect(took.caravan.taken).toEqual(['size']);

    expect(reduce(offered, { type: 'CARAVAN', pick: 3 })).toBe(offered);
    expect(reduce(run, { type: 'CARAVAN', pick: 0 })).toBe(run);
  });
});

/*
 * FOUND IN REVIEW (2026-09-29), each pinned where it lives.
 */
describe('what the review found', () => {
  it('never offers a ware the run cannot use, and re-draws the queue after a pick', () => {
    const full = {
      ...T,
      draftWidth: CARAVAN_WARES.handMax,
      luckForgeCost: CARAVAN_WARES.forgeFloor,
    };
    const noForge = { ...T, luckForgeCost: 0 };
    for (let seed = 1; seed <= 40; seed++)
      for (let pick = 0; pick < 8; pick++) {
        const offer = offerFor(seed, pick, full);
        expect(offer).toHaveLength(3);
        expect(offer).not.toContain('hand');
        expect(offer).not.toContain('forge');
        expect(offerFor(seed, pick, noForge)).not.toContain('forge');
      }

    // Three offers queued (an outrageous ask), and the first pick is the fifth
    // card: nothing still waiting may offer a sixth.
    const run = newRun(5, { ...T, draftWidth: CARAVAN_WARES.handMax - 1 });
    const queued: GameState = {
      ...run,
      caravan: {
        ...run.caravan,
        made: 3,
        offers: [
          ['hand', 'placing', 'size'],
          ['hand', 'luck', 'size'],
          ['hand', 'placing', 'luck'],
        ],
      },
    };
    const took = reduce(queued, { type: 'CARAVAN', pick: 0 });
    expect(took.tuning.draftWidth).toBe(CARAVAN_WARES.handMax);
    expect(took.caravan.offers).toHaveLength(2);
    for (const offer of took.caravan.offers) expect(offer).not.toContain('hand');
  });

  it('keeps a paid steer through a pop in between', () => {
    // Play until a pocket is ripe, then steer, then pop that pocket.
    let run: GameState = newRun(8, T);
    for (let i = 0; i < 200 && ripeClusters(run.cells).length === 0; i++) {
      const hex = legalPlacements(run.cells, run.tuning)[0];
      if (hex === undefined) break;
      run = reduce(reduce(run, { type: 'SELECT', index: 0 }), { type: 'PLACE', hex });
    }
    const pocket = ripeClusters(run.cells)[0];
    expect(pocket).toBeDefined();
    const steered = reduce({ ...run, luck: 100 }, { type: 'SPEND', on: 'steer', colour: 'red' });
    expect(steered.bias).toEqual({ colour: 'red', left: 3, sure: true });
    const popped = reduce(steered, { type: 'HARVEST', choice: 'tiles', at: pocket![0]! });
    expect(popped.log.harvests.length).toBe(steered.log.harvests.length + 1);
    // A pop's own lean is free; it must not overwrite a guarantee paid for.
    expect(popped.bias).toEqual({ colour: 'red', left: 3, sure: true });
    const hex = legalPlacements(popped.cells, popped.tuning)[0]!;
    const next = reduce(reduce(popped, { type: 'SELECT', index: 0 }), { type: 'PLACE', hex });
    expect(next.draft.every((t) => t.colour === 'red')).toBe(true);
  });
});
