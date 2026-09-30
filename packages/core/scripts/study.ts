import { TUNING, type Tuning } from '../src/content/tuning';
import { parse, distance } from '../src/engine/hex';
import { canSpend, newRun, reduce } from '../src/engine/reduce';
import { rngInt, stream, type RngStream } from '../src/engine/rng';
import {
  canPlaceNow,
  costOf,
  homeOf,
  legalPlacements,
  previewWorth,
  ripeClusters,
} from '../src/engine/rules';
import { biomeAt } from '../src/engine/world';
import { caravanAskAt, caravanFor } from '../src/engine/caravan';
import type { WareId } from '../src/content/caravan';
import type { Colour } from '../src/content/tuning';
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
 * COLOUR-BLIND, same hands otherwise (2026-09-29, Marc: "colors should matter
 * at all stages of the game"). Packs exactly as tightly — the spot with the
 * most filled neighbours — but picks the card at random and never asks what
 * colour anything is. popAt(k) against colourBlind(k) is what colour play is
 * worth in points, stage by stage; the points split alone understates it,
 * because matching also scales what the pocket and distance multipliers
 * multiply.
 */
const colourBlind = (k: number): Policy => ({
  name: `blind${k}`,
  note: `popAt${k}'s timing and packing, choosing the card without looking at colour.`,
  decide(state, s) {
    if (biggest(state) >= k) return [pocketMove(state, 'big') ?? [], s];
    if (canPlaceNow(state)) {
      const spots = legalPlacements(state.cells, state.tuning);
      let top: string | null = null;
      let most = -1;
      for (const hex of spots) {
        const h = parse(hex);
        let n = 0;
        for (const [dq, dr] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, -1],
          [-1, 1],
        ] as const)
          if (state.cells[`${h.q + dq},${h.r + dr}`] !== undefined) n++;
        if (n > most) {
          most = n;
          top = hex;
        }
      }
      if (top !== null) {
        const [index, next] = rngInt(s, state.draft.length);
        return [place({ index, hex: top }), next];
      }
    }
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

/**
 * THE THOUGHTFUL STEER (2026-09-29, Marc: "finding the right color for the map
 * (steer) should be a thoughtful decision"). `luckLine(k, 'steer')` leaned
 * toward whatever the board already held most of, which is the one colour a
 * hand least needs more of. This one reads the GROUND: the colour most of the
 * spots it could build on are native to, and only when the hand holds no card
 * of it. A tile on its own ground scores a match for free, paid twice since
 * `identityBonusRate` 2.
 */
const steerMap = (k: number): Policy => {
  const base = popAt(k);
  return {
    name: `popAt${k}+map`,
    note: `popAt${k}, steering to the colour of the ground it can build on.`,
    decide(state, s) {
      if (biggest(state) < k && canPlaceNow(state) && canSpend(state, 'steer')) {
        const counts = new Map<Colour, number>();
        for (const hex of legalPlacements(state.cells, state.tuning)) {
          const h = parse(hex);
          const ground = biomeAt(state.rootSeed, h.q, h.r, state.tuning);
          if (ground !== null) counts.set(ground, (counts.get(ground) ?? 0) + 1);
        }
        let top: Colour | null = null;
        for (const [c, n] of counts) if (top === null || n > (counts.get(top) ?? 0)) top = c;
        if (top !== null && !state.draft.some((t) => t.colour === top))
          return [[{ type: 'SPEND', on: 'steer', colour: top }], s];
      }
      return base.decide(state, s);
    },
  };
};

/*
 * TWO REASONS TO POP EARLIER, prototyped (2026-09-29, Marc chose to try
 * both). Neither changes what is legal, only what a pop is worth, so like the
 * escalation they are measured as a re-score: the runs are real, the bonus is
 * laid over them.
 *
 *   TIDES   the last `tideLen` placements of every `tideEvery` are a tide;
 *           a pop made during one pays `tideBonus` more.
 *   SETS    each pop is the colour of most of its tiles (the colour the game
 *           already leans toward after it); the pop that completes all four
 *           colours since the last set pays `setBonus` more, and a new set
 *           begins.
 *
 * `tideAware` and `setAware` are the players who play FOR them: grow to
 * `big` as usual, but cash anything of `small` or more when the tide is in /
 * when the pocket is a colour the set still lacks. If they beat `popAt(big)`
 * the mechanic has made popping earlier a real choice.
 */

/*
 * THE WANTED SIZE (2026-09-29, Marc: "we want people using size as a
 * flexibility so sometimes small is good sometimes its bad"). A request
 * names a size band — small 3-5, medium 6-9, large 10+ — that changes every
 * `want.life` placements, drawn from the seed so the player (and the bot)
 * can see it coming. The FIRST pop that fits it in its window pays a flat
 * `want.bonus` points: flat, not a multiplier, because doubling a big pop
 * is worth far more than doubling a small one and the whole point is that
 * small is sometimes right. One per window, so a small window cannot be
 * farmed with a string of threes.
 */
const want = {
  life: 0,
  bonus: 0,
  /** Share of requests that are OUTRAGEOUS (Marc: "outrageous pocket sizes
   *  too with uniques perks maybe so we both want small or big"). */
  wild: 0,
  /** What meeting a request pays: flat points, or a caravan boon (Marc's
   *  pick: "A caravan boon"); an outrageous one pays `wildPicks` boons. */
  reward: 'points' as 'points' | 'boon' | 'both',
  wildPicks: 3,
  /** How many request-lengths an outrageous ask stays. */
  wildLife: 2,
  /**
   * The DYNAMIC kicker (Marc: "no hard points, could be dynamic or by luck or
   * similar but no flat"): the pop that meets a request is multiplied by its
   * band's factor — biggest for small, so a small ask pays about what a large
   * one does. Zeros mean no kicker.
   */
  mult: [0, 0, 0, 0] as number[],
};
/** small, medium, large, and the outrageous ask. */
const BANDS = [
  [3, 4],
  [5, 8],
  [9, 11],
  // 15+ was met by no line in 400 runs: a pocket that size is almost never
  // built before the purse runs out. Outrageous has to be hard, not absent.
  [12, Infinity],
] as const;
type Request = { readonly index: number; readonly kind: 0 | 1 | 2 | 3 };
/**
 * The request covering a placement: a seeded sequence, each lasting
 * `want.life` placements, the outrageous ones twice that, so a pocket of 15
 * has time to be grown. Pure, so the bot, the scorer and a screen agree.
 */
function requestAt(seed: number, placements: number): Request {
  let start = 0;
  for (let index = 0; ; index++) {
    const h = (Math.imul(seed ^ 0x9e3779b9, 2654435761) ^ Math.imul(index + 1, 40503)) >>> 0;
    const kind = ((h % 1000) / 1000 < want.wild ? 3 : (h >>> 10) % 3) as 0 | 1 | 2 | 3;
    const len = Math.max(1, want.life) * (kind === 3 ? want.wildLife : 1);
    if (placements < start + len) return { index, kind };
    start += len;
  }
}
const fits = (size: number, kind: 0 | 1 | 2 | 3): boolean =>
  size >= BANDS[kind][0] && size <= BANDS[kind][1];
/** Requests already met, read from the run's own log. */
function paidRequests(state: GameState): Set<number> {
  const paid = new Set<number>();
  if (want.life <= 0) return paid;
  for (const h of state.log.harvests) {
    const r = requestAt(state.rootSeed, h.at);
    if (!paid.has(r.index) && fits(h.count, r.kind)) paid.add(r.index);
  }
  return paid;
}
/** Grows to `big` as usual, but cashes a ripe pocket that fits an unpaid request. */
const flex = (big: number): Policy => {
  const base = popAt(big);
  return {
    name: `flex${big}`,
    note: `popAt${big}, but pops to the wanted size when a pocket fits it.`,
    decide(state, s) {
      if (want.life > 0) {
        const r = requestAt(state.rootSeed, state.placements);
        if (!paidRequests(state).has(r.index)) {
          let pick: string[] | null = null;
          for (const p of ripeClusters(state.cells))
            if (fits(p.length, r.kind) && (pick === null || p.length > pick.length)) pick = p;
          if (pick?.[0] !== undefined)
            return [[{ type: 'HARVEST', choice: 'tiles', at: pick[0] }], s];
          // An outrageous ask is worth growing for: build instead of cashing
          // at the usual size, and pop only when nothing can be placed.
          if (r.kind === 3) {
            const o = best(state);
            if (o !== null) return [place(o), s];
          }
        }
      }
      return base.decide(state, s);
    },
  };
};

const proto = { tideEvery: 0, tideLen: 0, tideBonus: 0, setBonus: 0 };

/*
 * THE CARAVAN, prototyped (2026-09-29, Marc: "market makers could offer
 * more or offer certain passive perks so we have to choose between pop and
 * new decisions? slay the spire like" — structure A, named CARAVAN). Every
 * so often a caravan arrives with three run-only boons, and one is taken.
 * Unlike the tide it changes what the rest of the run IS, so it is applied
 * for real: the boon edits the run's own `tuning` (the engine reads nothing
 * else), or its purse.
 *
 * What counts toward the next caravan is the question Marc asked to be
 * tested hardest ("make sure the strategy of always popping only 1 tile
 * doesnt work out either"):
 *   pops    every `every` pops, any size — the naive rule
 *   pops3   every `every` pops of `min`+ tiles
 *   tiles   every `every` tiles popped — size cannot buy frequency
 */
const caravan = { mode: 'off' as 'off' | 'pops' | 'tiles', every: 0, min: 1 };
/*
 * SELLING A POCKET (2026-09-29, Marc chose it over the free caravan). With
 * `sell.mode` other than `free`, an arriving caravan WAITS `stay` placements
 * for a sale: one ripe pocket goes to stone as usual but pays no points, no
 * tiles and no luck, and the best of three boons is taken instead. Unsold,
 * it leaves. A sale never counts toward the next caravan.
 *   none   never sells — today's game, with caravans passing by
 *   small  sells the smallest ripe pocket of `min`+ tiles (min 1 = the
 *          single-tile exploit Marc asked to be tested)
 *   big    sells the biggest ripe pocket of `min`+ tiles
 */
const sell = {
  mode: 'free' as 'free' | 'none' | 'small' | 'big' | 'early',
  min: 1,
  stay: 3,
  /** The sale keeps the pocket's TILES and gives up only its points and luck. */
  keepTiles: false,
};

/** Take one boon from three offered, the bot's favourite. */
function takeBoon(state: GameState, wares: RngStream): [GameState, RngStream] {
  const offered: Boon[] = [];
  let w = wares;
  while (offered.length < 3) {
    const [i, next] = rngInt(w, BOONS.length);
    w = next;
    const boon = BOONS[i]!;
    if (!offered.includes(boon)) offered.push(boon);
  }
  offered.sort((a, b) => PREFER.indexOf(a.id) - PREFER.indexOf(b.id));
  return [offered[0]!.apply(state), w];
}

type Boon = { readonly id: string; apply(state: GameState): GameState };
/*
 * WARES THAT NEVER LENGTHEN A RUN. The first cut sold "cost rises slower"
 * and "12 tiles now", and runaway was immediate: each caravan made the run
 * longer, a longer run met more caravans, and the patient line played 524
 * placements instead of 104. Marc's limit ("dont want to have too much
 * longer games") is therefore a rule for the caravan's wares: they change
 * what a run is WORTH or how it PLAYS, never how long it lasts.
 */
/** How strong every ware is, for sweeping (--boon-scale). */
let boonScale = 1;
const BOONS: readonly Boon[] = [
  {
    id: 'placing-pays',
    apply: (s) => ({
      ...s,
      tuning: { ...s.tuning, identityBonusRate: s.tuning.identityBonusRate + 0.5 * boonScale },
    }),
  },
  {
    id: 'size-pays',
    apply: (s) => ({
      ...s,
      tuning: { ...s.tuning, harvestSizeBonus: s.tuning.harvestSizeBonus + 0.05 * boonScale },
    }),
  },
  {
    id: 'wider-hand',
    apply: (s) => ({
      ...s,
      tuning: { ...s.tuning, draftWidth: Math.min(5, s.tuning.draftWidth + 1) },
    }),
  },
  { id: 'luck-now', apply: (s) => ({ ...s, luck: s.luck + 40 * boonScale }) },
  {
    id: 'forge-cheaper',
    apply: (s) => ({
      ...s,
      tuning: { ...s.tuning, luckForgeCost: Math.max(20, s.tuning.luckForgeCost - 10 * boonScale) },
    }),
  },
];
/** The bot's taste, best first — a player who has read the offers. */
const PREFER = ['placing-pays', 'size-pays', 'wider-hand', 'forge-cheaper', 'luck-now'];
const inTide = (placements: number): boolean =>
  proto.tideEvery > 0 && placements % proto.tideEvery >= proto.tideEvery - proto.tideLen;

/** The colour most of a pocket's tiles are — the engine's own rule. */
function pocketColour(state: GameState, pocket: readonly string[]): Colour | null {
  const n = new Map<Colour, number>();
  for (const k of pocket) {
    const c = state.cells[k];
    if (c?.kind === 'tile') n.set(c.colour, (n.get(c.colour) ?? 0) + 1);
  }
  let top: Colour | null = null;
  let most = 0;
  for (const [c, v] of n)
    if (v > most) {
      most = v;
      top = c;
    }
  return top;
}

/** The set so far, per run, read the way the re-score reads it. */
const setMemory = new WeakMap<object, { seen: number; set: Set<Colour> }>();
function setSoFar(policy: object, state: GameState): Set<Colour> {
  let m = setMemory.get(policy);
  if (m === undefined || state.log.harvests.length < m.seen) {
    m = { seen: 0, set: new Set() };
    setMemory.set(policy, m);
  }
  if (state.log.harvests.length > m.seen) {
    m.seen = state.log.harvests.length;
    const c = state.bias?.colour;
    if (c !== undefined) m.set.add(c);
    if (m.set.size === 4) m.set = new Set();
  }
  return m.set;
}

const tideAware = (big: number, small: number): Policy => {
  const base = popAt(big);
  return {
    name: `tide${big}/${small}`,
    note: `popAt${big}, but cashes any pocket of ${small}+ while the tide is in.`,
    decide(state, s) {
      if (inTide(state.placements) && biggest(state) >= small)
        return [pocketMove(state, 'big') ?? [], s];
      return base.decide(state, s);
    },
  };
};

const setAware = (big: number, small: number): Policy => {
  const base = popAt(big);
  const self: Policy = {
    name: `set${big}/${small}`,
    note: `popAt${big}, but cashes a pocket of ${small}+ whose colour the set still lacks.`,
    decide(state, s) {
      const set = setSoFar(self, state);
      let pick: string[] | null = null;
      for (const p of ripeClusters(state.cells)) {
        if (p.length < small) continue;
        const c = pocketColour(state, p);
        if (c !== null && !set.has(c) && (pick === null || p.length > pick.length)) pick = p;
      }
      if (pick?.[0] !== undefined && biggest(state) < big)
        return [[{ type: 'HARVEST', choice: 'tiles', at: pick[0] }], s];
      return base.decide(state, s);
    },
  };
  return self;
};

/*
 * THE CARAVAN AS BUILT (2026-09-29): the engine's own rule, not a re-score.
 * `take(policy)` is any habit that accepts the wares it is offered — a fixed
 * habit still takes a free ware — and `answer(big)` pops to the caravan's
 * ask (and grows for an outrageous one), otherwise playing popAt(big).
 */
const TASTE: readonly WareId[] = ['placing', 'size', 'hand', 'forge', 'luck'];
const take = (policy: Policy): Policy => ({
  name: `take:${policy.name}`,
  note: `${policy.note} Takes every ware offered.`,
  decide(state, s) {
    const offer = state.caravan.offers[0];
    if (offer !== undefined) {
      const pick = [...offer].sort((a, b) => TASTE.indexOf(a) - TASTE.indexOf(b))[0]!;
      return [[{ type: 'CARAVAN', pick: offer.indexOf(pick) }], s];
    }
    return policy.decide(state, s);
  },
});
const answer = (big: number): Policy =>
  take({
    name: `answer${big}`,
    note: `popAt${big}, but pops to the caravan's ask.`,
    decide(state, s) {
      let pick: string[] | null = null;
      for (const p of ripeClusters(state.cells))
        if (caravanFor(state, p.length) !== null && (pick === null || p.length > pick.length))
          pick = p;
      if (pick?.[0] !== undefined) return [[{ type: 'HARVEST', choice: 'tiles', at: pick[0] }], s];
      const ask = caravanAskAt(state.rootSeed, state.placements, state.tuning);
      if (ask !== null && ask.kind === 3 && !state.caravan.met.includes(ask.index)) {
        const o = best(state);
        if (o !== null) return [place(o), s];
      }
      return popAt(big).decide(state, s);
    },
  });

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
  /** Share of the pops' points earned in the last third of the run: the climax. */
  late: number;
  /** Caravans that arrived this run. */
  caravans: number;
  /** Pockets sold to one. */
  sold: number;
  /** Wanted-size requests met, by band: small, medium, large, outrageous. */
  bands: [number, number, number, number];
  /** Points earned in each third of the run, and the colour share of each. */
  thirds: [number, number, number];
  colourThirds: [number, number, number];
};

function feel(policy: Policy, seed: number, tuning: Tuning = TUNING, escalate = 0): Felt {
  let state = newRun(seed, tuning, [], []);
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
    late: 0,
    caravans: 0,
    sold: 0,
    bands: [0, 0, 0, 0],
    thirds: [0, 0, 0],
    colourThirds: [0, 0, 0],
  };
  let low = false;
  let sincePop = 0;
  const popMult: number[] = [];
  let toCaravan = 0;
  let waiting: number | null = null;
  const boonPaid = new Set<number>();
  const multPaid = new Set<number>();
  let wares: RngStream = stream((seed ^ 0x0ca2a7a) | 0);
  let runSet = new Set<Colour>();
  let steps = 0;
  while (state.phase === 'placing' && steps < 20000) {
    // A caravan waiting for a sale: leave when its time is up, or buy a
    // pocket if the seller wants one.
    if (waiting !== null && state.placements > waiting) waiting = null;
    // 'early' sells like 'small', but only in the first 50 placements: a boon
    // lasts the rest of the run, so it is worth most when bought early.
    const selling =
      sell.mode === 'small' ||
      sell.mode === 'big' ||
      (sell.mode === 'early' && state.placements < 50);
    if (waiting !== null && selling) {
      let pick: string[] | null = null;
      for (const p of ripeClusters(state.cells)) {
        if (p.length < sell.min) continue;
        if (
          pick === null ||
          (sell.mode === 'big' ? p.length > pick.length : p.length < pick.length)
        )
          pick = p;
      }
      if (pick?.[0] !== undefined) {
        const was = state;
        const cashed = reduce(state, { type: 'HARVEST', choice: 'tiles', at: pick[0] });
        if (cashed !== was) {
          // Stone, as a pop leaves it — and nothing paid for it.
          state = {
            ...cashed,
            tiles: sell.keepTiles ? cashed.tiles : was.tiles,
            points: was.points,
            luck: was.luck,
            log: { ...cashed.log, harvests: was.log.harvests },
          };
          [state, wares] = takeBoon(state, wares);
          f.caravans++;
          f.sold++;
          waiting = null;
          steps++;
          continue;
        }
      }
    }
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
      // The prototypes' bonus, decided at the moment of the pop.
      let m = 1;
      if (inTide(before.placements)) m += proto.tideBonus;
      if (want.life > 0 && want.mult.some((x) => x > 0)) {
        const h = state.log.harvests.at(-1)!;
        const req = requestAt(seed, h.at);
        if (!multPaid.has(req.index) && fits(h.count, req.kind)) {
          multPaid.add(req.index);
          m *= want.mult[req.kind] || 1;
        }
      }
      const c = state.bias?.colour;
      if (proto.setBonus > 0 && c !== undefined) {
        runSet.add(c);
        if (runSet.size === 4) {
          m += proto.setBonus;
          runSet = new Set();
        }
      }
      popMult.push(m);
      // A request met pays its boon now, where the rest of the run can use it.
      if (want.life > 0 && want.reward !== 'points') {
        const h = state.log.harvests.at(-1)!;
        const req = requestAt(seed, h.at);
        if (!boonPaid.has(req.index) && fits(h.count, req.kind)) {
          boonPaid.add(req.index);
          for (let n = 0; n < (req.kind === 3 ? want.wildPicks : 1); n++)
            [state, wares] = takeBoon(state, wares);
        }
      }
      // The caravan: count this pop toward the next one, and take a boon
      // when it arrives.
      if (caravan.mode !== 'off') {
        const size = state.log.harvests.at(-1)?.count ?? 0;
        toCaravan += caravan.mode === 'tiles' ? size : size >= caravan.min ? 1 : 0;
        while (toCaravan >= caravan.every && state.phase === 'placing') {
          toCaravan -= caravan.every;
          if (sell.mode === 'free') {
            [state, wares] = takeBoon(state, wares);
            f.caravans++;
          } else {
            waiting = state.placements + sell.stay;
          }
        }
      }
      for (let extra = before.log.harvests.length + 1; extra < state.log.harvests.length; extra++)
        popMult.push(1);
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
  /*
   * THE LATE-RUN ESCALATION, prototyped as a re-score (2026-09-29, Marc chose
   * it over "overripe pockets"): a pop landing after the run's n-th cost step
   * is worth `1 + escalate × n` of itself. Faithful for these policies because
   * none of them decides by points — they choose by pocket size — so the
   * moves are the same and only what the pops were worth changes. `chooser`
   * is the exception, and reads slightly low under it. No engine code until
   * the rule is chosen.
   */
  const step = Math.max(1, tuning.costRisesEvery);
  const bonusOf = new Map(state.log.harvests.map((h, i) => [h, popMult[i] ?? 1]));
  // The wanted size: which pops met a request (counted by band either way;
  // paid in flat points here only when the reward is points — a boon was
  // paid during the run).
  const wanted = new Set<object>();
  if (want.life > 0) {
    const paid = new Set<number>();
    for (const h of state.log.harvests) {
      const r = requestAt(seed, h.at);
      if (!paid.has(r.index) && fits(h.count, r.kind)) {
        paid.add(r.index);
        if (want.reward !== 'boon') wanted.add(h);
        f.bands[r.kind] += 1;
      }
    }
  }
  const worth = (h: { at: number; points: number }): number =>
    (bonusOf.get(h as never) ?? 1) * h.points * (1 + escalate * Math.floor(h.at / step)) +
    (wanted.has(h) ? want.bonus : 0);
  let peak = 0;
  for (const h of state.log.harvests) {
    if (worth(h) > peak) {
      peak = worth(h);
      f.peakAt = state.placements === 0 ? 0 : h.at / state.placements;
    }
  }
  const rawPops = state.log.harvests.reduce((a, h) => a + h.points, 0);
  const popPts = state.log.harvests.reduce((a, h) => a + worth(h), 0);
  f.points = Math.round(state.points - rawPops + popPts);
  const latePts = state.log.harvests
    .filter((h) => h.at >= (state.placements * 2) / 3)
    .reduce((a, h) => a + worth(h), 0);
  f.late = popPts === 0 ? 0 : latePts / popPts;
  for (const h of state.log.harvests) {
    const third = Math.min(2, Math.floor((3 * h.at) / Math.max(1, state.placements))) as 0 | 1 | 2;
    f.thirds[third] += worth(h);
    const b = h.split?.bySource;
    if (b !== undefined && h.split !== undefined && h.split.total > 0)
      f.colourThirds[third] +=
        (worth(h) * (b.matches + b.power + b.rare + b.native)) / h.split.total;
  }
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

/** One row of the `--colour` table: points by third, and colour's share of each. */
function colourRow(name: string, runs: readonly Felt[]): string {
  const cells: string[] = [name.padEnd(14)];
  for (let t = 0; t < 3; t++) {
    const pts = runs.reduce((a, r) => a + r.thirds[t]!, 0);
    const col = runs.reduce((a, r) => a + r.colourThirds[t]!, 0);
    cells.push(pad(Math.round(pts / Math.max(1, runs.length)), 7));
    cells.push(pad(`${pts === 0 ? 0 : Math.round((100 * col) / pts)}%`, 6));
  }
  return cells.join(' ');
}
function main(): void {
  const i = process.argv.indexOf('--seeds');
  const seeds = i > 0 ? Number(process.argv[i + 1]) : 1000;

  const timing = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map(popAt);
  const luck = [
    ...[2, 4, 6, 8, 12, 20].map((k) => luckLine(k, 'forge')),
    luckLine(8, 'steer'),
    luckLine(8, 'reroll'),
    luckLine(4, 'steer'),
    steerMap(8),
    steerMap(4),
  ];
  const people = [randomLegal, greedy, timid, bank3, bank20, spender, seeker, chooser, tourist];
  const blinds = [4, 8, 12].map(colourBlind);
  const protos = [
    ...[3, 4, 6].flatMap((small) => [tideAware(12, small), setAware(12, small)]),
    ...[8, 12, 20].map(flex),
    ...[4, 8, 12, 20].map((k) => take(popAt(k))),
    answer(8),
    answer(12),
  ];
  const every = [...timing, popAt(8), ...luck, ...people, ...blinds, ...protos].filter(
    (p, n, a) => a.findIndex((q) => q.name === p.name) === n,
  );

  /*
   * A CANDIDATE is `--set key=value` (repeatable), typed by the shipped value
   * the way `pnpm sim --set` types it, and `--lines a,b` narrows the table to
   * the lines a question needs. The shipped economy is still the default: a
   * bare run is the study as it was first measured.
   */
  const changed: string[] = [];
  let tuning: Tuning = TUNING;
  process.argv.forEach((arg, n) => {
    if (arg !== '--set') return;
    const setting = process.argv[n + 1] ?? '';
    const eq = setting.indexOf('=');
    const name = setting.slice(0, eq) as keyof Tuning;
    if (eq < 0 || !(name in TUNING)) throw new Error(`--set: no such tuning key in "${setting}"`);
    const raw = setting.slice(eq + 1);
    const value = typeof TUNING[name] === 'boolean' ? raw === 'true' : Number(raw);
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`--set ${setting}`);
    tuning = { ...tuning, [name]: value };
    changed.push(setting);
  });
  const cv = process.argv.indexOf('--caravan');
  if (cv > 0) {
    const [mode, every, min] = (process.argv[cv + 1] ?? '').split(',');
    Object.assign(caravan, { mode, every: Number(every), min: Number(min ?? 1) });
    changed.push(`caravan=${mode}/${every}/${min ?? 1}`);
  }
  const bs = process.argv.indexOf('--boon-scale');
  if (bs > 0) {
    boonScale = Number(process.argv[bs + 1]);
    changed.push(`boons=x${boonScale}`);
  }
  const wa = process.argv.indexOf('--want');
  if (wa > 0) {
    const [life, bonus, wild, reward] = (process.argv[wa + 1] ?? '').split(',');
    Object.assign(want, {
      life: Number(life ?? 0),
      bonus: Number(bonus ?? 0),
      wild: Number(wild ?? 0),
      reward: reward === 'boon' || reward === 'both' ? reward : 'points',
    });
    const wm = process.argv.indexOf('--want-mult');
    if (wm > 0) want.mult = (process.argv[wm + 1] ?? '').split('/').map(Number);
    const wl = process.argv.indexOf('--wild-life');
    if (wl > 0) want.wildLife = Number(process.argv[wl + 1]);
    changed.push(`want=every${life}/+${bonus}/wild${wild ?? 0}/${want.reward}`);
  }
  const sl = process.argv.indexOf('--sell');
  if (sl > 0) {
    const [mode, min] = (process.argv[sl + 1] ?? '').split(',');
    Object.assign(sell, { mode, min: Number(min ?? 1) });
    if (process.argv.includes('--keep-tiles')) sell.keepTiles = true;
    changed.push(`sell=${mode}/${min ?? 1}`);
  }
  const td = process.argv.indexOf('--tide');
  if (td > 0) {
    const [every, len, bonus] = (process.argv[td + 1] ?? '').split(',').map(Number);
    Object.assign(proto, { tideEvery: every ?? 0, tideLen: len ?? 0, tideBonus: bonus ?? 0 });
    changed.push(`tide=${every}/${len}/+${bonus}`);
  }
  const st = process.argv.indexOf('--sets');
  if (st > 0) {
    proto.setBonus = Number(process.argv[st + 1]);
    changed.push(`sets=+${proto.setBonus}`);
  }
  const x = process.argv.indexOf('--escalate');
  const escalate = x > 0 ? Number(process.argv[x + 1]) : 0;
  if (escalate > 0) changed.push(`escalate=${escalate}`);
  const l = process.argv.indexOf('--lines');
  const wanted = l > 0 ? (process.argv[l + 1] ?? '').split(',') : null;
  const all = wanted === null ? every : every.filter((p) => wanted.includes(p.name));

  console.log(
    `${seeds} seeds per line, ${changed.length === 0 ? 'shipped TUNING' : changed.join(' ')}\n`,
  );
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
      pad('late%', 6),
      pad('car', 5),
    ].join(' '),
  );
  const colourRows: string[] = [];
  const bandRows: string[] = [];
  for (const policy of all) {
    const runs: Felt[] = [];
    for (let s = 1; s <= seeds; s++) runs.push(feel(policy, s, tuning, escalate));
    const pts = runs.map((r) => r.points);
    colourRows.push(colourRow(policy.name, runs));
    bandRows.push(
      `${policy.name.padEnd(14)} ${[0, 1, 2, 3].map((b) => mean(runs.map((r) => r.bands[b as 0 | 1 | 2 | 3])).toFixed(2)).join(' / ')}`,
    );
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
        pad((100 * mean(runs.map((r) => r.late))).toFixed(0), 6),
        pad(mean(runs.map((r) => r.caravans)).toFixed(1), 5),
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
  if (process.argv.includes('--colour')) {
    console.log('\nCOLOUR BY STAGE — mean pop points in each third of the run, and colour');
    console.log("(matches + power + rare + native) as a share of that third's points\n");
    console.log(
      [
        'line'.padEnd(14),
        pad('early', 7),
        pad('col', 6),
        pad('middle', 7),
        pad('col', 6),
        pad('late', 7),
        pad('col', 6),
      ].join(' '),
    );
    for (const row of colourRows) console.log(row);
  }
  if (want.life > 0) {
    console.log('');
    console.log('WANTED SIZE — requests met per run: small / medium / large / outrageous');
    for (const row of bandRows) console.log(row);
  }
}

main();
