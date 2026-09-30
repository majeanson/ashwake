import { describe, expect, it } from 'vitest';
import { CARAVAN_WARES, WARE_IDS } from '@content/caravan';
import { TUNING } from '@content/tuning';
import {
  answers,
  applyWare,
  caravanAskAt,
  caravanMultiplier,
  caravanVisitAt,
  offerFor,
  picksFor,
} from './caravan';
import { newRun, reduce } from './reduce';
import { legalPlacements, ringTiles, ripeClusters } from './rules';
import type { GameState } from './state';

/**
 * The caravan's rule (2026-09-29). `content/caravan.ts` has the why; the run
 * it produces is pinned in `sim/caravan.test.ts`, where a whole game is played.
 */
const T = TUNING;
const off = { ...T, caravanEvery: 0 };

/** The first placement a visit no longer stands at, found by walking the rule. */
const leaves = (seed: number, visit: { index: number; from: number }, t = TUNING): number => {
  let p = visit.from;
  while (caravanAskAt(seed, p, t)?.index === visit.index) p++;
  return p;
};

describe('the caravan asks', () => {
  it('is not there at all with its dial at zero', () => {
    for (let p = 0; p < 200; p += 7) expect(caravanAskAt(1, p, off)).toBeNull();
  });

  it('asks the same thing of the same seed, every time', () => {
    for (let seed = 1; seed <= 20; seed++)
      for (let p = 0; p < 150; p += 3)
        expect(caravanAskAt(seed, p, T)).toEqual(caravanAskAt(seed, p, T));
  });

  it('comes and goes: in town for its stay, away 1 to caravanAway between', () => {
    const wildT = { ...T, caravanWild: 0.15 };
    let wild = 0;
    let visits = 0;
    for (const t of [T, wildT])
      for (let seed = 1; seed <= 60; seed++) {
        let last = null as { index: number; ends: number } | null;
        for (let p = 0; p < 300; p++) {
          const visit = caravanVisitAt(seed, p, t)!;
          const ask = caravanAskAt(seed, p, t);
          // In town exactly while the visit stands; away, the next is named.
          expect(ask).toEqual(p >= visit.from ? visit : null);
          if (visit.index !== last?.index) {
            const ends = leaves(seed, visit, t);
            const gap = visit.from - (last?.ends ?? 0);
            expect(visit.index).toBe((last?.index ?? -1) + 1);
            expect(gap).toBeGreaterThanOrEqual(1);
            expect(gap).toBeLessThanOrEqual(t.caravanAway);
            expect(ends - visit.from).toBe(
              t.caravanEvery * (visit.kind === 2 ? t.caravanWildLife : 1),
            );
            if (visit.kind === 2) wild++;
            visits++;
            last = { index: visit.index, ends };
          }
        }
      }
    // The shipped caravan never asks the outrageous size; one in seven or
    // so of the wild tuning's visits do.
    expect(wild).toBeGreaterThan(visits / 30);
    expect(wild).toBeLessThan(visits / 8);
  });

  it('is never away in a run saved before it could be', () => {
    // No `caravanAway` key at all — the tuning of a run saved on 2026-09-29.
    const before = { ...T, caravanAway: undefined } as unknown as typeof T;
    for (let seed = 1; seed <= 20; seed++) {
      // Always in town: every placement stands inside some ask, and each
      // begins the placement the last one left.
      let last = caravanAskAt(seed, 0, before)!;
      expect(last.from).toBe(0);
      for (let p = 1; p < 200; p++) {
        const ask = caravanAskAt(seed, p, before)!;
        if (ask.index !== last.index) expect(ask.from).toBe(leaves(seed, last, before));
        last = ask;
      }
    }
  });

  it('wants a small pocket or a big one, and never a single tile or a pair', () => {
    for (const kind of [0, 1, 2] as const) {
      expect(answers(1, kind)).toBe(false);
      expect(answers(2, kind)).toBe(false);
    }
    expect([3, 6].every((n) => answers(n, 0))).toBe(true);
    expect([7, 40].every((n) => answers(n, 1))).toBe(true);
    expect([12, 40].every((n) => answers(n, 2))).toBe(true);
    expect(answers(7, 0) || answers(6, 1) || answers(11, 2)).toBe(false);
    // Small or big, half and half: one miss says which it is.
    let small = 0;
    for (let seed = 1; seed <= 200; seed++) if (caravanVisitAt(seed, 0, T)!.kind === 0) small++;
    expect(small).toBeGreaterThan(70);
    expect(small).toBeLessThan(130);
  });

  it('multiplies nothing as shipped, and more wares for the outrageous one', () => {
    for (const kind of [0, 1, 2] as const) expect(caravanMultiplier(kind, T)).toBe(1);
    const dialled = { ...T, caravanMultSmall: 3, caravanMultLarge: 1.5, caravanMultWild: 2 };
    expect(caravanMultiplier(0, dialled)).toBe(3);
    expect(caravanMultiplier(1, dialled)).toBe(1.5);
    expect(caravanMultiplier(2, dialled)).toBe(2);
    expect(caravanMultiplier(0, off)).toBe(1);
    expect(picksFor(0, T)).toBe(1);
    expect(picksFor(1, T)).toBe(1);
    expect(picksFor(2, T)).toBe(3);
  });
});

describe('the caravan sells', () => {
  it('offers three different wares, the same three for the same pick', () => {
    for (let seed = 1; seed <= 30; seed++)
      for (let pick = 0; pick < 10; pick++) {
        const offer = offerFor(seed, pick, T, []);
        expect(new Set(offer).size).toBe(3);
        expect(offer.every((w) => (WARE_IDS as readonly string[]).includes(w))).toBe(true);
        expect(offerFor(seed, pick, T, [])).toEqual(offer);
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
    expect(applyWare(run, 'pops').tuning.pointsPerPop).toBeCloseTo(T.pointsPerPop + w.pops, 9);
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
    // Nor makes a pop score where the tuning says pops score nothing.
    const noPoints = newRun(3, { ...T, pointsPerPop: 0 });
    expect(applyWare(noPoints, 'pops')).toBe(noPoints);
    for (let seed = 1; seed <= 20; seed++)
      expect(offerFor(seed, 0, noPoints.tuning, [])).not.toContain('pops');
  });

  it('never lays the hand out wider than one row of six', () => {
    // The DRAFT and HOLD unlocks together: four cards and two slots. ONE MORE
    // CARD made a seventh column here until 2026-09-30.
    const full = newRun(3, { ...T, draftWidth: 4, holdSlots: 2 });
    expect(applyWare(full, 'hand')).toBe(full);
    expect(applyWare(full, 'hold')).toBe(full);
    for (let seed = 1; seed <= 40; seed++) {
      const offer = offerFor(seed, 0, full.tuning, []);
      expect(offer).not.toContain('hand');
      expect(offer).not.toContain('hold');
    }
    // Room for one: either takes it, and then neither is left.
    let s: GameState = newRun(3, { ...T, draftWidth: 4, holdSlots: 1 });
    s = applyWare(s, 'hold');
    expect(s.tuning.holdSlots).toBe(2);
    expect(applyWare(s, 'hand')).toBe(s);
    // And a run with no stash is not given one.
    const open = newRun(3, { ...T, holdSlots: 0 });
    expect(applyWare(open, 'hold')).toBe(open);
  });

  it('sells ALL POWERS once a run — a second would be survival', () => {
    const run = newRun(3, T);
    const once = applyWare(run, 'powers');
    const had = { ...once, caravan: { ...once.caravan, taken: ['powers' as const] } };
    expect(applyWare(had, 'powers')).toBe(had);
    for (let seed = 1; seed <= 60; seed++)
      expect(offerFor(seed, 0, had.tuning, had.caravan.taken)).not.toContain('powers');
    // And it IS offered before then, somewhere in sixty runs.
    expect(Array.from({ length: 60 }, (_, i) => offerFor(i + 1, 0, T, [])).flat()).toContain(
      'powers',
    );
    // Queued behind the pick that took it, it is drawn again without it.
    const queued: GameState = {
      ...run,
      caravan: {
        ...run.caravan,
        made: 2,
        offers: [
          ['powers', 'placing', 'size'],
          ['powers', 'luck', 'size'],
        ],
      },
    };
    const took = reduce(queued, { type: 'CARAVAN', pick: 0 });
    expect(took.caravan.offers[0]).not.toContain('powers');
  });

  it('turns up the system each new ware names, and builds none that is off', () => {
    const run = newRun(3, T);
    const w = CARAVAN_WARES;
    const t = (ware: (typeof WARE_IDS)[number]) => applyWare(run, ware).tuning;
    expect(t('rares').magicChance).toBeCloseTo(T.magicChance + w.magic, 9);
    expect(t('rares').uniqueChance).toBeCloseTo(T.uniqueChance + w.unique, 9);
    expect(t('jackpot').rareBonusRate).toBe(T.rareBonusRate + w.jackpot);
    expect(t('powers').greenCrowdBonus).toBeCloseTo(T.greenCrowdBonus * w.powers, 9);
    expect(t('powers').yellowCompanyBonus).toBeCloseTo(T.yellowCompanyBonus * w.powers, 9);
    expect(t('powers').redAshBonus).toBeCloseTo(T.redAshBonus * w.powers, 9);
    expect(t('powers').blueTideEvery).toBe(Math.round(T.blueTideEvery / 2));
    expect(t('powers').blueTideCap).toBe(T.blueTideCap + 1);
    expect(t('road').distanceMultiplierCap).toBe(T.distanceMultiplierCap + w.road);
    expect(t('bounty').questBonus).toBe(T.questBonus + w.bounty);
    expect(t('lucky').luckPerPop).toBe(T.luckPerPop + w.luckyPop);

    const bare = newRun(3, {
      ...T,
      magicChance: 0,
      greenCrowdBonus: 0,
      yellowCompanyBonus: 0,
      redAshMatches: false,
      blueTideEvery: 0,
      distanceMultiplierCap: 0,
      questNeed: 0,
      luckPerPop: 0,
    });
    const off = ['rares', 'jackpot', 'powers', 'road', 'bounty', 'lucky'] as const;
    for (const ware of off) expect(applyWare(bare, ware)).toBe(bare);
    for (let seed = 1; seed <= 40; seed++)
      for (const ware of offerFor(seed, 0, bare.tuning, [])) expect(off).not.toContain(ware);
  });

  it('pays THE ROAD in points, never in tiles', () => {
    // Found in review, 2026-09-30: the raised ceiling fed `popTilesPerRing`
    // too, so a far pop paid tiles the run did not have before the ware.
    const run = newRun(3, T);
    const cap = T.distanceMultiplierCap;
    const bought = reduce(
      { ...run, caravan: { ...run.caravan, made: 1, offers: [['road', 'placing', 'size']] } },
      { type: 'CARAVAN', pick: 0 },
    );
    expect(bought.tuning.distanceMultiplierCap).toBe(cap + CARAVAN_WARES.road);
    expect(ringTiles(bought, 8, cap + CARAVAN_WARES.road)).toBe(ringTiles(run, 8, cap));
    expect(ringTiles(bought, 8, cap)).toBe(ringTiles(run, 8, cap));
    expect(ringTiles(run, 8, cap)).toBeGreaterThan(0);
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
    expect(took.caravan.offers).toEqual([offerFor(5, 1, took.tuning, took.caravan.taken)]);
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
        const offer = offerFor(seed, pick, full, []);
        expect(offer).toHaveLength(3);
        expect(offer).not.toContain('hand');
        expect(offer).not.toContain('forge');
        expect(offerFor(seed, pick, noForge, [])).not.toContain('forge');
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
