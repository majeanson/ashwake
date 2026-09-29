import { TUNING } from '../src/content/tuning';
import { parse, distance } from '../src/engine/hex';
import { canSpend, newRun, reduce } from '../src/engine/reduce';
import { stream, type RngStream } from '../src/engine/rng';
import {
  canPlaceNow,
  costOf,
  homeOf,
  legalPlacements,
  previewWorth,
  ripeClusters,
} from '../src/engine/rules';
import type { Action, GameState } from '../src/engine/state';
import {
  bank20,
  bank3,
  chooser,
  greedy,
  randomLegal,
  seeker,
  spender,
  timid,
  tourist,
  type Policy,
} from '../src/sim/policy';

/**
 * The balance-and-fun study (2026-09-29, `LOG.md` Session 117).
 *
 *   pnpm --filter @ashwake/core exec tsx scripts/study.ts [--seeds 1000]
 *
 * NOT `pnpm sim`, on purpose: that output is the golden file, and a study that
 * wants new columns must not move the one diff that proves the rules did not.
 * Every policy here plays the SHIPPED `TUNING`; nothing is swept.
 *
 * Two halves. BALANCE asks whether any line dominates and whether the live
 * decisions have two sides: when to pop (a curve over pocket size — an
 * interior peak is a real decision, a monotone line is a fake one), and
 * whether luck is worth spending. FUN asks what a run feels like from the
 * inside, as numbers a harness can see: how often the pop-or-wait question is
 * even on the table, how often the purse nearly runs dry and comes back, the
 * longest stretch without a pop, where the biggest pop lands, how many runs
 * die before they start, and how much of the score the seed decides rather
 * than the hands. None of those is fun; each is a place fun is known to leak.
 */

type Move = readonly Action[];

function options(state: GameState): { index: number; hex: string; worth: number }[] {
  if (!canPlaceNow(state)) return [];
  const spots = legalPlacements(state.cells, state.tuning);
  const out: { index: number; hex: string; worth: number }[] = [];
  state.draft.forEach((tile, index) => {
    for (const hex of spots) {
      out.push({
        index,
        hex,
        worth: previewWorth(state.cells, hex, tile, state.tuning, undefined, state.luck),
      });
    }
  });
  return out;
}

function best(state: GameState): { index: number; hex: string; worth: number } | null {
  let top: { index: number; hex: string; worth: number } | null = null;
  for (const o of options(state)) if (top === null || o.worth > top.worth) top = o;
  return top;
}

const place = (o: { index: number; hex: string }): Move => [
  { type: 'SELECT', index: o.index },
  { type: 'PLACE', hex: o.hex },
];

const pocketMove = (state: GameState, pick: 'big' | 'small'): Move | null => {
  let chosen: string[] | null = null;
  for (const p of ripeClusters(state.cells)) {
    if (chosen === null || (pick === 'big' ? p.length > chosen.length : p.length < chosen.length))
      chosen = p;
  }
  return chosen?.[0] === undefined ? null : [{ type: 'HARVEST', choice: 'tiles', at: chosen[0] }];
};

const biggest = (state: GameState): number =>
  ripeClusters(state.cells).reduce((n, p) => Math.max(n, p.length), 0);

/**
 * THE TIMING CURVE: pop the biggest pocket once it reaches `k`, build
 * otherwise, and cash the smallest only when nothing can be placed. The one
 * dial is k, so the curve over k is the pop-or-wait decision and nothing else.
 */
const popAt = (k: number): Policy => ({
  name: `popAt${k}`,
  note: `Pops the biggest pocket once it reaches ${k}.`,
  decide(state, s) {
    if (biggest(state) >= k) return [pocketMove(state, 'big') ?? [], s];
    const o = best(state);
    if (o !== null) return [place(o), s];
    return [pocketMove(state, 'small') ?? [], s];
  },
});

/**
 * IS LUCK WORTH SPENDING: popAt(k) plus one way of spending. `reroll` redraws
 * a hand whose best spot is worth nothing; `forge` upgrades the card about to
 * be placed; `steer` buys a hand of the colour the board holds most of.
 */
const luckLine = (k: number, how: 'reroll' | 'forge' | 'steer'): Policy => {
  const base = popAt(k);
  return {
    name: `popAt${k}+${how}`,
    note: `popAt${k}, spending luck on ${how}.`,
    decide(state, s) {
      if (biggest(state) < k && canPlaceNow(state)) {
        const o = best(state);
        if (how === 'reroll' && o !== null && o.worth <= 0 && canSpend(state, 'reroll'))
          return [[{ type: 'SPEND', on: 'reroll' }], s];
        if (how === 'steer' && canSpend(state, 'steer')) {
          const counts = new Map<string, number>();
          for (const c of Object.values(state.cells))
            if (c.kind === 'tile') counts.set(c.colour, (counts.get(c.colour) ?? 0) + 1);
          let top: string | null = null;
          for (const [c, n] of counts) if (top === null || n > (counts.get(top) ?? 0)) top = c;
          if (top !== null) return [[{ type: 'SPEND', on: 'steer', colour: top as never }], s];
        }
        if (how === 'forge' && o !== null && canSpend(state, 'forge'))
          return [
            [
              { type: 'SELECT', index: o.index },
              { type: 'SPEND', on: 'forge' },
              { type: 'PLACE', hex: o.hex },
            ],
            s,
          ];
      }
      return base.decide(state, s);
    },
  };
};

/** What one run felt like, measured from the inside. */
type Felt = {
  points: number;
  placements: number;
  pops: number;
  /** Placement turns where a ripe pocket existed: the pop-or-wait question was live. */
  liveTurns: number;
  /** Placement turns where two or more pockets were ripe: WHICH was live too. */
  whichTurns: number;
  /** Times the purse fell to two placements or fewer and climbed back to five. */
  closeCalls: number;
  /** Longest run of placements with no pop. */
  drought: number;
  /** Where the biggest pop landed, 0..1 through the run. */
  peakAt: number;
  /** Tiles that came from walking onto a cache or site, not from pops. */
  walkTiles: number;
  popTiles: number;
  reach: number;
  spends: number;
};

function feel(policy: Policy, seed: number): Felt {
  let state = newRun(seed, TUNING, [], []);
  let dice: RngStream = stream((seed ^ 0x51ed270b) | 0);
  const f: Felt = {
    points: 0,
    placements: 0,
    pops: 0,
    liveTurns: 0,
    whichTurns: 0,
    closeCalls: 0,
    drought: 0,
    peakAt: 0,
    walkTiles: 0,
    popTiles: 0,
    reach: 0,
    spends: 0,
  };
  let low = false;
  let sincePop = 0;
  let steps = 0;
  while (state.phase === 'placing' && steps < 20000) {
    const [move, next] = policy.decide(state, dice);
    dice = next;
    if (move.length === 0) break;
    const ripe = ripeClusters(state.cells).length;
    const before = state;
    for (const a of move) {
      state = reduce(state, a);
      steps++;
      if (a.type === 'SPEND' && state !== before) f.spends++;
    }
    if (state === before) break;
    if (state.placements > before.placements) {
      if (ripe > 0) f.liveTurns++;
      if (ripe > 1) f.whichTurns++;
      sincePop++;
      f.drought = Math.max(f.drought, sincePop);
      // A placement that PAID tiles walked onto something.
      const paid = state.tiles - (before.tiles - costOf(before.placements, before.tuning));
      if (paid > 0) f.walkTiles += paid;
    }
    if (state.log.harvests.length > before.log.harvests.length) {
      sincePop = 0;
      f.popTiles += state.log.harvests.at(-1)?.tiles ?? 0;
    }
    const runway = state.tiles / Math.max(1, costOf(state.placements, state.tuning));
    if (runway <= 2) low = true;
    else if (low && runway >= 5) {
      f.closeCalls++;
      low = false;
    }
  }
  let peak = 0;
  for (const h of state.log.harvests) {
    if (h.points > peak) {
      peak = h.points;
      f.peakAt = state.placements === 0 ? 0 : h.at / state.placements;
    }
  }
  f.points = state.points;
  f.placements = state.placements;
  f.pops = state.log.harvests.length;
  let reach = 0;
  const home = homeOf(state);
  for (const [k, c] of Object.entries(state.cells))
    if (c.kind === 'tile' || c.kind === 'stone') reach = Math.max(reach, distance(parse(k), home));
  f.reach = reach;
  return f;
}

const pct = (xs: number[], p: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
};
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const pad = (v: string | number, n: number): string => String(v).padStart(n);

function main(): void {
  const i = process.argv.indexOf('--seeds');
  const seeds = i > 0 ? Number(process.argv[i + 1]) : 1000;

  const timing = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(popAt);
  const luck = (['reroll', 'forge', 'steer'] as const).map((h) => luckLine(8, h));
  const people = [randomLegal, greedy, timid, bank3, bank20, spender, seeker, chooser, tourist];
  const all = [...timing, popAt(8), ...luck, ...people].filter(
    (p, n, a) => a.findIndex((q) => q.name === p.name) === n,
  );

  console.log(`${seeds} seeds per line, shipped TUNING\n`);
  console.log(
    [
      'line'.padEnd(14),
      pad('p10', 6),
      pad('med', 6),
      pad('p90', 6),
      pad('cv', 5),
      pad('place', 6),
      pad('pops', 5),
      pad('live%', 6),
      pad('which%', 7),
      pad('close', 6),
      pad('drought', 8),
      pad('peak', 5),
      pad('walk%', 6),
      pad('reach', 6),
      pad('<40', 5),
      pad('spends', 7),
    ].join(' '),
  );
  for (const policy of all) {
    const runs: Felt[] = [];
    for (let s = 1; s <= seeds; s++) runs.push(feel(policy, s));
    const pts = runs.map((r) => r.points);
    const m = mean(pts);
    const sd = Math.sqrt(mean(pts.map((p) => (p - m) ** 2)));
    const turns = runs.reduce((a, r) => a + r.placements, 0);
    const walk = runs.reduce((a, r) => a + r.walkTiles, 0);
    const pop = runs.reduce((a, r) => a + r.popTiles, 0);
    console.log(
      [
        policy.name.padEnd(14),
        pad(pct(pts, 0.1), 6),
        pad(pct(pts, 0.5), 6),
        pad(pct(pts, 0.9), 6),
        pad((sd / Math.max(1, m)).toFixed(2), 5),
        pad(Math.round(mean(runs.map((r) => r.placements))), 6),
        pad(Math.round(mean(runs.map((r) => r.pops))), 5),
        pad(((100 * runs.reduce((a, r) => a + r.liveTurns, 0)) / Math.max(1, turns)).toFixed(0), 6),
        pad(
          ((100 * runs.reduce((a, r) => a + r.whichTurns, 0)) / Math.max(1, turns)).toFixed(0),
          7,
        ),
        pad(mean(runs.map((r) => r.closeCalls)).toFixed(2), 6),
        pad(Math.round(mean(runs.map((r) => r.drought))), 8),
        pad(mean(runs.map((r) => r.peakAt)).toFixed(2), 5),
        pad(((100 * walk) / Math.max(1, walk + pop)).toFixed(0), 6),
        pad(mean(runs.map((r) => r.reach)).toFixed(1), 6),
        pad(runs.filter((r) => r.placements < 40).length, 5),
        pad(mean(runs.map((r) => r.spends)).toFixed(1), 7),
      ].join(' '),
    );
  }
  console.log(
    '\ncv = spread of the score over the mean (how much the seed decides); live% = placement turns with a pop on offer;',
  );
  console.log(
    'which% = turns with two or more pockets ripe; close = purse at <=2 placements that came back to 5; drought = longest run of placements with no pop;',
  );
  console.log(
    'peak = where the biggest pop landed (1 = the end); walk% = tiles from caches/sites vs pops; <40 = runs that ended before 40 placements.',
  );
}

main();
