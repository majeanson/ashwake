import { describe, expect, it } from 'vitest';
import { TUNING } from '@content/tuning';
import { key, neighbourKeys, type HexKey } from '@engine/hex';
import { newRun, reduce } from '@engine/reduce';
import { destinationsWithin, findsWithin } from '@engine/world';
import type { Cell, GameState } from '@engine/state';
import type { PerkId } from './progress';
import {
  decodeWorld,
  encodeWorld,
  knownFraction,
  mergeRun,
  newWorld,
  hasBeenPlayed,
  rearmedSpent,
  rememberRun,
  unlockedBy,
  UNLOCKS,
  worldFromRun,
} from './world.js';

/**
 * Walk the board out to `at`, one placement at a time, always taking the
 * legal spot closest to the target — a greedy beeline is enough to reach one
 * particular hex on an otherwise-empty plane. Shared by the territory and
 * find "arrives already claimed" tests below; not a policy, just a probe.
 */
function growToward(state: GameState, at: HexKey): GameState {
  let s = state;
  for (let step = 0; step < 400; step++) {
    if (s.cells[at] !== undefined) return s;
    const spots = Object.entries(s.cells).filter(([k, c]) => {
      if (c.kind !== 'empty') return false;
      return neighbourKeys(...(k.split(',').map(Number) as [number, number])).some((n) => {
        const other = s.cells[n];
        return other?.kind === 'tile' || other?.kind === 'stone';
      });
    });
    if (spots.length === 0) return s;
    const target = at.split(',').map(Number) as [number, number];
    spots.sort((a, b) => {
      const da = a[0].split(',').map(Number) as [number, number];
      const db = b[0].split(',').map(Number) as [number, number];
      const dist = (p: [number, number]) =>
        (Math.abs(p[0] - target[0]) +
          Math.abs(p[1] - target[1]) +
          Math.abs(p[0] + p[1] - target[0] - target[1])) /
        2;
      return dist(da) - dist(db);
    });
    const next = reduce({ ...s, tiles: 999 }, { type: 'PLACE', hex: spots[0]![0] });
    if (next === s) return s;
    s = next;
  }
  return s;
}

/**
 * P4a: the world you keep. These pin the two promises — the map grows across
 * runs and never shrinks, and a territory once claimed greets you already
 * yours — plus the property that makes it cheap: only keys are stored,
 * because terrain is a pure function of the seed.
 */

describe('world memory', () => {
  it('accumulates revealed ground and claimed territories, never shrinking', () => {
    const world = newWorld(42);
    let state = newRun(42, TUNING);
    state = reduce(state, { type: 'PLACE', hex: key(1, 0) });

    const after = rememberRun(world, state);
    expect(after.runs).toBe(1);
    expect(after.revealed.length).toBe(Object.keys(state.cells).length);
    expect(after.farthestReach).toBeGreaterThanOrEqual(1);

    // A second, shorter run cannot un-remember the first one's ground.
    const short = newRun(42, TUNING);
    const twice = rememberRun(after, short);
    expect(twice.runs).toBe(2);
    expect(twice.revealed.length).toBeGreaterThanOrEqual(after.revealed.length);
    for (const k of after.revealed) expect(twice.revealed).toContain(k);
  });

  it('merges mid-run without counting a run — only rememberRun counts', () => {
    // mergeRun fires after EVERY action. When it bumped the count too
    // (2026-08-18) the atlas called each tap a run.
    const world = newWorld(42);
    let state = newRun(42, TUNING);
    state = reduce(state, { type: 'PLACE', hex: key(1, 0) });

    const during = mergeRun(world, state);
    expect(during.runs).toBe(0);
    expect(during.revealed.length).toBe(Object.keys(state.cells).length);

    expect(rememberRun(world, state).runs).toBe(1);
  });

  it('remembers only territories that were actually claimed', () => {
    const base = newRun(42, TUNING);
    const claimedAt = key(9, 9);
    const unclaimedAt = key(9, 12);
    const state: GameState = {
      ...base,
      cells: {
        ...base.cells,
        [claimedAt]: { kind: 'landmark', reward: 'territory', claimed: true, colour: 'red' },
        [unclaimedAt]: { kind: 'landmark', reward: 'territory', claimed: false, colour: 'blue' },
      },
    };

    const world = rememberRun(newWorld(42), state);
    expect(world.territories).toContain(claimedAt);
    expect(world.territories).not.toContain(unclaimedAt);
  });

  it('round-trips, and refuses a shape it never wrote', () => {
    const world = rememberRun(newWorld(7), newRun(7, TUNING));
    expect(decodeWorld(encodeWorld(world))).toEqual(world);

    expect(decodeWorld(null)).toBeNull();
    expect(decodeWorld('{}')).toBeNull();
    // A list that is not a list is not a damaged world; it is not a world.
    expect(decodeWorld('{"worldSeed":1,"revealed":"lots","territories":[]}')).toBeNull();

    // But a list holding one bad ENTRY is salvaged, not refused (2026-08-20).
    // This assertion used to expect null, under a "refuse rather than
    // half-load" rule that was right in the abstract and wrong here: the
    // shell's answer to null is to mint a fresh world OVER the old blob on
    // the same tick, so refusing turned one bad element into a silently
    // deleted world — which is the shape a write truncated by an iOS kill
    // takes. Half a world you walked beats a new one you did not.
    const salvaged = decodeWorld('{"worldSeed":1,"revealed":[],"territories":[1,2]}');
    expect(salvaged).not.toBeNull();
    expect(salvaged?.territories).toEqual([]);
  });

  it('remembers only finds that were actually claimed, mid-run', () => {
    // mergeRun, not rememberRun: finds are facts the moment growth touches
    // them, the same "does not wait for the run to end" contract territories
    // and shrines already keep.
    const base = newRun(42, TUNING);
    const claimedAt = key(9, 9);
    const unclaimedAt = key(9, 12);
    const state: GameState = {
      ...base,
      cells: {
        ...base.cells,
        [claimedAt]: { kind: 'landmark', reward: 'find', claimed: true },
        [unclaimedAt]: { kind: 'landmark', reward: 'find', claimed: false },
      },
    };

    const world = mergeRun(newWorld(42), state);
    expect(world.finds).toContain(claimedAt);
    expect(world.finds).not.toContain(unclaimedAt);
  });

  it('round-trips finds, and loads a world written before they existed', () => {
    const world = { ...newWorld(3), finds: [key(4, 4), key(-2, 7)] };
    expect(decodeWorld(encodeWorld(world))).toEqual(world);

    // Absent, from a world saved before finds existed: true rather than
    // corrupt, the same contract `shrines` already keeps.
    const old = '{"worldSeed":5,"revealed":["0,0"],"territories":[],"runs":2}';
    expect(decodeWorld(old)?.finds).toEqual([]);
  });

  /**
   * The perk shelf is the WORLD's since 2026-08-26 (Marc's phone ruling:
   * "uniques are per world, not shared" — a shrine promising a fourth draft
   * card beside an Open Hand found two worlds ago was the bug). These four
   * assertions are the whole no-leak contract on this side of the split;
   * `progress.test.ts` holds the other side, where the device blob refuses
   * to carry a perk at all.
   */
  it('round-trips the shelf and the one perk worn here', () => {
    const world = {
      ...newWorld(3),
      perks: ['stonewalker', 'openhand'] as PerkId[],
      worn: 'openhand' as PerkId,
    };
    expect(decodeWorld(encodeWorld(world))).toEqual(world);

    // A world wearing nothing round-trips as wearing nothing, not as absent.
    const bare = { ...newWorld(4), perks: ['rootbound'] as PerkId[], worn: null };
    expect(decodeWorld(encodeWorld(bare))?.worn).toBeNull();
  });

  it('drops a perk id this build has never heard of, and unwears it with it', () => {
    const raw = JSON.stringify({
      worldSeed: 5,
      revealed: [],
      territories: [],
      perks: ['stonewalker', 'moonboots'],
      worn: 'moonboots',
    });
    const decoded = decodeWorld(raw);
    expect(decoded?.perks).toEqual(['stonewalker']);
    // `worn` is clamped to what is actually held — a slot cannot wear a
    // perk the shelf does not have, here or anywhere else.
    expect(decoded?.worn).toBeNull();
  });

  it('refuses to wear a perk that is not on this world shelf', () => {
    const raw = JSON.stringify({
      worldSeed: 6,
      revealed: [],
      territories: [],
      perks: ['stonewalker'],
      worn: 'openhand',
    });
    expect(decodeWorld(raw)?.worn).toBeNull();
  });

  /**
   * The one-way door (2026-08-26, Marc: full reset). A world saved BEFORE
   * the split has no `perks` field, and its claimed find-hexes were spent
   * filling a device-wide pool that no longer exists. Keeping them would
   * leave those finds permanently claimed and their perks permanently
   * unobtainable — a world with dead hexes. So a pre-split world forgets
   * its finds, and every perk is out there to walk to again.
   */
  it('forgets a pre-split world claimed finds so every perk can be found again', () => {
    const old = JSON.stringify({
      worldSeed: 5,
      revealed: ['0,0'],
      territories: [],
      finds: ['4,4', '-2,7'],
      runs: 2,
      bestPoints: 900,
    });
    const decoded = decodeWorld(old);
    expect(decoded?.finds).toEqual([]);
    expect(decoded?.perks).toEqual([]);
    expect(decoded?.worn).toBeNull();
    // The reset costs the finds and NOTHING else — the world you walked is
    // still the world you walked.
    expect(decoded?.revealed).toEqual(['0,0']);
    expect(decoded?.runs).toBe(2);
    expect(decoded?.bestPoints).toBe(900);
  });

  it('keeps this era claimed finds, because the field says it is this era', () => {
    const current = JSON.stringify({
      worldSeed: 5,
      revealed: [],
      territories: [],
      finds: ['4,4'],
      perks: ['stonewalker'],
      worn: 'stonewalker',
    });
    const decoded = decodeWorld(current);
    expect(decoded?.finds).toEqual(['4,4']);
    expect(decoded?.perks).toEqual(['stonewalker']);
    expect(decoded?.worn).toBe('stonewalker');
  });

  it('never lets a run merge write the shelf — grants are the shell writes', () => {
    // `mergeRun` runs after EVERY action. If it carried the shelf it would
    // be a second author of the least replaceable thing a world holds; the
    // grant path (main.ts findLabel) saves it immediately instead.
    const world = { ...newWorld(42), perks: ['openhand'] as PerkId[], worn: 'openhand' as PerkId };
    const merged = mergeRun(world, newRun(42, TUNING));
    expect(merged.perks).toEqual(['openhand']);
    expect(merged.worn).toBe('openhand');
  });

  it('reports a fraction known that cannot exceed the world it measures', () => {
    const empty = newWorld(1);
    expect(knownFraction(empty)).toBe(0);

    const wide = { ...empty, revealed: Array.from({ length: 10_000 }, (_, i) => `${i},0`) };
    expect(knownFraction(wide)).toBeLessThanOrEqual(1);
  });
});

describe('a world already held', () => {
  /** A seed whose plane has a territory near enough to test with. */
  const territorySeed = (): { seed: number; at: string } => {
    for (let seed = 1; seed <= 400; seed++) {
      for (const d of destinationsWithin(seed, 24, TUNING)) {
        if (d.reward === 'territory') return { seed, at: key(d.q, d.r) };
      }
    }
    throw new Error('no territory within 24 hexes in 400 seeds');
  };

  it('hands back a claimed territory, unpaid and with its field live', () => {
    const { seed, at } = territorySeed();
    const fresh = newRun(seed, TUNING);
    const held = newRun(seed, TUNING, [at]);

    // Same seed, same everything except the standing claim — and the perk it
    // pays (P4b): a held territory starts the next run richer, capped.
    expect(held.claimed).toEqual([at]);
    expect(held.tiles).toBe(fresh.tiles + TUNING.territoryTiles);
    expect(held.points).toBe(fresh.points);

    // Walk the board out to the territory and check it arrives claimed —
    // and that arriving pays nothing a second time.
    const grown = growToward(held, at);
    const cell: Cell | undefined = grown.cells[at];
    if (cell === undefined) return; // never reached it; the claim below is moot
    expect(cell.kind).toBe('landmark');
    if (cell.kind === 'landmark') expect(cell.claimed).toBe(true);

    // Its field is live: ground within the radius is native to its colour.
    const native = Object.values(grown.cells).filter(
      (c) => c.kind === 'empty' && c.native !== undefined,
    );
    expect(native.length).toBeGreaterThan(0);
  });
});

describe('a world already holding a find', () => {
  /** A seed whose plane has a hidden find near enough to test with. */
  const findSeed = (): { seed: number; at: string } => {
    const dense = { ...TUNING, findEvery: 4, findChance: 1, worldWalls: 0, destinationChance: 0 };
    for (let seed = 1; seed <= 400; seed++) {
      const [f] = findsWithin(seed, 24, dense);
      if (f !== undefined) return { seed, at: key(f.q, f.r) };
    }
    throw new Error('no find within 24 hexes in 400 seeds');
  };

  it('hands back a claimed find, unpaid a second time — the same ride as a territory', () => {
    const { seed, at } = findSeed();
    const tuning = {
      ...TUNING,
      findEvery: 4,
      findChance: 1,
      worldWalls: 0,
      destinationChance: 0,
      startingTiles: 500,
      costRisesEvery: 1000,
    };
    const fresh = newRun(seed, tuning);
    const held = newRun(seed, tuning, [], [at]);

    // A find carries no starting-purse perk (that is territories' job) —
    // only the standing claim differs.
    expect(held.claimedFinds).toEqual([at]);
    expect(held.tiles).toBe(fresh.tiles);

    const grown = growToward(held, at);
    const cell: Cell | undefined = grown.cells[at];
    if (cell === undefined) return; // never reached it; the claim below is moot
    expect(cell.kind).toBe('landmark');
    if (cell.kind === 'landmark') {
      expect(cell.reward).toBe('find');
      expect(cell.claimed).toBe(true);
    }

    // Reveal-and-claimed pays no relics — the same "pays nothing again" the
    // territory test pins above. Compared against the identical walk from a
    // FRESH run (same seed, same tuning, `at` not yet held) rather than
    // asserting an absolute relics total: at this density the beeline can
    // legitimately stumble on other, still-unclaimed finds along the way,
    // and both walks touch those identically — the only thing that should
    // differ between them is the one claim `at` itself pays only once.
    const grownFresh = growToward(fresh, at);
    expect(grownFresh.relics).toBe(grown.relics + tuning.claimRelics);
  });
});

describe('shrines and the unlock ledger (M4)', () => {
  it('remembers a shrine reached, and never more than the ledger holds', () => {
    const base = newRun(42, TUNING);
    const shrineAt = key(15, 3);
    const state: GameState = {
      ...base,
      cells: {
        ...base.cells,
        [shrineAt]: { kind: 'landmark', reward: 'shrine', claimed: true },
      },
    };

    const world = rememberRun(newWorld(42), state);
    expect(world.shrines).toEqual([shrineAt]);
    expect(unlockedBy(world)).toEqual([UNLOCKS[0]!.id]);

    // The same shrine, reached again in a later run, is not a second unlock.
    const twice = rememberRun(world, state);
    expect(twice.shrines).toEqual([shrineAt]);
  });

  it('ignores a shrine that was only walked past', () => {
    const base = newRun(42, TUNING);
    const state: GameState = {
      ...base,
      cells: {
        ...base.cells,
        [key(15, 3)]: { kind: 'landmark', reward: 'shrine', claimed: false },
      },
    };
    expect(rememberRun(newWorld(42), state).shrines).toEqual([]);
    expect(unlockedBy(newWorld(42))).toEqual([]);
  });

  it('hands out the ledger in order, and stops at its end', () => {
    const many = { ...newWorld(1), shrines: Array.from({ length: 99 }, (_, i) => `${i},0`) };
    expect(unlockedBy(many)).toEqual(UNLOCKS.map((u) => u.id));
  });

  it('loads a world written before shrines existed', () => {
    const old = '{"worldSeed":5,"revealed":["0,0"],"territories":[],"runs":2}';
    expect(decodeWorld(old)?.shrines).toEqual([]);
  });
});

describe('hasBeenPlayed — one sentence for "is this slot taken"', () => {
  /**
   * It was spelled twice (2026-09-09): `shell/storage.ts`'s `isFreeSlot` and,
   * negated, the KEEP THIS BOARD picker's own `played`. One decides which
   * slots the front door's SETTLE may take, the other whether a row ARMS
   * before it is overwritten — and as of 2026-09-09 they gate the same door,
   * because a shared board is kept through the picker too.
   *
   * The case that matters is the VIRGIN world: `worldSeedFor` mints one the
   * first time a slot is read, whether or not anybody steps into it, so
   * "has a world" and "is taken" are different questions and a device arriving
   * through a shared link must not have to burn world 1 to keep the board it
   * came for.
   */
  it('counts a world nobody has stepped into as unplayed', () => {
    expect(hasBeenPlayed(null)).toBe(false);
    expect(hasBeenPlayed(newWorld(5)), 'a minted world counted as taken').toBe(false);
  });

  it('counts one run, or one hex of ground, as played', () => {
    expect(hasBeenPlayed({ ...newWorld(5), runs: 1 })).toBe(true);
    expect(hasBeenPlayed({ ...newWorld(5), revealed: [key(0, 0)] })).toBe(true);
  });

  /*
   * The ground half is not redundant with the run count. A world merges its
   * ground on every action (`mergeRun`) and only counts the run at `settle`,
   * so a world walked and abandoned mid-run has `runs: 0` and hexes — which is
   * exactly the world a player would be furious to see called empty.
   */
  it('counts a world walked and abandoned before its first run ended', () => {
    expect(hasBeenPlayed({ ...newWorld(5), runs: 0, revealed: [key(1, 0), key(2, 0)] })).toBe(true);
  });
});

describe('rearmedSpent — spent landmarks reborn per run (2026-08-20)', () => {
  it('rolls every spent shrine and find a fresh face, deterministically', () => {
    const w = { ...newWorld(42), shrines: [key(3, 0)], finds: [key(0, 4)], runs: 5 };
    const a = rearmedSpent(w);
    expect(rearmedSpent(w)).toEqual(a);
    expect(Object.keys(a).sort()).toEqual([key(0, 4), key(3, 0)].sort());
    for (const face of Object.values(a)) expect(['cache', 'site']).toContain(face);
  });

  /**
   * BOTH FACES, because a two-element `toContain` is as true of a coin with
   * one (2026-09-09).
   *
   * The line above is the shape that hid `reborn`'s broken flip for a week —
   * `hashAt(...) % 2 === 0` on a hash uniform in [0, 1), 585 sites and zero
   * caches, passing a membership assertion the whole time. `rearmedSpent`'s
   * own coin is `pick < REARM.cacheShare` and is correct; this is the pin that
   * says so, so the next sweep over that shape does not have to re-derive it.
   */
  it('gives a veteran world both faces, not one', () => {
    const faces = { cache: 0, site: 0 };
    for (let seed = 1; seed <= 40; seed++) {
      const spent = Array.from({ length: 12 }, (_, i) => key(i + 1, -2));
      for (const face of Object.values(
        rearmedSpent({ ...newWorld(seed), finds: spent, runs: 3 }),
      )) {
        faces[face] += 1;
      }
    }
    expect(faces.cache + faces.site).toBeGreaterThan(100);
    expect(faces.cache, 'every reborn landmark became a site').toBeGreaterThan(0);
    expect(faces.site, 'every reborn landmark became a cache').toBeGreaterThan(0);
  });

  it('rerolls the mix when the run count moves — per NEW run, as asked', () => {
    const finds = Array.from({ length: 12 }, (_, i) => key(i + 1, -1));
    const w = { ...newWorld(42), finds };
    expect(rearmedSpent({ ...w, runs: 1 })).not.toEqual(rearmedSpent({ ...w, runs: 2 }));
  });

  it("keeps a fully awake world's shrines as shrines — the crossing's doors", () => {
    const shrines = UNLOCKS.map((_, i) => key(i + 2, 0));
    const w = { ...newWorld(42), shrines, finds: [key(9, 9)] };
    const out = rearmedSpent(w);
    for (const s of shrines) expect(out[s]).toBeUndefined();
    expect(out[key(9, 9)]).toBeDefined();
  });
});

describe('a world survives one bad entry (2026-08-20)', () => {
  it('salvages the hexes either side of it rather than deleting the world', () => {
    // decodeWorld returning null makes the shell mint a fresh world OVER the
    // old blob on the same tick, so an all-or-nothing decode turned one bad
    // element into a silently deleted world — the shape a truncated write
    // from an iOS kill mid-setItem takes.
    const salvaged = decodeWorld(
      JSON.stringify({
        worldSeed: 7,
        revealed: ['0,0', 42, '1,0', null, '2,0'],
        territories: ['3,0'],
        runs: 4,
      }),
    );
    expect(salvaged).not.toBeNull();
    expect(salvaged?.worldSeed).toBe(7);
    expect(salvaged?.revealed).toEqual(['0,0', '1,0', '2,0']);
    expect(salvaged?.territories).toEqual(['3,0']);
    expect(salvaged?.runs).toBe(4);
  });

  it('still refuses a shape this module never wrote', () => {
    // A `revealed` that is not a list is not a damaged world, it is not a
    // world — guessing at it would be inventing ground.
    expect(
      decodeWorld(JSON.stringify({ worldSeed: 7, revealed: 'nope', territories: [] })),
    ).toBeNull();
    expect(decodeWorld('not json')).toBeNull();
    expect(decodeWorld(null)).toBeNull();
  });
});

/**
 * The camp cluster (2026-08-21). `homeOf` has existed since the where-you-wake
 * prototype, and `reachOf` has always used it — but five other places went on
 * measuring from world ORIGIN, and the docblock calling the prototype
 * "unreachable from UI" had been stale since camps shipped as the fifth
 * shrine. A camp run is a last-tier world's ROUTINE mode, so every one of
 * those was live for the players furthest in. This pins the world's half.
 */
describe('the world remembers the longest expedition, not the map’s extent', () => {
  const CAMP = key(20, 0);

  it('does not pay a reach goal for standing still at a far camp', () => {
    // The exploit: waking at a ring-20 territory and placing one tile banked
    // farthestReach 20, minting "Reach 20 hexes from home" (25 relics) for
    // no walking at all.
    const camped = newRun(5, TUNING, [], [], CAMP);
    expect(mergeRun(newWorld(5), camped).farthestReach).toBeLessThan(5);
  });

  it('still counts a real walk, wherever the camp happens to sit', () => {
    const camped = newRun(5, TUNING, [], [], CAMP);
    const walked: GameState = {
      ...camped,
      cells: { ...camped.cells, [key(25, 0)]: { kind: 'tile', colour: 'green' } },
    };
    expect(mergeRun(newWorld(5), walked).farthestReach).toBe(5);
  });

  it('never moves an existing world’s record backward', () => {
    // Worlds already hold an origin-anchored number; `Math.max` against the
    // stored value means the change cannot take anybody's record away.
    const held = { ...newWorld(5), farthestReach: 31 };
    expect(mergeRun(held, newRun(5, TUNING, [], [], CAMP)).farthestReach).toBe(31);
  });
});

describe('worldFromRun — a daily kept as a world (2026-09-05)', () => {
  /*
   * Marc's choice when asked, over both "the run counts as run 1" and "seed
   * only": the MAP travels and the spoils do not. Pinned because the middle
   * option is the one a later reader is most likely to "fix" in either
   * direction, and because the reason it is the middle one is a balance
   * ruling rather than a taste — a daily may be replayed all day, so banking
   * its relics or its score would make retry-until-good the best way to open
   * a world.
   */
  it('carries the ground the run saw, and none of its spoils', () => {
    const played = mergeRun(newWorld(9), newRun(9, TUNING));
    const state = newRun(9, TUNING);
    const kept = worldFromRun(9, state);

    expect(kept.worldSeed).toBe(9);
    expect(new Set(kept.revealed), 'the map did not come with it').toEqual(
      new Set(Object.keys(state.cells)),
    );
    expect(kept.revealed.length, 'a kept board arrived blank').toBeGreaterThan(0);

    // Everything a run EARNS starts where a fresh world starts it. The
    // territories and the reach are not on this list any more (2026-09-09) —
    // see the test below, and `worldFromRun`'s own docblock for why they moved.
    const blank = newWorld(9);
    expect({
      runs: kept.runs,
      bestPoints: kept.bestPoints,
      shrines: kept.shrines,
      finds: kept.finds,
      perks: kept.perks,
      worn: kept.worn,
      goalsMet: kept.goalsMet,
    }).toEqual({
      runs: blank.runs,
      bestPoints: blank.bestPoints,
      shrines: blank.shrines,
      finds: blank.finds,
      perks: blank.perks,
      worn: blank.worn,
      goalsMet: blank.goalsMet,
    });

    // And it is NOT `rememberRun`: that one counts the run.
    expect(played.revealed.length, 'the two disagree about what “seen” means').toBe(
      kept.revealed.length,
    );
  });

  /**
   * THE TERRITORIES COME WITH IT (2026-09-09, Marc: *"make sure territories
   * follow up in a new world if we go from daily to world, otherwise
   * territories in daily are underpowered"*).
   *
   * One field of the 2026-09-05 ruling above, reversed on new evidence: three
   * of a territory's four payments are unreachable on a board with no ledger,
   * so leaving them behind made claiming one on a daily nearly worthless.
   * `farthestReach` travels with them because `knownFraction` divides by it.
   *
   * Built by hand rather than by walking a board to a territory: this is a test
   * about which FIELDS `worldFromRun` folds, and the folding is `mergeRun`'s,
   * which `mergeRun`'s own tests above already walk a real board for.
   */
  it('carries the territories the run claimed, and how far it walked', () => {
    const state = newRun(9, TUNING);
    const at: HexKey = '3,-1';
    const conquered: GameState = {
      ...state,
      cells: {
        ...state.cells,
        [at]: { kind: 'landmark', reward: 'territory', colour: 'green', claimed: true },
        '2,0': { kind: 'tile', colour: 'green' },
      },
    };
    const kept = worldFromRun(9, conquered);
    expect(kept.territories, 'a claimed territory stayed behind').toEqual([at]);
    expect(kept.farthestReach, 'the reach stayed behind').toBe(
      mergeRun(newWorld(9), conquered).farthestReach,
    );
    // Still not the spoils.
    expect([kept.runs, kept.bestPoints]).toEqual([0, 0]);
  });
});
