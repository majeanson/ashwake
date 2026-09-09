import { GOALS } from '@content/goals';
import { TUNING } from '@content/tuning';
import { key, type HexKey } from '@engine/hex';
import { destinationsWithin, findsWithin } from '@engine/world';
import { metGoalIds, sealGoals } from '@meta/goals';
import { ONLY_WORLD, type RecordBook } from '@meta/records';
import type { RunEntry, Timeline } from '@meta/timeline';
import { newWorld, UNLOCKS, type WorldMemory } from '@meta/world';
import {
  buy,
  canAfford,
  EMPTY_PROGRESS,
  grantFind,
  meet,
  TEACH_IDS,
  UPGRADES,
  withWorldPerks,
  type Progress,
} from '@meta/progress';
import {
  writeProgress,
  writeRecords,
  writeShopLevels,
  writeTimeline,
  writeWorld,
  type Slot,
} from './storage';

/**
 * A device that has PLAYED — the screen audit's third axis (2026-08-30).
 *
 * The harness has had two device histories since it was built: `?taught=1`, a
 * phone that has met every lesson, and `?end=1`, one deterministic run walked
 * to its end. Both are facts about a SESSION. Neither is a fact about a
 * DEVICE, and every screen that only exists once you have played — the worlds
 * panel, the atlas, the shop, the hall of fame, the end screen's unlock list —
 * was therefore photographed nearly empty. `NEXT.md` §3 has asked for this
 * axis since it was written.
 *
 * **It is also the instrument the last two sessions did not have.** Both of
 * 2026-08-30's bugs were invisible on screen: no world seed was ever minted,
 * so every run banked as a detour, and no economy was ever composed, so relics
 * bought nothing. A three-hundred-run fixture rendering `0 relics` and
 * `0 of 5 shrines` is not subtle. `CLAUDE.md`'s standing rule — grep for a
 * consumer of every action a screen can produce — cannot see a NUMBER; a
 * picture of an old world can.
 *
 * **Honest by construction, which is the whole design.** Nothing here invents
 * a fact the game could not have produced:
 *
 *   - The territories, shrines and finds are REAL landmarks, read off the
 *     world seed with `destinationsWithin`/`findsWithin` — the same pure
 *     functions the reducer consults when growth reveals a hex. A fixture with
 *     a territory at a hex that holds none would draw a board disagreeing with
 *     its own ledger the moment somebody pressed BEGIN.
 *   - The perks come from folding `grantFind` over those find hexes, which is
 *     literally what the shell does when one is claimed.
 *   - The goals met are `metGoalIds` over the world this builds, so the survey
 *     cannot claim a milestone the world has not reached.
 *   - The purse and the shop are one arithmetic: relics are EARNED per run and
 *     by the survey, then SPENT through `buy`, so a shop level always has a
 *     price behind it and the remainder is what is genuinely left over.
 *
 * The ages are one WORLD SEED at several ages rather than several different
 * places, so `?runs=5`, `?runs=30` and `?runs=300` are one plane's before,
 * middle and after.
 *
 * The SEED itself is chosen rather than rolled, and chosen against this file's
 * own arithmetic: a plane whose nearest landmarks are too sparse gives a
 * three-hundred-run world three woken shrines out of five, which photographs
 * as a bug in the game rather than a fact about that seed. `0x100478` carries
 * eight shrines, twenty-three territories and six finds inside the reach cap.
 *
 * Gated entirely behind `?runs=` and written by `main.tsx` before the root
 * renders — a device that never asks never touches this file's writes, and
 * `useDevice` reads the disk once at boot, so seeding afterwards would seed
 * nothing.
 */

/**
 * The plane the fixtures are played on.
 *
 * Fixed rather than rolled: two runs of the audit have to photograph the same
 * ground or the shots are not comparable, which is the same reason
 * `shell/walk.ts` exists at all.
 */
export const FIXTURE_SEED = 0x100478;

/** A fixed wall-clock for the diary, so a shot's dates do not move daily. */
const FIXTURE_AT = Date.UTC(2026, 5, 1);
const DAY_MS = 86_400_000;

/** Relics one run pays, on average, at this body's tightened faucets. */
const RELICS_PER_RUN = 12;

/**
 * How far the farthest expedition got, by the age of the world. Square-root
 * rather than linear because reach is bought by one good run, not by many —
 * and capped, because `revealedBy` writes a key per hex and the disc grows as
 * the square.
 */
const reachAt = (runs: number): number => Math.min(48, 6 + Math.round(Math.sqrt(runs) * 3));

/** What a run scores, as the world learns to play it. */
const bestAt = (runs: number): number => 400 + runs * 55;

/** Ring distance from origin, the one measure this file sorts and thins by. */
const ring = (q: number, r: number): number => Math.max(Math.abs(q), Math.abs(r), Math.abs(-q - r));

/**
 * The ground this world has ever had on the board.
 *
 * Not a filled disc: an expedition walks a corridor outward and comes home, so
 * the near world is known completely and the far world in fragments. A disc
 * would also make `knownFraction` read 100% for every world past its first
 * run, and that fraction is the atlas's one honest story about a plane which
 * is actually infinite.
 *
 * Deterministic from the world seed, so the same fixture draws the same fog.
 */
function revealedBy(seed: number, reach: number): HexKey[] {
  const solid = Math.round(reach * 0.45);
  const out: HexKey[] = [];
  for (let q = -reach; q <= reach; q++) {
    for (let r = Math.max(-reach, -q - reach); r <= Math.min(reach, -q + reach); r++) {
      const d = ring(q, r);
      if (d <= solid) {
        out.push(key(q, r));
        continue;
      }
      // Thinning outward: a cheap hash of the position compared against a
      // density that falls off with distance. The same mixing
      // `engine/world.ts` applies to a position, because a position is what
      // this is keyed by.
      let h = (seed ^ (q * 0x9e3779b1) ^ (r * 0x85ebca77)) | 0;
      h = Math.imul(h ^ (h >>> 15), h | 1);
      h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
      const roll = ((h ^ (h >>> 14)) >>> 0) / 4294967296;
      if (roll < 0.55 * (1 - (d - solid) / (reach - solid + 1))) out.push(key(q, r));
    }
  }
  return out;
}

/** A world of `runs` age, on `seed` — every landmark in it a real one. */
export function worldAged(seed: number, runs: number): WorldMemory {
  const reach = reachAt(runs);
  const nearest = (a: { q: number; r: number }, b: { q: number; r: number }): number =>
    ring(a.q, a.r) - ring(b.q, b.r);

  const out = destinationsWithin(seed, reach, TUNING).sort(nearest);
  const territories = out
    .filter((d) => d.reward === 'territory')
    .slice(0, Math.ceil(runs / 3))
    .map((d) => key(d.q, d.r));
  const shrines = out
    .filter((d) => d.reward === 'shrine')
    .slice(0, Math.min(UNLOCKS.length, Math.floor(runs / 2)))
    .map((d) => key(d.q, d.r));
  const finds = findsWithin(seed, reach, TUNING)
    .sort(nearest)
    .slice(0, Math.floor(runs / 8))
    .map((f) => key(f.q, f.r));

  // The perk shelf, granted the way the shell grants it: one find at a time,
  // deterministically from (worldSeed, hex), auto-worn when nothing is worn.
  let shelf: Progress = EMPTY_PROGRESS;
  for (const hex of finds) {
    const got = grantFind(shelf, seed, hex);
    if (got !== null) shelf = got.progress;
  }

  const built: WorldMemory = {
    ...newWorld(seed),
    revealed: revealedBy(seed, reach),
    territories,
    shrines,
    finds,
    perks: shelf.found,
    worn: shelf.equipped[0] ?? null,
    runs,
    bestPoints: bestAt(runs),
    farthestReach: reach,
  };

  /*
   * The survey, already PAID — which is a fact about a world this old and not
   * a detail.
   *
   * `goalsMet` is the ledger that stops a goal paying twice, and a world three
   * hundred runs deep that has reached twenty hexes and holds four territories
   * has been paid for both, long ago. Leaving the list empty would make the
   * fixture's next `settle` dump every reward at once and print four GOAL MET
   * lines on the end screen — a picture of a milestone, taken at the wrong
   * moment. `metGoalIds` is the same detection `settle` runs, so the ledger
   * cannot claim a goal the world has not reached.
   */
  /*
   * `sealGoals` says exactly this, in one place, since 2026-09-09 — the fixture
   * reached the same need first and stated it inline. It is the same question a
   * kept board and a crossing ask: this world was HANDED facts it did not earn
   * here, so its survey owes nothing for them.
   */
  return sealGoals(built, withWorldPerks(EMPTY_PROGRESS, built.perks, built.worn));
}

/**
 * The purse and the shop, as one arithmetic.
 *
 * Relics are earned per run and by the survey, then SPENT — round-robin down
 * the upgrade list rather than greedily, because a greedy spend leaves less
 * than the cheapest remaining price and every shop row would photograph
 * unaffordable. A shop where nothing CAN be bought and a shop where nothing
 * HAS been bought are the two pictures this fixture exists to avoid, and they
 * look the same from a distance.
 */
export function purseAfter(world: WorldMemory, runs: number): Progress {
  const met = metGoalIds(world, withWorldPerks(EMPTY_PROGRESS, world.perks, world.worn));
  const earned =
    runs * RELICS_PER_RUN +
    met.reduce((n, id) => n + (GOALS.find((g) => g.id === id)?.reward ?? 0), 0);

  let progress: Progress = { ...EMPTY_PROGRESS, relics: earned };
  // A fifth of what the world earned stays in the purse.
  const floor = Math.floor(earned * 0.2);
  let spending = true;
  while (spending) {
    spending = false;
    for (const upgrade of UPGRADES) {
      if (progress.relics <= floor || !canAfford(progress, upgrade)) continue;
      const next = buy(progress, upgrade);
      if (next === progress) continue;
      progress = next;
      spending = true;
    }
  }
  // Every lesson met: a fixture is a device that has played, and a wall of
  // teaching cards over the screens is what `?taught=1` already exists to
  // clear.
  return TEACH_IDS.reduce<Progress>((p, id) => meet(p, id), progress);
}

/**
 * The diary this world would carry.
 *
 * Sixty rows rather than `runs`: the diary keeps every tick forever by design,
 * and `prehistory` is that module's own answer for the ones before the record
 * began — so a fixture writes what a screen can show and lets the aggregate
 * stores speak for the rest. It is also the blob the audit has to write on
 * each of its page loads.
 */
function diaryOf(world: WorldMemory, slot: Slot, runs: number): Timeline {
  const rows = Math.min(runs, 60);
  const out: RunEntry[] = [];
  for (let i = 0; i < rows; i++) {
    const age = runs - rows + i + 1;
    const score = Math.round(bestAt(age) * (0.45 + ((i * 7) % 11) * 0.05));
    out.push({
      at: FIXTURE_AT + i * DAY_MS,
      kind: 'run',
      slot,
      worldSeed: world.worldSeed,
      score,
      reach: Math.max(1, Math.round(world.farthestReach * (0.4 + ((i * 3) % 7) * 0.1))),
      arc: '▁▃▅▂▇▃▁',
      highlights: i === rows - 1 ? [{ kind: 'best-score' }] : [],
      detail: {
        placements: 40 + ((i * 13) % 60),
        harvests: 6 + ((i * 5) % 9),
        popped: 30 + ((i * 11) % 40),
        bigPop: Math.round(score * 0.4),
        bigPopAt: 0.3 + ((i * 3) % 6) * 0.1,
        claims: 1 + ((i * 2) % 4),
        quests: (i * 3) % 3,
        relics: RELICS_PER_RUN,
        epitaph: '',
      },
    });
  }
  return out;
}

/** The shelf of bests. Gate B's split is what the end screen prints. */
function recordsOf(world: WorldMemory, runs: number): RecordBook {
  return {
    [ONLY_WORLD]: {
      runs,
      bestPoints: world.bestPoints,
      // Roughly two tiles pops to one points pop — a human's real split, and
      // the one Gate B's line on the end screen is written to comment on.
      tilesHarvests: runs * 6,
      pointsHarvests: runs * 3,
      arcSum: runs * 0.62,
      arcRuns: runs,
    },
  };
}

/**
 * Seed this device with a history `runs` deep.
 *
 * Slot 1 carries the age asked for, slot 2 a sixth of it, slot 3 nothing — so
 * the WORLDS panel photographs the three states it can actually be in rather
 * than three rows of the same one.
 */
export function seedDevice(runs: number): void {
  const age = Math.max(1, Math.trunc(runs));
  const younger = Math.max(1, Math.round(age / 6));

  const world = worldAged(FIXTURE_SEED, age);
  writeWorld(1, world);
  writeWorld(2, worldAged(FIXTURE_SEED ^ 0x2b91, younger));

  const progress = purseAfter(world, age);
  writeProgress(progress);
  writeShopLevels(1, progress.bought);
  writeRecords(recordsOf(world, age));
  writeTimeline(diaryOf(world, 1, age));
}

/** `?runs=n` on the URL, or null. The audit is the only caller that sets it. */
export function historyAsked(search: string): number | null {
  const raw = new URLSearchParams(search).get('runs');
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
}
