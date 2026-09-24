import { COLOURS, type Colour, type Tuning } from '@content/tuning';
import { distance, key, neighbourKeys, parse, type HexKey } from '@engine/hex';
import { canSpend, rarityOdds, spendCost } from '@engine/reduce';
import {
  cachePaysAt,
  canPlaceNow,
  costOf,
  harvestMultiplier,
  harvestValue,
  homeOf,
  isRipe,
  legalPlacements,
  placementsLeft,
  previewWorth,
  reachOf,
  ripeKeys,
  scoreOf,
  territoryPaysAt,
  withinBeaconHorizon,
  worthOf,
} from '@engine/rules';
import type {
  GameState,
  HarvestChoice,
  LandmarkReward,
  PointsSplit,
  Rarity,
  Spend,
} from '@engine/state';
import {
  destinationAt,
  destinationsWithin,
  elevationBandAt,
  findAt,
  findsWithin,
  terrainAt,
} from '@engine/world';
import { brightness, namesOf, powersOf, type Light, type Theme } from '@theme/tokens';
import type { IconName } from '@theme/icons';
import type { BoardView, CellKind, CellView } from '@render/Renderer';
import type { Strings } from '@text/Strings';

/** A direction that wants no falloff at all — and every test that has no theme. */
const NO_FALLOFF: Light = { radius: Infinity, fade: 1, floor: 1 };

const ORIGIN_HEX = { q: 0, r: 0 };

/**
 * How far `structureDistances` below is willing to walk before it stops
 * caring exactly how far a hex is. `brightness()` clamps to `floor` for any
 * distance at or past `light.radius + light.fade`, and the largest such sum
 * among the shipped themes is cold survey's 24 (torchlit 15, rot bloom 18) —
 * so a sentinel exactly there can never read differently from the true
 * distance for a theme that exists today, and it keeps the flood fill from
 * paying for a halo no theme's curve can see past. A render-precision
 * constant, not a balance number: this file has no theme to read one from,
 * by design — bump it if a future direction's `radius + fade` exceeds it.
 */
const STRUCTURE_LIGHT_CAP = 24;

/**
 * The light the structure carries (2026-08-18/19): distance from every hex
 * within `STRUCTURE_LIGHT_CAP` steps to the nearest BUILT cell — a tile or a
 * stone, the structure actually placed — rather than to the one hex last
 * placed. `torchlit.ts`'s header recorded this as the direction's best idea
 * and unbuilt; this is it built.
 *
 * One multi-source BFS: every built cell seeds the frontier at distance 0,
 * which then expands outward across the raw hex lattice a ring at a time —
 * not only cells the board has drawn, because a beacon or a remembered hex
 * sitting past the grown ground still needs an honest distance. O(cells
 * reached), computed once per render.
 */
function structureDistances(cells: GameState['cells']): ReadonlyMap<HexKey, number> {
  const dist = new Map<HexKey, number>();
  const queue: HexKey[] = [];
  for (const [k, cell] of Object.entries(cells)) {
    if (cell.kind === 'tile' || cell.kind === 'stone') {
      dist.set(k, 0);
      queue.push(k);
    }
  }
  for (let i = 0; i < queue.length; i++) {
    const k = queue[i]!;
    const d = dist.get(k)!;
    if (d >= STRUCTURE_LIGHT_CAP) continue;
    const { q, r } = parse(k);
    for (const n of neighbourKeys(q, r)) {
      if (!dist.has(n)) {
        dist.set(n, d + 1);
        queue.push(n);
      }
    }
  }
  return dist;
}

/** `structureDistances`' answer for one hex, or the cap once past its reach. */
function structureDistanceAt(dist: ReadonlyMap<HexKey, number>, q: number, r: number): number {
  return dist.get(key(q, r)) ?? STRUCTURE_LIGHT_CAP;
}

/**
 * State to screen, as one pure function.
 *
 * Everything the player is shown is derived here, so the UI cannot invent a
 * number the engine disagrees with — the classic version of that bug is a
 * preview that says 4 and a placement that pays 3. It is also the only reason
 * any of this is testable: the interesting question is "does the board show the
 * right thing", and answering it needs no canvas and no phone.
 */

/*
 * `resolveHarvestTarget` lived here until 2026-08-21 — the rule for which
 * pocket the harvest buttons price: a tapped ripe tile targets its own
 * cluster, and with no tap (or a stale one, since popped) the biggest pocket
 * is the default, so the buttons are never dead while anything is ripe.
 *
 * It was exported and called by nobody. `renderContext` owns that rule now,
 * and owns it BECAUSE it has already walked the ripe set once for the render:
 * a standalone helper would re-walk the whole board to answer the same
 * question, which is the exact cost the context exists to stop paying. So it
 * is superseded rather than merely unused, and the rule belongs where the
 * data already is.
 */

/**
 * Everything both selectors need that costs a pass over the board, computed
 * ONCE per render and threaded through explicitly.
 *
 * Before this existed a single render resolved the harvest target three
 * times, walked the ripe set five, measured reach three and re-derived every
 * draft preview the board had already computed — each of them a full board
 * pass, each per tap, on a board that only grows. An explicit context (not a
 * module cache — the one last-value cache below is the exception, and it
 * predates this) keeps the selectors pure and keeps "computed once" a fact
 * the call shape enforces rather than a discipline.
 *
 * Nothing here DECIDES anything: every field is exactly what the old
 * per-selector derivations produced, checked by the invariant tests staying
 * green with their displayed values unchanged.
 */
type RenderContext = {
  /** Every ripe key, in board order — one ripeness pass for the render. */
  readonly ripe: ReadonlySet<HexKey>;
  /** The pocket a harvest would pop: the tapped ripe tile's, or the biggest. */
  readonly target: HexKey | null;
  /** The exact cells `target` pops — the board's outline. */
  readonly targetCluster: ReadonlySet<HexKey>;
  /** What popping `target` pays. The buttons' numbers. (A `defaultValue` —
   *  the biggest pocket's price whatever was tapped — sat beside this until
   *  2026-09-16; its one reader was the guide line, and both are gone.) */
  readonly value: ReturnType<typeof harvestValue>;
  /** Hexes a tile may go right now. Empty exactly when `canPlaceNow` is not. */
  readonly legal: ReadonlySet<HexKey>;
  /**
   * `previewWorth` per draft card per legal hex — what the board prints for
   * the selected card and what BEST is judged on, derived once so the two
   * can never disagree.
   */
  readonly previews: readonly ReadonlyMap<HexKey, number>[];
  /** How far from home the run has built — REACH, and the beacon horizon. */
  readonly reach: number;
  /**
   * How many SEPARATE ripe pockets exist right now — not ripe tiles, pockets:
   * a POP · N READY count needs the number of decisions on the board, and a
   * 12-tile pocket is one decision same as a 2-tile one. Free from the same
   * clustering pass that already finds `target`.
   */
  readonly pocketCount: number;
  /**
   * Every drawn cell, parsed once. The KEEN NOSE shimmer loop is the one
   * consumer today (an O(cells × finds) distance scan per render), but this
   * is the same "computed once, threaded through" shape as the rest of the
   * context rather than a re-parse living inside `toBoardView`.
   */
  readonly ground: readonly { readonly q: number; readonly r: number }[];
  /**
   * The light the structure carries: every reached hex's distance to the
   * nearest BUILT cell (tile or stone), from one multi-source BFS run once
   * per render. See `structureDistances`.
   */
  readonly structureDist: ReadonlyMap<HexKey, number>;
};

export function renderContext(state: GameState, asked: HexKey | null = null): RenderContext {
  // One ripeness pass; the pockets are walked over the SET, which cannot
  // change the answer (`ripeClusterAt` walks ripe neighbours the same way)
  // and saves re-asking `isRipe` once per neighbour per cluster.
  const ripe = new Set(ripeKeys(state.cells));
  const pockets: HexKey[][] = [];
  {
    const seen = new Set<HexKey>();
    for (const k of ripe) {
      if (seen.has(k)) continue;
      const cluster: HexKey[] = [k];
      seen.add(k);
      for (let i = 0; i < cluster.length; i++) {
        const { q, r } = parse(cluster[i]!);
        for (const n of neighbourKeys(q, r)) {
          if (ripe.has(n) && !seen.has(n)) {
            seen.add(n);
            cluster.push(n);
          }
        }
      }
      pockets.push(cluster);
    }
  }

  let biggest: HexKey[] | null = null;
  for (const pocket of pockets) {
    if (biggest === null || pocket.length > biggest.length) biggest = pocket;
  }
  const defaultTarget = biggest?.[0] ?? null;
  const target = asked !== null && ripe.has(asked) ? asked : defaultTarget;
  const targetCluster = new Set(
    target === null ? [] : (pockets.find((p) => p.includes(target)) ?? []),
  );

  const value = harvestValue(state, target ?? undefined);

  const placeable = canPlaceNow(state);
  // The tuning rides along so WALLBREAKER's wall placements light up and
  // preview like any legal hex — legality has one owner, and this is it.
  const legal = new Set(placeable ? legalPlacements(state.cells, state.tuning) : []);
  const home = homeOf(state);
  const previews = placeable
    ? state.draft.map((tile) => {
        const map = new Map<HexKey, number>();
        for (const k of legal) {
          map.set(k, previewWorth(state.cells, k, tile, state.tuning, home, state.luck));
        }
        return map;
      })
    : [];

  return {
    ripe,
    target,
    targetCluster,
    value,
    legal,
    previews,
    reach: reachOf(state),
    pocketCount: pockets.length,
    ground: Object.keys(state.cells).map(parse),
    structureDist: structureDistances(state.cells),
  };
}

export function toBoardView(
  state: GameState,
  harvestAt: HexKey | null = null,
  spotlight: Colour | null = null,
  memory: readonly HexKey[] = [],
  light: Light = NO_FALLOFF,
  // The per-render derivations, shareable with `toHudView`. Callers that
  // render both (the game loop) build one and pass it twice; everyone else
  // gets a fresh one for free.
  ctx: RenderContext = renderContext(state, harvestAt),
): BoardView {
  // The light the structure carries (2026-08-18/19): the real source is now
  // every BUILT cell, not one hex — `ctx.structureDist` is that answer, one
  // multi-source BFS shared by the whole render. `lastPlaced` (or the origin
  // before anything is built) keeps a small bonus pool on top: full
  // brightness within the theme's own radius of it, exactly the old
  // single-torch formula. `Math.max` of the two means the spot you are
  // working RIGHT NOW still reads a touch warmer than the rest of the
  // structure, and neither source can ever make a cell darker than the
  // other already had it — nothing regresses past what today's torch drew.
  //
  // Defensive on purpose: a save written before `lastPlaced` existed decodes
  // it as absent, and `undefined` walks straight past an `=== null` guard
  // into `parse`. `decodeRun` fills it as well — both, because this one cost
  // Marc a black screen on the first frame of a resumed run.
  const torch = typeof state.lastPlaced === 'string' ? parse(state.lastPlaced) : ORIGIN_HEX;
  const lit = (q: number, r: number): number =>
    Math.max(
      brightness(light, structureDistanceAt(ctx.structureDist, q, r)),
      brightness(light, distance({ q, r }, torch)),
    );
  const band = (q: number, r: number): number =>
    elevationBandAt(state.rootSeed, q, r, state.tuning);
  // The hearth marker (2026-08-19): the origin cell, always a `tile` or a
  // `stone` (the run's own seed tile, possibly since popped) and so always a
  // member of `state.cells` — it can never be memory, a beacon or a shimmer,
  // which is why only the loop below ever sets this `true`.
  const home = homeOf(state);
  const homeKey = key(home.q, home.r);
  const previews = ctx.previews[state.selected];
  // The tile actually in hand — the ghost used to draw as one fixed tint no
  // matter what you were holding. `?? null` covers the edge a full stash
  // swap can leave for one render: `selected` unchanged, `draft` shorter.
  const heldColour = state.draft[state.selected]?.colour ?? null;

  const cells: CellView[] = Object.entries(state.cells).map(([k, cell]) => {
    const { q, r } = parse(k);
    const legal = ctx.legal.has(k);

    return {
      key: k,
      q,
      r,
      kind: cell.kind satisfies CellKind,
      colour: cell.kind === 'tile' || cell.kind === 'landmark' ? (cell.colour ?? null) : null,
      landmark: cell.kind === 'landmark' ? cell.reward : null,
      claimed: cell.kind === 'landmark' && cell.claimed,
      beacon: false,
      shimmer: false,
      rarity: cell.kind === 'tile' ? (cell.rarity ?? null) : null,
      native: cell.kind === 'empty' ? (cell.native ?? null) : null,
      remembered: false,
      ripe: ctx.ripe.has(k),
      targeted: ctx.targetCluster.has(k),
      // The colour lens: with a chip active, every OTHER colour's tiles step
      // back so one colour's holdings read as a single shape on the board.
      dimmed: spotlight !== null && cell.kind === 'tile' && cell.colour !== spotlight,
      lensed: spotlight !== null && cell.kind === 'tile' && cell.colour === spotlight,
      worth: worthOf(state.cells, k, state.tuning, home, state.luck),
      home: k === homeKey,
      light: lit(q, r),
      band: band(q, r),
      legal,
      preview: legal ? (previews?.get(k) ?? null) : null,
      previewColour: legal ? heldColour : null,
    };
  });

  // Ground this WORLD remembers from earlier runs (P4a), drawn faint under
  // everything: terrain re-derived from the same pure hash that made it, so
  // only the keys had to be kept. It is scenery and a map, never playable —
  // this run still has to grow its own way out there.
  //
  // Held territories unfurl their FIELDS in memory too (Marc, 2026-08-20:
  // "i still dont see clearly the territories" — the live reveal has
  // painted a held territory's field since P4a via the engine's
  // `claimedFields`, but this reconstruction read native ground off the
  // bare terrain hash, so a remembered territory was one ◈ standing in
  // plain ground with no footprint around it).
  const heldFields: { q: number; r: number; colour: Colour }[] = [];
  for (const ck of state.claimed) {
    const { q, r } = parse(ck);
    const held = destinationAt(state.rootSeed, q, r, state.tuning);
    if (held?.reward === 'territory' && held.colour !== null) {
      heldFields.push({ q, r, colour: held.colour });
    }
  }
  const heldFieldAt = (q: number, r: number): Colour | null => {
    for (const f of heldFields) {
      if (distance({ q, r }, f) <= state.tuning.territoryRadius) return f.colour;
    }
    return null;
  };

  const onBoard = new Set(Object.keys(state.cells));

  /*
   * WHAT WILL BE DRAWN OVER THE MAP, KNOWN BEFORE THE MAP IS DRAWN
   * (2026-09-09, Marc, on a phone: *"we see double glyphs in 3d (one flat, one
   * on top)"*).
   *
   * Three passes below add cells the live board does not hold: memory, then
   * beacons, then shimmers. Each skipped `onBoard` and only the LIVE board was
   * ever in it, because the memory pass never put its own keys there. So a
   * remembered destination inside the beacon horizon was pushed TWICE, once as
   * remembered fog and once as a beacon, and the board obligingly drew both:
   * `Labels` lays a remembered mark FLAT on its hex and stands a beacon’s up on
   * a billboard, which is exactly the squashed star with a second star standing
   * on it in Marc’s screenshot. Two hexes, two marks, one place.
   *
   * **The beacon wins** (Marc’s ruling, same day). A beacon is the promise that
   * there is somewhere to go, and the HORIZON is what decides which
   * destinations carry it, not whether an earlier run happened to walk past.
   * Memory winning would have put the beacons out one by one in exactly the
   * worlds a player replays most.
   *
   * So both live passes are selected HERE, above the memory pass, and memory
   * yields to either. Reordering the three passes would say the same thing and
   * would also reorder `cells` for everything downstream that reads them in
   * order; this says it where a reader of the memory pass can see it.
   *
   * **The shimmer is included on purpose, not by accident of the fix.** It has
   * the identical hole — a find inside `findSense` of the live board, standing
   * on ground this world remembers, was two cells too — and the same rule
   * settles it: what is glowing NOW beats the map of what was walked before.
   * Rarer, because it needs KEEN NOSE bought, and it costs a one-hex hole in
   * the fog where the glow is, which is exactly how a beacon already reads.
   */
  const beacons = beaconsFor(state, ctx.reach).filter((d) => !onBoard.has(key(d.q, d.r)));
  const shimmers = shimmersFor(state, ctx);
  const overMemory = new Set<HexKey>();
  for (const d of beacons) overMemory.add(key(d.q, d.r));
  for (const f of shimmers) overMemory.add(key(f.q, f.r));

  for (const k of memory) {
    if (onBoard.has(k) || overMemory.has(k)) continue;
    const { q, r } = parse(k);
    const ground = terrainAt(state.rootSeed, q, r, state.tuning);
    // A reborn landmark wears its NEW face in the fog too (2026-08-20): a
    // woken shrine rolled into a cache this run must not still read ◈ on
    // the map — the map is a promise about what walking there pays.
    const reborn = state.rearmed[k];
    const dest =
      reborn !== undefined
        ? { reward: reborn, colour: null }
        : destinationAt(state.rootSeed, q, r, state.tuning);
    const nativeHere = dest === null && !ground.wall ? (heldFieldAt(q, r) ?? ground.native) : null;
    cells.push({
      key: k,
      q,
      r,
      kind: dest !== null ? 'landmark' : ground.wall ? 'wall' : 'empty',
      colour: dest?.colour ?? null,
      landmark: dest?.reward ?? null,
      claimed: dest !== null && reborn === undefined && state.claimed.includes(k),
      beacon: false,
      shimmer: false,
      remembered: true,
      rarity: null,
      native: nativeHere,
      // MAP light, not torch light (Marc, 2026-08-20, with a screenshot:
      // "we still cant see grounds clearly in the fog, its too dark"): the
      // torch's distance falloff was multiplying INTO the fog's own alpha,
      // so remembered ground more than a few hexes from the live structure
      // was doubly dark — black on black. Memory is a map the player is
      // reading, not ground the torch is lighting; it draws at full light
      // and lets `fog.alpha` and `fog.veil` alone say "not this run".
      light: 1,
      band: band(q, r),
      ripe: false,
      targeted: false,
      // The lens reaches into memory (Marc, 2026-08-20: "it highlights the
      // whole known biome"): with a colour spotlit — a card long-pressed,
      // or known fog ground tapped — every remembered patch NOT of that
      // colour steps back, so the known extent of one colour's ground
      // reads as a single shape through the fog.
      dimmed: spotlight !== null && (dest?.colour ?? nativeHere) !== spotlight,
      // The lens's positive half reaches memory too (Marc, Day 2: "the
      // lit shape is subtle"): matching fog draws brighter and edged in
      // its own colour, not merely un-dimmed.
      lensed: spotlight !== null && (dest?.colour ?? nativeHere) === spotlight,
      worth: 0,
      home: false,
      legal: false,
      preview: null,
      previewColour: null,
    });
  }

  // Destinations the board has not grown to yet, glowing through ground that
  // is not drawn: the endless world's somewhere-to-go. The horizon moves with
  // reach, so the next glow appears at the rim as you push toward the last.
  for (const d of beacons) {
    // The beacon wears the reborn face too (2026-08-20) — a woken shrine
    // rolled into a site this run glows as the ★ walking there will pay.
    const reborn = state.rearmed[key(d.q, d.r)];
    cells.push({
      key: key(d.q, d.r),
      q: d.q,
      r: d.r,
      kind: 'landmark',
      colour: reborn !== undefined ? null : d.colour,
      landmark: reborn ?? d.reward,
      claimed: reborn === undefined && state.claimed.includes(key(d.q, d.r)),
      beacon: true,
      shimmer: false,
      remembered: false,
      rarity: null,
      native: null,
      light: lit(d.q, d.r),
      band: band(d.q, d.r),
      ripe: false,
      targeted: false,
      dimmed: false,
      lensed: false,
      worth: 0,
      home: false,
      legal: false,
      preview: null,
      previewColour: null,
    });
  }

  // The shimmer (`findSense` > 0, sold as KEEN NOSE): a hidden find within
  // sense range of ANY cell of this run's board glows dimly — no glyph, no
  // kind, no atlas entry. `shimmersFor` is the ONE selector of unrevealed
  // finds; nothing else may draw one, because a find that shows through the
  // dark is a destination with extra steps.
  for (const f of shimmers) {
    cells.push({
      key: key(f.q, f.r),
      q: f.q,
      r: f.r,
      kind: 'landmark',
      colour: null,
      landmark: null,
      claimed: false,
      beacon: false,
      shimmer: true,
      remembered: false,
      rarity: null,
      native: null,
      light: lit(f.q, f.r),
      band: band(f.q, f.r),
      ripe: false,
      targeted: false,
      dimmed: false,
      lensed: false,
      worth: 0,
      home: false,
      legal: false,
      preview: null,
      previewColour: null,
    });
  }

  return { cells, targetHex: ctx.target };
}

/**
 * The last `destinationsWithin` answer, keyed on everything it depends on.
 *
 * The scan is O(blocks²) in the horizon and pure in (seed, horizon, tuning) —
 * and two selectors (beacons and the hint line) ask the identical question
 * every render, so at reach 18 the board was paying ~400 block hashes per
 * frame for one answer. The horizon only moves when reach does; this cache
 * makes the second ask (and most first asks) free.
 */
let lastDestinations: {
  seed: number;
  horizon: number;
  tuning: unknown;
  out: ReturnType<typeof destinationsWithin>;
} | null = null;

function destinationsCached(
  seed: number,
  horizon: number,
  tuning: GameState['tuning'],
): ReturnType<typeof destinationsWithin> {
  if (
    lastDestinations !== null &&
    lastDestinations.seed === seed &&
    lastDestinations.horizon === horizon &&
    lastDestinations.tuning === tuning
  ) {
    return lastDestinations.out;
  }
  const out = destinationsWithin(seed, horizon, tuning);
  lastDestinations = { seed, horizon, tuning, out };
  return out;
}

/**
 * The last `findsWithin` answer, keyed on everything it depends on — the
 * same last-value cache shape as `destinationsCached`, for the same reason:
 * the shimmer loop asks this once a render and the horizon only moves when
 * reach does, so most asks are free.
 */
let lastFinds: {
  seed: number;
  horizon: number;
  tuning: unknown;
  out: ReturnType<typeof findsWithin>;
} | null = null;

function findsCached(
  seed: number,
  horizon: number,
  tuning: GameState['tuning'],
): ReturnType<typeof findsWithin> {
  if (
    lastFinds !== null &&
    lastFinds.seed === seed &&
    lastFinds.horizon === horizon &&
    lastFinds.tuning === tuning
  ) {
    return lastFinds.out;
  }
  const out = findsWithin(seed, horizon, tuning);
  lastFinds = { seed, horizon, tuning, out };
  return out;
}

/**
 * Destinations within the beacon horizon that growth has not revealed yet.
 * The horizon is a disc around HOME (camps, 2026-08-19): `destinationsWithin`
 * scans a disc around the world origin — geography is world-anchored — so a
 * camp run scans wide enough to contain its own disc and then filters by
 * distance from where it actually woke. Home IS the origin in every run
 * without a camp, where the wider scan collapses to exactly the old one.
 */
function beaconsFor(
  state: GameState,
  reach: number,
): { q: number; r: number; reward: LandmarkReward; colour: Colour | null }[] {
  const home = homeOf(state);
  const horizon = reach + state.tuning.beaconHorizon;
  const scan = horizon + distance(home, { q: 0, r: 0 });
  return destinationsCached(state.rootSeed, scan, state.tuning).filter(
    (d) =>
      state.cells[key(d.q, d.r)] === undefined && distance({ q: d.q, r: d.r }, home) <= horizon,
  );
}

/**
 * Unrevealed finds close enough to the run’s ground to shimmer.
 *
 * Lifted out of `toBoardView` (2026-09-09) for the reason `beaconsFor` was
 * always a selector: the memory pass has to know what will be drawn OVER the
 * map before it draws the map, and “what will be drawn” cannot live inside the
 * loop that draws it. See the note above the memory pass.
 *
 * `findsCached` and `ctx.ground` mirror `destinationsCached` and its beacon
 * caller — before that the scan ran uncached (O(blocks²) every render) over a
 * ground list re-parsed from scratch every render too, at O(cells), real cost
 * once reach grows past a couple dozen. The scan is widened by the home offset
 * (2026-08-21): `findsWithin` scans a disc around world ORIGIN and `ctx.reach`
 * is measured from HOME, so a camp run asked for a disc that did not contain
 * its own ground and the purchased perk shimmered nothing. The ground filter is
 * what actually decides what draws, so a wider scan costs blocks, not truth.
 */
function shimmersFor(state: GameState, ctx: RenderContext): { q: number; r: number }[] {
  if (state.tuning.findSense <= 0) return [];
  const sense = state.tuning.findSense;
  const scan = ctx.reach + sense + 1 + distance(homeOf(state), ORIGIN_HEX);
  return findsCached(state.rootSeed, scan, state.tuning).filter(
    (f) =>
      state.cells[key(f.q, f.r)] === undefined && ctx.ground.some((h) => distance(h, f) <= sense),
  );
}

/**
 * Everything outside the board: the run's numbers, and which buttons are live.
 *
 * The disabled reasons are text rather than booleans because a control that is
 * simply dead teaches nothing. "Harvest here first" is the rule being explained
 * at the only moment the player cares about it, which is the whole tutorial
 * budget this game gets.
 */
export type HudView = {
  readonly tiles: number;
  readonly points: number;
  /** Depth is REACH: how far from home this run has built. */
  readonly depthValue: number;
  readonly cost: number;
  readonly placements: number;
  /**
   * Placements the clock still allows, or null where there is no clock. The
   * number that makes leftover tiles worthless, so it is on screen from the
   * first second rather than sprung at the end.
   */
  readonly left: number | null;
  /**
   * True when the purse already holds more tiles than the clock can spend —
   * so a tiles-harvest buys literally nothing and points are the only thing
   * left to want. Marc found this state on the board with 202 tiles and 167
   * placements left: the mechanism was working exactly as designed and the
   * game never said a word about it.
   *
   * It did not for two weeks (`pnpm sweep`, 2026-09-10): the sentence lived
   * in `guide` below, which Marc removed from over the hand on 2026-08-29, so
   * the fix for the state he found went out with the line that carried it.
   * **Said once a run now** (Marc, 2026-09-16: _"one toast when it becomes
   * true"_) — `shell/onceARun.ts` reads this and speaks
   * `view.guide.tilesSpareSingle` on the first beat nothing louder wants.
   */
  readonly tilesSpare: boolean;

  /**
   * False where the score is hidden until the run ends — points are the
   * between-runs payout, not a number to play against, so the HUD slot goes
   * to LUCK instead. The end screen always shows the score regardless.
   */
  readonly showPoints: boolean;

  /**
   * The luck purse and what it can buy. Empty where luck has no prices, which
   * is every game but the tiles-only one. A spend you cannot afford is still
   * LISTED — a shop with its expensive things hidden teaches you nothing.
   */
  readonly luck: number;
  readonly spends: readonly SpendView[];

  /**
   * Relics carried out of this run so far, and whether burning is what pays
   * them. The between-runs currency: shown on the end screen, and named on
   * the burn button so the sacrifice says what it buys.
   */
  readonly relics: number;
  readonly burnPaysRelics: boolean;

  /**
   * `colour` is the engine's `Colour`, not a string: the chrome looks up the
   * direction's name for it (`CRYPT`) and its CSS variable, and both of those are
   * exhaustive maps that a stray string would silently miss.
   */
  // The BEST marker used to ride here (the card whose strongest placement
  // pays most). Removed on Marc's call, 2026-08-19: the previews on the
  // board already print every card's numbers where they land, and the badge
  // was one more word on an already-worded card.
  readonly draft: readonly {
    readonly id: string;
    readonly colour: Colour;
    readonly rarity: Rarity;
    readonly selected: boolean;
  }[];

  /**
   * How many cards the hand DEALS, which is not always how many it is
   * holding: stashing into an empty slot takes the card out of the draft and
   * nothing puts one back until the next placement. The hand is laid out from
   * this rather than from `draft.length`, so its shape does not change under
   * a thumb for the two taps in between (Marc, 2026-08-27).
   */
  readonly draftWidth: number;

  /** Whether the stash exists at all (`tuning.holdSlots > 0`). */
  readonly canHold: boolean;
  /** How many slots the stash has — 1, or 2 once that shrine is woken. */
  readonly holdSlots: number;
  /** The stashed tiles, oldest first. Shorter than `holdSlots` when there is
   *  room left; empty while the stash sits unused. */
  readonly held: readonly { readonly colour: Colour; readonly rarity: Rarity }[];

  /**
   * The colour lens: each colour's standing holdings on the board, in the
   * exact unit the points formula sums — worth.
   *
   * **NOTHING PRINTS EITHER OF THESE YET** (`pnpm sweep`, 2026-09-10). The
   * chips this used to describe are Ashwake 1's, where a long-pressed card put
   * a five-clause report under the board. This body lights the lens and says
   * the ground's NAME in the toast, so the numbers behind it go nowhere until
   * the LENS PANEL Marc ruled for on 2026-09-16 (`NEXT.md` §1a) exists.
   *
   * **And until it does, they cost nothing** (2026-09-16). `colourPotentials`
   * tallies every live tile TWICE — once as authored, once with the four
   * powers switched off, because a colour's own take is measured rather than
   * estimated — and it ran on every HUD build, on every placement, on a phone,
   * for a panel that did not exist. Both fields are GETTERS on the view now:
   * nothing is tallied until something reads one, and one tally serves both.
   * A reader sees exactly the object it always saw.
   */
  readonly colours: readonly ColourPotential[];
  /** The colour currently held up, with its numbers. Null when none. Unread —
   *  see `colours` directly above. */
  readonly spotlight: ColourPotential | null;

  readonly ripeCount: number;
  /**
   * Separate ripe pockets, not ripe tiles — a big pocket is still one
   * decision, and that is the number worth showing.
   *
   * There was no "POP · N READY" for two weeks (`pnpm sweep`, 2026-09-10):
   * this docblock named a label no screen drew. **The action bar prints it
   * now** (Marc, 2026-09-16: _"yes we can add this. use width"_) — in the free
   * width of the bar beside POP rather than on the button, as `guide.pockets`
   * words it, and only from two: one ready pocket is already the POP button
   * being there. `view.test.ts` pins the counting rule.
   */
  readonly pocketsReady: number;
  /** What harvesting right now would pay, each way. Both are always shown. */
  readonly harvestTiles: number;
  readonly harvestPoints: number;
  /**
   * The priced pocket's distance multiplier — depth, in the one unit the
   * player already reads the board in. Where points are hidden mid-run
   * (`hidePoints`), this is what POP shows in place of the points figure it
   * used to leak regardless of the setting meant to hide it.
   */
  readonly harvestDepth: number;
  /** The pocket those prices are FOR, on the plane. Null on bounded maps. */
  readonly harvestAt: HexKey | null;

  /**
   * True when taking the priced pocket as POINTS collects the standing bounty.
   *
   * **POP wears it** (Marc, 2026-09-16, the same answer Ashwake 1 gave): the
   * site glyph rides the POP label and the button takes a `bounty` class
   * (`screens/ActionBar.tsx`). The FIGURE was always right — the multiplier is
   * applied inside `harvestValue` — so the mark is the only thing that was
   * missing: a sign of WHY it is bigger.
   *
   * For two weeks this docblock claimed the points button wore it and no
   * screen read the field (`pnpm sweep`, 2026-09-10). `CLAUDE.md`: a comment
   * that asserts an invariant is not the invariant, and it is the sentence
   * that stops a reader checking. This one stopped four.
   */
  readonly questPays: boolean;

  /** Luck a BURN would pay for the priced pocket; 0 where burning is off. */
  readonly harvestBurn: number;
  /**
   * True when a pop pays tiles and scores with no choice to make — the
   * tiles-only run. The points button stops existing rather than sitting
   * there meaning the same thing as its neighbour.
   */
  readonly singlePayout: boolean;

  readonly canHarvest: boolean;

  /**
   * The nearest unclaimed destination, as one short sentence — the endless
   * world's answer to "where do I go?". Null when there is nothing to say,
   * which includes the whole bounded game.
   */
  readonly hint: string | null;
  /**
   * The draft's current rarity odds, spelled out — Marc asked for the odds to
   * be visible, and luck raising them is only a reward if you can watch it.
   */
  readonly odds: string | null;

  readonly ended: boolean;
  /** Gate D: the cause of death, in one sentence. */
  readonly epitaph: string | null;
  /**
   * What-still-glows (2026-08-18): the nearest unreached destination and how
   * far past the run's own edge it sits, for the end screen's run face.
   * Null while the run lives, and null when there is nothing left to name.
   */
  readonly glowBeyondEdge: string | null;
  /**
   * The run, summarised for its end screen — Gate D's arc made visible.
   * `biggestAt` is where the run's biggest harvest landed as a fraction of
   * its length: near 1 is an arc, near 0.5 is a plateau, and the player
   * seeing that number is the gate's own question asked of every run.
   * Null while the run lives.
   */
  readonly summary: {
    readonly biggestHarvest: number;
    readonly biggestAt: number;
    readonly claims: number;
    readonly quests: number;
    readonly luck: number;
    /** Gate B's subject, for this run: how the harvests were cashed. */
    readonly harvests: number;
    readonly tilesTaken: number;
    readonly pointsTaken: number;
    /**
     * Where the run's POP points came from, counted three ways (2026-08-27,
     * Marc: "in our stats end run we could see our points distribution").
     * Every scoring harvest's own `split`, summed. `null` when the run banked
     * nothing from pops, and when a run saved before today is finished — its
     * harvests carry no splits and inventing zeroes would be a lie shaped
     * like data.
     */
    readonly points: PointsSplit | null;
    /** Points paid by claiming sites outright — see `log.sitePoints`. */
    readonly sitePoints: number;
  } | null;
};

export function toHudView(
  state: GameState,
  s: Strings,
  harvestAt: HexKey | null = null,
  spotlight: Colour | null = null,
  // Shareable with `toBoardView` — see the parameter there.
  ctx: RenderContext = renderContext(state, harvestAt),
): HudView {
  const target = ctx.target;
  const value = ctx.value;
  // Lazy, and once: see `HudView.colours`.
  let tally: readonly ColourPotential[] | null = null;
  const colours = (): readonly ColourPotential[] => (tally ??= colourPotentials(state));

  return {
    tiles: state.tiles,
    points: state.points,
    depthValue: ctx.reach,
    cost: costOf(state.placements, state.tuning),
    placements: state.placements,
    left: placementsLeft(state),
    tilesSpare: tilesSpareIn(state),

    showPoints: !state.tuning.hidePoints,
    luck: state.luck,
    spends: spendsFor(state),

    draft: state.draft.map((tile, i) => ({
      id: tile.id,
      colour: tile.colour,
      rarity: tile.rarity,
      selected: i === state.selected,
    })),
    draftWidth: Math.max(0, state.tuning.draftWidth),

    canHold: state.tuning.holdSlots > 0,
    holdSlots: Math.max(0, state.tuning.holdSlots),
    held: state.held.map((t) => ({ colour: t.colour, rarity: t.rarity })),

    get colours() {
      return colours();
    },
    get spotlight() {
      return colours().find((c) => c.colour === spotlight) ?? null;
    },

    ripeCount: ctx.ripe.size,
    pocketsReady: ctx.pocketCount,
    harvestTiles: value.tiles,
    // Through scoreOf, not raw (2026-08-25, Marc with two screenshots: "what
    // it says as points is not what it does" — the button promised 13974 and
    // the pop banked 4890). harvestValue's points are PRE-scale; the reducer
    // banks scoreOf(points), which applies pointsPerPop under the single
    // payout. The receipt and the manual both went through scoreOf since
    // 2026-08-21; the button was the one reader left on the raw figure. Under
    // the old fork economy scoreOf is the identity, so this is one honest
    // number for both.
    harvestPoints: scoreOf(value.points, state.tuning),
    harvestDepth: harvestMultiplier(state, value.keys),
    harvestAt: target,

    questPays: value.questPays,
    // The sacrifice pays RELICS now: the between-runs currency, and the only
    // thing on this screen that is not about staying alive.
    harvestBurn:
      state.tuning.burnRelics > 0
        ? value.count * state.tuning.burnRelics
        : state.tuning.burnLuck > 0
          ? value.count * state.tuning.burnLuck
          : 0,
    burnPaysRelics: state.tuning.burnRelics > 0,
    relics: state.relics,
    singlePayout: state.tuning.singlePayout,

    canHarvest: state.phase === 'placing' && value.count > 0,

    hint: hintFor(state, ctx.reach, s),
    odds: oddsFor(state, s),

    ended: state.phase === 'ended',
    epitaph: state.phase === 'ended' ? epitaphFor(state, s) : null,
    glowBeyondEdge: state.phase === 'ended' ? whatGlows(state, ctx.reach, s) : null,
    summary: state.phase === 'ended' ? summariseRun(state) : null,
  };
}

/**
 * One purchase in the luck shop: what it is called, what it costs, and
 * whether the purse can pay for it right now.
 *
 * Steering is listed once per colour rather than offered as a mode, because a
 * mode is a second tap and a state to be in; four labelled buttons are four
 * things you can do. Each wears the world's own word for its colour.
 */
export type SpendView = {
  readonly on: Spend;
  readonly colour: Colour | null;
  readonly cost: number;
  readonly affordable: boolean;
  /**
   * TITHE only (2026-08-18): what the WHOLE purse converts into right now —
   * `cost` for every other spend is a fixed price, but a tithe's price IS
   * the purse, so this is the number the row actually needs to print.
   */
  readonly relics?: number;
};

/** The shop, in the order it reads: cheapest first, forge — then tithe, the exit from the purse. */
function spendsFor(state: GameState): readonly SpendView[] {
  const t = state.tuning;
  const rows: SpendView[] = [];
  if (t.luckRerollCost > 0) {
    rows.push({
      on: 'reroll',
      colour: null,
      cost: spendCost(t, 'reroll'),
      affordable: canSpend(state, 'reroll'),
    });
  }
  if (t.luckSteerCost > 0) {
    for (const colour of COLOURS) {
      rows.push({
        on: 'steer',
        colour,
        cost: spendCost(t, 'steer'),
        affordable: canSpend(state, 'steer'),
      });
    }
  }
  if (t.luckForgeCost > 0) {
    rows.push({
      on: 'forge',
      colour: null,
      cost: spendCost(t, 'forge'),
      affordable: canSpend(state, 'forge'),
    });
  }
  if (t.titheRate > 0 && t.titheMin > 0) {
    rows.push({
      on: 'tithe',
      colour: null,
      cost: state.luck,
      affordable: canSpend(state, 'tithe'),
      relics: Math.floor(state.luck * t.titheRate),
    });
  }
  return rows;
}

/** The end screen's numbers, from the log the engine already keeps. */
function summariseRun(state: GameState): NonNullable<HudView['summary']> {
  let biggestHarvest = 0;
  let biggestPlacement = 0;
  let tilesTaken = 0;
  let pointsTaken = 0;
  const points = emptySplit();
  let anySplit = false;
  for (const h of state.log.harvests) {
    // Same fix as `recordRun` (2026-08-21): a burn and a treasure are
    // sacrifices, not a payout taken one way rather than the other, and
    // `else` was filing both as points.
    if (h.choice === 'burn' || h.choice === 'treasure') continue;
    if (h.choice === 'tiles') tilesTaken++;
    else pointsTaken++;
    if (h.points > biggestHarvest) {
      biggestHarvest = h.points;
      biggestPlacement = h.at;
    }
    if (h.split !== undefined) {
      anySplit = true;
      addSplit(points, h.split);
    }
  }

  let claims = 0;
  for (const cell of Object.values(state.cells)) {
    if (cell.kind === 'landmark' && cell.claimed) claims++;
  }

  return {
    biggestHarvest,
    biggestAt: state.placements === 0 ? 0 : biggestPlacement / state.placements,
    claims,
    quests: state.log.questsDone,
    luck: state.luck,
    harvests: state.log.harvests.length,
    tilesTaken,
    pointsTaken,
    points: anySplit ? points : null,
    sitePoints: state.log.sitePoints ?? 0,
  };
}

/** A zeroed split, to fold every harvest's own into. */
function emptySplit(): Mutable<PointsSplit> {
  return {
    total: 0,
    byColour: { green: 0, yellow: 0, red: 0, blue: 0 },
    byRarity: { common: 0, magic: 0, unique: 0 },
    bySource: {
      matches: 0,
      power: 0,
      rare: 0,
      native: 0,
      pocket: 0,
      distance: 0,
      bounty: 0,
    },
  };
}

/**
 * Add one harvest's split into the running total, in place.
 *
 * Summing whole points rather than re-deriving from worth is what keeps the
 * run's three axes agreeing with each other: each harvest already settled its
 * own rounding against its own banked points (`pointsSplit`), so the sums
 * inherit that and cannot drift.
 */
function addSplit(into: Mutable<PointsSplit>, from: PointsSplit): void {
  into.total += from.total;
  for (const c of COLOURS) into.byColour[c] += from.byColour[c];
  for (const r of ['common', 'magic', 'unique'] as const) into.byRarity[r] += from.byRarity[r];
  for (const k of Object.keys(into.bySource) as (keyof PointsSplit['bySource'])[]) {
    into.bySource[k] += from.bySource[k];
  }
}

/** Writable mirror of `PointsSplit`, for the fold above and nowhere else. */
type Mutable<T> = {
  -readonly [K in keyof T]: T[K] extends object ? { -readonly [J in keyof T[K]]: T[K][J] } : T[K];
};

/**
 * Gate D's question, answered in words (2026-08-26): where the run's biggest
 * pop landed, as one sentence under the arc — the facts grid has printed
 * "BIGGEST POP n at 43%" since 2026-08-20, and a percentage is a fact
 * half-shown. Earned, not constant: null until the run popped at least three
 * times, because a shape needs more than two points to have one.
 */
export function arcNote(summary: NonNullable<HudView['summary']>, s: Strings): string | null {
  if (summary.harvests < 3 || summary.biggestHarvest <= 0) return null;
  if (summary.biggestAt >= 2 / 3) return s.view.arc.late;
  if (summary.biggestAt >= 1 / 3) return s.view.arc.mid;
  return s.view.arc.early;
}

/**
 * One colour's holdings, counted in the unit the points formula sums.
 *
 * `worth` is the truthful "potential points by colour": a points harvest
 * pays summed worth × pocket size × the multiplier, and worth is the only
 * term a colour owns. The split into ripe and still-growing says how much of
 * that potential is cashable right now versus still being set up.
 */
type ColourPotential = {
  readonly colour: Colour;
  /** Live tiles of this colour on the board. */
  readonly count: number;
  /** Their summed worth — the colour's standing investment. */
  readonly worth: number;
  /**
   * How much of that worth the colour's own POWER earned — crowds, company,
   * ash or tide — versus plain matching. Measured, not estimated: the same
   * board is re-tallied with the personalities switched off and the
   * difference is the power's take. This is what makes each colour's tip its
   * own; the payout formula itself is one channel for everyone, by design.
   */
  readonly bonus: number;
  readonly ripeCount: number;
  /** The worth already sitting ripe, cashable in the next pop. */
  readonly ripeWorth: number;
};

function colourPotentials(state: GameState): ColourPotential[] {
  const t = state.tuning;
  const plain = {
    ...t,
    greenCrowdBonus: 0,
    yellowCompanyBonus: 0,
    redAshMatches: false,
    blueTideEvery: 0,
  };

  const acc = new Map<
    Colour,
    { count: number; worth: number; bonus: number; ripeCount: number; ripeWorth: number }
  >(COLOURS.map((c) => [c, { count: 0, worth: 0, bonus: 0, ripeCount: 0, ripeWorth: 0 }]));
  const home = homeOf(state);
  for (const [k, cell] of Object.entries(state.cells)) {
    if (cell.kind !== 'tile') continue;
    const entry = acc.get(cell.colour);
    if (entry === undefined) continue;
    const worth = worthOf(state.cells, k, t, home, state.luck);
    entry.count++;
    entry.worth += worth;
    entry.bonus += worth - worthOf(state.cells, k, plain, home, state.luck);
    if (isRipe(state.cells, k)) {
      entry.ripeCount++;
      entry.ripeWorth += worth;
    }
  }
  return COLOURS.map((colour) => ({ colour, ...acc.get(colour)! }));
}

/*
 * THE GUIDE LINE IS GONE FROM THE VIEW TOO (2026-09-16).
 *
 * `guideFor` composed a one-clause "what now" — the runway alarm, the bounty
 * call, the spare purse, the pockets ready — for a line over the hand that
 * Marc removed on 2026-08-29 (_"remove tips above hand tiles"_). It stayed
 * computed for two and a half weeks on the argument that a coaching mode
 * would find it built. Nobody asked for one, and every fact it carried has a
 * door of its own now: the pockets count is the action bar's caption, the
 * spare purse is said once a run (`shell/onceARun.ts`), the bounty is a mark
 * on POP, and the runway is the tile count in the stat row. So the function,
 * its runway alarm and the seven sentences only it spoke are cut; what stays
 * of `view.guide` in the catalogue is the three sentences other doors read.
 */

/**
 * Does the purse already hold more than the clock can ever spend?
 *
 * The remaining placements cost at least `cost` each — more later, as the
 * curve climbs — so `left × cost` is the CHEAPEST the rest of the expedition
 * can possibly be. Holding more than that means a tiles-harvest buys nothing
 * at all, and the game should say so rather than leave a dead button looking
 * exactly like a live one.
 */
function tilesSpareIn(state: GameState): boolean {
  const left = placementsLeft(state);
  if (left === null) return false;
  return state.tiles > left * costOf(state.placements, state.tuning);
}

/**
 * The nearest unclaimed destination — revealed or beacon — found once and
 * shared by `hintFor` (the live signpost) and `whatGlows` (the end screen's
 * what-still-glows line, 2026-08-18) so the two can never name a different
 * destination or disagree on distance. NEVER a find: this is what a player
 * may be TOLD about, and a find is the one landmark that stays a secret.
 */
function nearestUnclaimed(
  state: GameState,
  reach: number,
): { reward: LandmarkReward; dist: number; at: HexKey } | null {
  // Everything here measures from HOME (2026-08-21). It used to measure the
  // candidates from world ORIGIN while the horizon below was built from a
  // home-anchored `reach` — two rulers in one function. On a camp run that
  // reported an adjacent cache as "glows 16 out", and scanned a disc around
  // origin that did not contain the player at all, so the beacons actually
  // drawn were never candidates and the candidates were never drawn.
  const home = homeOf(state);
  let best: { reward: LandmarkReward; dist: number; at: HexKey } | null = null;
  const consider = (q: number, r: number, reward: LandmarkReward): void => {
    const dist = distance({ q, r }, home);
    if (best === null || dist < best.dist) best = { reward, dist, at: key(q, r) };
  };

  for (const [k, cell] of Object.entries(state.cells)) {
    // A find is never advertised, not even revealed: the hint line is a
    // signpost, and a signpost to a hidden thing is a beacon in words.
    if (cell.kind === 'landmark' && !cell.claimed && cell.reward !== 'find') {
      const { q, r } = parse(k);
      consider(q, r, cell.reward);
    }
  }
  const horizon = reach + state.tuning.beaconHorizon;
  // The scan is a disc around origin, so a home away from origin needs it
  // widened by that offset before the home-anchored horizon can filter it —
  // exactly what `beaconsFor` already does, and what this did not.
  const scan = horizon + distance(home, ORIGIN_HEX);
  for (const d of destinationsCached(state.rootSeed, scan, state.tuning)) {
    if (distance({ q: d.q, r: d.r }, home) > horizon) continue;
    if (state.cells[key(d.q, d.r)] === undefined) consider(d.q, d.r, d.reward);
  }
  return best;
}

/** What `nearestUnclaimed` found, in words — "a cache of 40 tiles", and so on. */
function nameDestination(
  reward: LandmarkReward,
  at: HexKey,
  t: Tuning,
  home: { q: number; r: number },
  s: Strings,
): string {
  const d = s.view.destination;
  return reward === 'cache'
    ? // Priced from HOME, like the payment and the two banners (2026-08-21).
      d.cache(cachePaysAt(at, t, home))
    : reward === 'site'
      ? d.site
      : reward === 'shrine'
        ? d.shrine
        : d.territory;
}

/**
 * The nearest unclaimed destination — revealed or beacon — named and priced
 * in the one unit the player already reads the board in: hexes out.
 */
function hintFor(state: GameState, reach: number, s: Strings): string | null {
  const best = nearestUnclaimed(state, reach);
  if (best === null) return null;
  const { reward, dist, at } = best;
  return s.view.hint(nameDestination(reward, at, state.tuning, homeOf(state), s), dist);
}

/**
 * What-still-glows (2026-08-18): the end screen's own version of the
 * signpost, in the run's own edge — how far PAST where the run actually got
 * to, not how far from home, which is what "still glows" means once the run
 * is over. Reuses `hintFor`'s language and its never-a-find rule exactly;
 * the only thing that changes is the distance the sentence reports.
 */
export function whatGlows(state: GameState, reach: number, s: Strings): string | null {
  const best = nearestUnclaimed(state, reach);
  if (best === null) return null;
  const { reward, dist, at } = best;
  const beyond = Math.max(0, dist - reach);
  // "0 past your edge" is a sentence only a computer would say (Marc's
  // phone, 2026-08-26) — a destination the run drew level with but never
  // touched gets its own words.
  const name = nameDestination(reward, at, state.tuning, homeOf(state), s);
  if (beyond === 0) return s.view.glows.atEdge(name);
  return s.view.glows.past(name, beyond);
}

/** "magic 6% · unique 1.2%", or null while the rarity system is off. */
function oddsFor(state: GameState, s: Strings): string | null {
  const odds = rarityOdds(state.tuning, state.luck);
  if (odds.magic + odds.unique <= 0) return null;
  // Whole percents from ten up, one decimal under it — the rounding is a
  // fact about the odds, so it is decided here and the catalogue only
  // spells the number.
  const pct = (v: number): number => {
    const p = v * 100;
    return p >= 10 ? Math.round(p) : Math.round(p * 10) / 10;
  };
  return s.view.odds(pct(odds.magic), pct(odds.unique));
}

/**
 * Gate D wants the end screen to name the cause of death in one sentence. The
 * sentence's job is to say WHY it happened — the cost of a placement having
 * climbed past what the board could pay back is the whole arc of a run, and it
 * should be the last thing the player reads.
 *
 * Exported since 2026-08-20: the hall of fame's diary stores this sentence
 * FINISHED on each run's tick (`RunDetail.epitaph`), so a reopened row says
 * exactly what the screen said — one source of words, kept, not re-derived.
 *
 * A POOL per cause since 2026-08-26: the diary shows every run's last line in
 * a column, and two sentences were carrying all of them — a museum of runs
 * reading as one stamp. Every sentence still says WHY, with the same facts
 * (the placements, the final cost); only the framing varies. The pick is a
 * pure hash of the run's own facts, never a die roll, because the same ended
 * run must speak the same sentence every time it is re-rendered. The pools
 * themselves are in `text/`, one per language, the same size in each so the
 * hash lands on the same framing whichever language reads it.
 */
function epitaphIndex(state: GameState, poolSize: number): number {
  return (Math.imul(state.rootSeed ^ state.placements, 2654435761) >>> 0) % poolSize;
}

export function epitaphFor(state: GameState, s: Strings): string {
  const e = s.view.epitaph;
  if (state.death === 'spent') {
    // Unreachable in the shipped economy (`runLength: 0`), kept for the day
    // a clock returns — one sentence is honest cover for a door nobody
    // walks through.
    const unripe = Object.values(state.cells).filter((c) => c.kind === 'tile').length;
    return e.spent(state.placements, unripe);
  }
  if (state.death === 'walled') {
    return e.walled[epitaphIndex(state, e.walled.length)]!(state.placements);
  }
  const cost = costOf(state.placements, state.tuning);
  return e.broke[epitaphIndex(state, e.broke.length)]!(state.placements, cost);
}

/**
 * The native colour the FOG shows at a remembered hex — the tap's answer,
 * exported so `game.ts`'s fog lens (Marc, 2026-08-20: "on clicking a tile
 * in the fog that we know the biome it highlights the whole known biome")
 * names exactly the colour `toBoardView`'s memory pass painted there:
 * a held territory's unfurled field first, the terrain's own native
 * ground otherwise, nothing on walls and landmarks. Null is "the fog
 * knows no colour here", and the lens has nothing to hold.
 */
export function rememberedNativeAt(state: GameState, hex: HexKey): Colour | null {
  const { q, r } = parse(hex);
  const ground = terrainAt(state.rootSeed, q, r, state.tuning);
  if (ground.wall) return null;
  // A reborn landmark (2026-08-20) is a landmark, not ground: the tap
  // should describe the cache or site standing there, never turn the lens.
  if (state.rearmed[hex] !== undefined) return null;
  if (destinationAt(state.rootSeed, q, r, state.tuning) !== null) return null;
  for (const ck of state.claimed) {
    const centre = parse(ck);
    const held = destinationAt(state.rootSeed, centre.q, centre.r, state.tuning);
    if (
      held?.reward === 'territory' &&
      held.colour !== null &&
      distance({ q, r }, centre) <= state.tuning.territoryRadius
    ) {
      return held.colour;
    }
  }
  return ground.native;
}

/** A rare tile's power, in one line, or null for an ordinary one. */
export function rarityLine(rarity: Rarity | undefined, s: Strings): string | null {
  if (rarity === 'magic') return s.view.rarity.magic;
  if (rarity === 'unique') return s.view.rarity.unique;
  return null;
}

/**
 * The pocket you just tapped, priced and explained — size, worth, what each
 * button would pay, and any rare tiles inside it. The buttons already carry
 * the numbers; this says where those numbers come FROM, which is the part a
 * player has to learn once and then never again.
 */
export function pocketNote(state: GameState, at: HexKey, s: Strings): string {
  const t = state.tuning;
  const value = harvestValue(state, at);
  const home = homeOf(state);
  const worth = value.keys.reduce((n, k) => n + worthOf(state.cells, k, t, home, state.luck), 0);
  const multiplier = harvestMultiplier(state, value.keys);

  // Rare tiles inside the pocket, and what each kind does — a ripe rare
  // tile cannot be tapped for its own explanation, because tapping it
  // prices the pocket, so the pocket has to carry the explanation.
  const rares = value.keys.filter((k) => {
    const cell = state.cells[k];
    return cell?.kind === 'tile' && cell.rarity !== undefined;
  }).length;

  // Written for the SINGLE payout (2026-08-21). These lines predate it:
  // they read "POP for tiles" and "POP for pts" as if the two were a fork
  // to choose between, and the points button has been hidden since the
  // payout became one thing. A pop pays both, so the note prices both.
  const p = s.view.pocket;
  const lines = [
    p.head(value.count, worth),
    p.pays(value.tiles, scoreOf(value.points, t)),
    p.score(
      worth,
      value.sizeBonus,
      multiplier,
      value.questPays ? t.questBonus : null,
      placedRateOf(t),
      rareTermOf(value.rareWorth, t),
    ),
  ];
  // The pocket bar (2026-08-18): the priced pocket's count against the size
  // bonus's cap — "POCKET 14/20" — once it is within reach of mattering.
  // Always showing "1/20" is noise nobody reads twice; 2+ is the point a
  // pocket has started becoming a decision rather than a single tile.
  if (t.harvestSizeCap > 0 && value.count >= 2) lines.push(p.bar(value.count, t.harvestSizeCap));
  if (value.questPays)
    // Every pop scores under the single payout, so the bounty rides on any
    // of them — this rider named a button that no longer exists.
    lines.push(p.bounty(t.questBonus));
  if (rares > 0) lines.push(p.rares(rares));
  return lines.join('\n');
}

/**
 * What a harvest just did, with its arithmetic shown.
 *
 * The pop is the loudest thing that happens in a run and it used to leave
 * only a number moving in the stat row. Saying the sum out loud at the
 * moment it pays is the cheapest teaching in the game: two or three of
 * these and the formula stops being a thing to read in the manual.
 */
export function harvestNote(
  before: GameState,
  choice: HarvestChoice,
  value: ReturnType<typeof harvestValue>,
  s: Strings,
): string {
  const t = before.tuning;
  const h = s.view.harvest;
  const homeBefore = homeOf(before);
  const worth = value.keys.reduce(
    (n, k) => n + worthOf(before.cells, k, t, homeBefore, before.luck),
    0,
  );
  const multiplier = harvestMultiplier(before, value.keys);
  const head = h.head(value.count, worth);

  // The bounty answers EVERY pop while it is live (Marc, Day 2: "when we
  // pop, the ×3 applied or not — success or not — with points or +0"):
  // collected says so with its number, missed says so with the recipe.
  // Silent only while no ★ has set one — and on the two pops that score
  // nothing, TREASURE and BURN, which forfeit the bounty and leave it
  // standing rather than missing it. The multiplier is read from the
  // STANDING bounty, never from tuning: the quest carries its own bonus,
  // and it is the one the engine multiplies by.
  const bounty =
    before.quest === null || choice === 'treasure' || choice === 'burn'
      ? ''
      : value.questPays
        ? `\n${h.bountyCollected(before.quest.bonus)}`
        : `\n${h.bountyMissed(before.quest.bonus, before.quest.need, before.quest.radius)}`;

  if (choice === 'tiles') {
    // The true gain, matching `reduce.ts`'s own arithmetic exactly (flat
    // per pop plus a little per tile, then rounded and capped) — the old
    // line here printed the pocket's tile count, which is a different
    // number that only coincidentally looked plausible.
    const perPop =
      t.luckPerPop > 0 || t.luckPerTile !== 1
        ? t.luckPerPop + value.count * t.luckPerTile
        : value.count;
    const gained = Math.min(t.luckCap, Math.round(before.luck + perPop)) - before.luck;
    // The odds claim is only true when luck actually moves the draft's
    // rare-tile chances — in the shipped economy it does not, and saying
    // so anyway was the other half of this line lying.
    const oddsRose = t.luckMagicPerPop + t.luckUniquePerPop > 0;
    const luck = `\n${h.luck(gained, oddsRose)}`;
    // The depth grade, shown only when it actually paid something — the
    // arithmetic on screen has to sum to the number on screen.
    const rings = Math.floor(value.count * t.popTilesPerRing * (multiplier - 1));
    // Under the single payout the pop SCORES too — say the number here
    // rather than leaving it to the stat row (the bounty line below
    // needs a points figure to be about).
    // Through `scoreOf`, not a second copy of the arithmetic (2026-08-21):
    // this line used to spell `floor(points * pointsPerPop)` itself, and
    // would have gone on printing the zero the engine stopped banking the
    // day a scoring pop gained its floor of one.
    //
    // With its whole recipe since 2026-09-02. It printed the number alone,
    // beside a TILES line that named every term of its own much smaller sum —
    // so the pocket that mattered was the one nothing explained. The terms are
    // the engine's, in `harvestValue`'s own order: worth, the size bonus (and
    // where it stops), the distance multiplier, the bounty, and `pointsPerPop`
    // last, which is the scaling no surface in either body has ever named.
    const scored =
      t.singlePayout && t.pointsPerPop > 0
        ? `\n${h.scored(
            scoreOf(value.points, t),
            worth,
            countedOf(value.count, t),
            value.sizeBonus,
            cappedAt(value.count, t),
            multiplier,
            value.questPays ? (before.quest?.bonus ?? null) : null,
            Math.round(t.pointsPerPop * 100),
            placedRateOf(t),
            rareTermOf(value.rareWorth, t),
          )}`
        : '';
    return `${head}\n${h.tiles(value.tiles, t.tilesPerPop, t.worthPerExtraTile, rings > 0 ? rings : null)}${scored}${luck}${bounty}`;
  }

  return (
    `${head}\n${h.points(value.points, worth, countedOf(value.count, t), value.sizeBonus, cappedAt(value.count, t), multiplier, value.questPays ? t.questBonus : null, placedRateOf(t), rareTermOf(value.rareWorth, t))}` +
    bounty
  );
}

/** How many of a pocket's tiles the size bonus actually counts. */
const countedOf = (count: number, t: Tuning): number =>
  t.harvestSizeCap > 0 ? Math.min(count, t.harvestSizeCap) : count;

/**
 * The two flat terms of the score (Session 51), each `null` where it would
 * print a zero: `identityBonusRate` is a dial that is off in every economy
 * but the shipped one, and a pocket with no magic or unique in it has no
 * jackpot to name. The receipt's equation has to sum to the number on it —
 * the reason it carries its whole recipe at all (2026-09-02) — so a term
 * that changed the total and went unnamed would be the same lie in a new
 * place.
 */
const placedRateOf = (t: Tuning): number | null =>
  t.identityBonusRate > 0 ? t.identityBonusRate : null;
const rareTermOf = (
  rareWorth: number,
  t: Tuning,
): { readonly worth: number; readonly rate: number } | null =>
  t.rareBonusRate > 0 && rareWorth > 0 ? { worth: rareWorth, rate: t.rareBonusRate } : null;

/** The cap, but only where this pocket reached it — a limit nobody is near is
 *  a number in the way. */
const cappedAt = (count: number, t: Tuning): number | null =>
  t.harvestSizeCap > 0 && count > t.harvestSizeCap ? t.harvestSizeCap : null;

/**
 * One line of a set: a mark, and the sentence beside it.
 *
 * The four-grounds card (2026-08-27) proved the shape — a swatch in the
 * ground's own fill, the ground's own sentence beside it — and this is that
 * shape given a name so the manual and the other set-teaching cards can wear
 * it too. A row carries EITHER a `colour` (drawn as the swatch) or a `glyph`
 * from the game's own registry, or neither, in which case the mark column is
 * still reserved so the sentences line up.
 *
 * No row invents a symbol. `COLOUR_ICON` and `LANDMARK_ICON` are the whole
 * vocabulary (`theme/tokens.ts` states the rule), and a spend like REDRAW has
 * never had a mark in this game — so it gets none here rather than a new one.
 */
export type TipRow = {
  readonly text: string;
  /** A ground, drawn as its own swatch. */
  readonly colour?: Colour;
  /** An icon from the registry, for a row that is not a ground. */
  readonly icon?: IconName;
  /**
   * The ground's REAL baked tile, as a data URL (2026-08-27, Marc: "can we
   * have visuals with real tiles or examples in the how to play and hand and
   * such? so we have a visual with real in game assets").
   *
   * The same canvas `bakeSurface` hands the draft card — texture, gradient,
   * inset and all — so the square beside a colour's name stops being an
   * approximation of the tile and becomes the tile. Optional because a caller
   * without a canvas (a bare test, the gallery) has nothing to bake with, and
   * the flat `colour` swatch is still a correct, if plainer, mark.
   */
  readonly art?: string;
};

/** A card that teaches a set: the lead, and the rows under it. */
type SetLesson = {
  readonly text: string;
  /** The mark the card leads with. Beside the words rather than inside them:
   *  a mark has been an icon rather than a character since 2026-08-30, and a
   *  character was the only kind you could have prefixed into a string. */
  readonly icon: IconName;
  readonly rows: readonly TipRow[];
};

/**
 * The purse fold's first-contact card (Marc, 2026-08-20), built from the
 * LIVE tuning like every explanation in the game: only rows whose dials
 * are on get named, the rates are the run's own numbers, and the one fact
 * the fold's prices never say leads the close — luck is use-it-or-lose-it.
 *
 * ROWS since 2026-08-27 (Marc: "make sure the luck is for spending card is
 * explained with new lines, not a whole paragraph — similar to the 4 tiles
 * explained"). It was one sentence with the four ground names parenthesised
 * inside a semicolon list inside a clause: every spend the fold offers,
 * collapsed into prose you had to parse to use. The buttons are a LIST, so
 * the card is a list — one row per button, each quoting its own button face
 * and its own price, and the four steers wearing the ground colours the
 * buttons are bordered with.
 */
export function purseLesson(t: Tuning, theme: Theme, s: Strings): SetLesson {
  // Named as the BUTTONS are named (2026-08-27, Marc: "first luck drawer
  // expand we should explain all actions" — a second time, because the
  // first answer did not land). The card used to say "a fresh hand
  // (REROLL)" over a button reading REDRAW, and "a hand drawn toward a
  // colour you name (STEER)" over four buttons wearing the ground's own
  // names, with the word STEER nowhere on screen. It explained all the
  // actions in a vocabulary that matched none of them, which is the same
  // as explaining none. Every row below now quotes its own button face.
  const n = namesOf(theme, s.locale);
  const p = s.view.purse;
  const rows: TipRow[] = [
    ...(t.luckRerollCost > 0 ? [{ text: p.redraw(t.luckRerollCost) }] : []),
    // One row per BUTTON, in the order the fold draws them (`spendsFor`):
    // redraw, the four grounds, forge, tithe. The steers were a parenthesised
    // list inside somebody else's sentence; they are four buttons on screen,
    // so they are four lines here, each wearing its ground's own colour.
    ...(t.luckSteerCost > 0
      ? COLOURS.map((colour): TipRow => ({
          colour,
          text: p.steer(n[colour], t.luckSteerCost, t.colourBiasDraws),
        }))
      : []),
    ...(t.luckForgeCost > 0 ? [{ text: p.forge(t.luckForgeCost) }] : []),
    ...(t.titheRate > 0 ? [{ text: p.sacrifice(Math.round(t.titheRate * 100)) }] : []),
  ];
  // One paragraph, then the list — the use-it-or-lose-it fact is the REASON
  // to read the rows, so it goes above them rather than below (2026-08-27:
  // as its own trailing paragraph it sat between the intro and the list and
  // read like a footer that had slid up the card).
  // "You CAN lose it all" is Marc's own phrasing (2026-08-20: "explain all
  // and that you can lose it all too") and is pinned by name — the rows
  // print their prices, and this is the one thing a price cannot say.
  const lost = t.luckToRelics > 0 ? p.lostPartly(Math.round(t.luckToRelics * 100)) : p.lostAll;
  return { text: p.lead(lost), icon: 'luck', rows };
}

/**
 * One stat, explained in this run's own numbers — the tap-a-symbol
 * contract, kept by the stat row. Sticky, like every explanation you asked
 * for by hand: you are reading it deliberately, and a timer would be a
 * race against your own eyes.
 */
export function statNote(id: string, hud: HudView, t: Tuning, s: Strings): string {
  const st = s.view.stat;
  switch (id) {
    case 'tiles':
      return st.tiles;
    case 'points':
      return st.points;
    case 'luck':
      // Shares its opening clause with the LUCK teach card (`s.luckCore`,
      // read by the LUCK lesson itself) and appends the one thing that
      // clause never says: the live rate.
      return st.luck(t.luckToRelics > 0 ? Math.round(t.luckToRelics * 100) : null);
    case 'map':
      return st.reach(t.distanceStep);
    case 'cost': {
      const curve =
        t.costGrace > 0
          ? st.costCurveGrace(t.baseCost, t.costGrace, t.costRisesEvery)
          : st.costCurvePlain(t.costRisesEvery);
      return st.cost(hud.cost, curve);
    }
    case 'left':
      return st.left;
    default:
      return '';
  }
}

/**
 * "NAME: PERSONALITY", except where a direction has already named the ground
 * after its personality.
 *
 * Torchlit calls red ASH and blue TIDE, so a line built as name-dash-word read
 * "ASH — ASH." and "TIDE — TIDE." (2026-08-27). Invisible for three days
 * because each colour was taught alone; the moment all four stood on one card,
 * two of them stuttered. A direction is free to name its ground anything, so
 * this is a rule rather than a rewording.
 *
 * **Shared, and case-insensitive, since 2026-08-28.** The rule was written
 * inside `colourLesson` and fixed the CARD — and the manual's own THE COLOURS
 * rows, built from a separate table in `game.ts`, never got it: every shipped
 * skin printed "■ ASH — ash." and "● TIDE — tide." in the manual for a day.
 * That is the same class of miss as the legend's outline fix that never
 * reached the draft card, and it is precisely what the lesson registry exists
 * to stop — so the rule is one exported function now, and both doors call it.
 * Case-insensitive because the two tables disagreed about capitals: the card
 * passes 'ASH', the manual passes 'ash', and the ground is named 'ASH'.
 *
 * **The separator is the CATALOGUE's since 2026-08-30**, and it had to be. This
 * function hard-coded ` — ` for both languages, so the em-dash pass over
 * `text/` could not see it and `text.test.ts` — which walks the catalogues —
 * could not catch it: every colour card in the game read "MARKET — company."
 * in English and in French while both catalogues were clean. It is the same
 * D4 argument `powerHead` below makes about its colon, and the same place it
 * was already resolved. **A sentence assembled outside `text/` is a sentence
 * no language rule is holding.**
 */
export function groundHead(name: string, word: string, s: Strings): string {
  return name.toLowerCase() === word.toLowerCase() ? `${name}.` : s.view.groundHead(name, word);
}

/**
 * The same rule, for the one-clause POWER line (2026-08-29).
 *
 * `powerOf` prints " · crowds: +2 worth per MOSS neighbour…" — the word, then
 * the rule. A direction whose ground name already IS the power word has
 * nothing to put in front, and printing it anyway gives settlement
 * " · farm: +2 worth per FARM neighbour", which is the stutter `groundHead`
 * was written to stop, in the other door. So this returns the prefix or
 * nothing, and the catalogue interpolates it either way.
 *
 * Lowercase, because the clause is a fragment inside a sentence and the
 * catalogue has always printed these words lowercase. **The word only** — the
 * colon after it belongs to the catalogue, because in Québec French it is
 * preceded by a narrow no-break space and in English it is not, and that is a
 * fact about a language rather than about a power (D4, and `text.test.ts`
 * would have caught it).
 */
function powerHead(name: string, word: string): string {
  return name.toLowerCase() === word.toLowerCase() ? '' : word.toLowerCase();
}

/**
 * One colour's personality as a whole sentence, in the theme's own words
 * and the live tuning's numbers — the text the colour's first-contact
 * toast, the selected card's second tap and a tapped placed tile all
 * share, so the three doors cannot drift apart. Null while that colour's
 * power dial is zeroed: a personality that is off must not be taught.
 */
export function colourLesson(colour: Colour, t: Tuning, theme: Theme, s: Strings): string | null {
  const n = namesOf(theme, s.locale)[colour];
  const head = groundHead(n, powersOf(theme, s.locale)[colour], s);
  const c = s.view.colour;
  switch (colour) {
    case 'green':
      return t.greenCrowdBonus > 0 ? c.green(head, n, t.greenCrowdBonus) : null;
    case 'yellow':
      return t.yellowCompanyBonus > 0
        ? c.yellow(head, t.yellowCompanyBonus, t.yellowCompanyAll)
        : null;
    case 'red':
      return t.redAshMatches ? c.red(head, t.redAshWalls) : null;
    case 'blue':
      return t.blueTideEvery > 0 ? c.blue(head, t.blueTideEvery) : null;
  }
}

/**
 * The colour's power, in one clause, with its numbers read from the live
 * tuning — same no-staleness contract as the manual. Empty string when the
 * personalities are off (the bounded game), so the tip stays honest there.
 *
 * **It takes a THEME as of 2026-08-29, and the old comment beside its one pin
 * said why it should not:** *"`powerOf` takes no theme — it names a dial, not
 * a terrain."* True of the dial and false of the sentence. Two of the four
 * clauses named a ground — "beside red", "per green neighbour" — in words no
 * direction shows anywhere, and the leading word was `colourWord`, which was
 * one shared set containing torchlit's own ASH and TIDE. So the tip under a
 * settlement card read `· ash: … beside red …` while the card above it said
 * QUARRY.
 *
 * Both halves come from the direction now: the ground's name where the clause
 * points at a ground, and the power word where the direction has one to add.
 */
export function powerOf(colour: Colour, t: Tuning, theme: Theme, s: Strings): string {
  const p = s.view.power;
  const n = namesOf(theme, s.locale)[colour];
  const head = powerHead(n, powersOf(theme, s.locale)[colour]);
  switch (colour) {
    case 'green':
      return t.greenCrowdBonus > 0 ? p.green(head, n, t.greenCrowdBonus) : '';
    case 'yellow':
      return t.yellowCompanyBonus > 0
        ? p.yellow(head, t.yellowCompanyBonus, t.yellowCompanyAll)
        : '';
    case 'red':
      return t.redAshMatches ? p.red(head, n, t.redAshWalls) : '';
    case 'blue':
      return t.blueTideEvery > 0 ? p.blue(head, t.blueTideEvery) : '';
  }
}

/**
 * What `describeHexOf` needs beyond the state itself — the session facts
 * `#describe` used to read off `Game`'s own instance fields. Not
 * `RenderContext`: that bundle is board-render data derivable from `state`
 * alone, and every field here is something only the SESSION knows (the
 * theme in play, the language, whether this run is a detour, how many
 * shrines it has claimed this run, and the two shrine-ledger/crossing hooks
 * the shell owns) — `state` rides along inside it so the whole call is
 * `(ctx, hex)`.
 */
type DescribeContext = {
  readonly state: GameState;
  readonly theme: Theme;
  readonly strings: Strings;
  readonly detour: boolean;
  /** Shrines claimed THIS run, so the tap names the right unlock. */
  readonly shrinesClaimed: number;
  /** What the next shrine will unlock, by how many this run has claimed. */
  readonly unlockLabel?: (nth: number) => string | null;
  /** Ground this world remembers from earlier runs — keys only. */
  readonly memory?: readonly HexKey[];
  /** The crossing's dowry, present exactly when the crossing is offered. */
  readonly crossingDowry?: () => number;
};

/**
 * What that hex is, in one sentence, in the direction's own words and this
 * run's own numbers. Covers the things a player can tap and not understand:
 * the five destination glyphs (reached or still glowing in the dark), wall,
 * stone, native ground, a tile not yet ripe, and ground this world only
 * remembers.
 */
export function describeHexOf(ctx: DescribeContext, hex: HexKey): string {
  const { state, strings: s } = ctx;
  const t = state.tuning;
  const names = namesOf(ctx.theme, s.locale);
  const name = (c: Colour): string => names[c];
  const cell = state.cells[hex];
  const x = s.view.hex;

  const destination = (reward: LandmarkReward, colour: Colour | null, claimed: boolean): string => {
    if (reward === 'cache') {
      return claimed ? x.cacheClaimed : x.cache(cachePaysAt(hex, t, homeOf(state)));
    }
    if (reward === 'site') {
      return claimed ? x.siteClaimed : x.site(t.sitePays, t.questBonus);
    }
    if (reward === 'shrine') {
      // A detour has no ledger to narrate (fresh-eyes finding 5): say what
      // shrines ARE, not what the home world would have unlocked.
      if (ctx.detour) return claimed ? x.shrineDetourClaimed : x.shrineDetour;
      const next = ctx.unlockLabel?.(ctx.shrinesClaimed) ?? null;
      if (claimed) return x.shrineClaimed;
      // Fully awake with the crossing available: the shrine's remaining
      // gift is the way onward, and its tap explanation says so.
      if (next === null && ctx.crossingDowry !== undefined) {
        return x.shrineCrossing(ctx.crossingDowry());
      }
      /*
       * Fully awake with no crossing on offer (2026-09-01).
       *
       * `x.shrine(null)` reads "claim it to unlock A SYSTEM for this world,
       * permanently" — which is true when the caller has no ledger to consult
       * and a LIE on a world whose ledger is finished. Marc, asking for the
       * board to answer better: *"is it a good shrine or one i dont need
       * now?"* This is the second answer, and it is the whole reason the
       * question is worth asking of a shrine at all.
       *
       * The fork is on `unlockLabel` being GIVEN, not on what it returned: a
       * caller that cannot count a world's shrines (a detour is already
       * handled above; a test rig is the other) must keep the vague sentence
       * rather than be told a world it knows nothing about is finished.
       */
      if (next === null && ctx.unlockLabel !== undefined) return x.shrineAwake;
      return x.shrine(next);
    }
    if (reward === 'find') {
      // Mysterious but honest: what a find gives is the one thing the
      // board never says out loud.
      return claimed ? x.findClaimed : x.find;
    }
    const owns = colour === null ? x.someColour : name(colour);
    if (claimed) return x.territoryClaimed(t.territoryRadius, owns);
    // The tiles it would pay, from the function that will pay them. Zero in a
    // world, where "for good" is true and the sentence is unchanged; raised on
    // a daily and a shared board, where the field lasts one run unless the
    // board is continued as a world (2026-09-09).
    const pays = territoryPaysAt(hex, t, homeOf(state));
    return pays > 0
      ? x.territoryPays(t.territoryRadius, owns, pays)
      : x.territory(t.territoryRadius, owns);
  };

  if (cell === undefined) {
    // Not on the board: a destination glowing through the dark, a find's
    // shimmer, or ground this world remembers from an earlier run.
    const { q, r } = parse(hex);
    const remembered = ctx.memory?.includes(hex) ?? false;
    // A reborn landmark (2026-08-20): this run rolled a spent shrine or
    // find into a fresh cache or site, and the tap answers for what
    // walking there PAYS — the world's memory of what used to stand
    // here is the diary's business, not the map's.
    const reborn = state.rearmed[hex];
    if (reborn !== undefined) return x.chainOut(destination(reborn, null, false));
    const dest = destinationAt(state.rootSeed, q, r, t);
    if (dest !== null) {
      // Named only where the world has actually SHOWN it (Marc,
      // 2026-08-19: memory shows what it saw): ground this world
      // remembers, or a beacon inside the live horizon — via the ONE
      // predicate `beaconsFor` draws by, because the simplify pass caught
      // this copy already drifted (it still measured from the origin, so
      // a camp run's tap answers disagreed with its own drawn beacons).
      if (remembered || withinBeaconHorizon(state, hex)) {
        const claimed = state.claimed.includes(hex);
        return claimed
          ? destination(dest.reward, dest.colour, true)
          : x.chainOut(destination(dest.reward, dest.colour, false));
      }
    }
    // Only a hex the shimmer is actually drawing gets this answer — with
    // no sense, or out of range, a hidden find stays exactly that, and
    // tap-scanning remembered ground must not become a divining rod.
    if (
      t.findSense > 0 &&
      findAt(state.rootSeed, q, r, t) !== null &&
      // Not one the board is already drawing (2026-08-21): the render
      // skips a find that has been revealed, so saying "something
      // shimmers here" over a hex whose landmark is on screen — possibly
      // a find already claimed — describes a light nobody can see.
      state.cells[hex] === undefined
    ) {
      const near = Object.keys(state.cells).some(
        (k) => distance(parse(k), { q, r }) <= t.findSense,
      );
      if (near) return x.shimmers;
    }
    return remembered ? x.remembered : x.dark;
  }

  switch (cell.kind) {
    case 'landmark':
      return destination(cell.reward, cell.colour ?? null, cell.claimed);
    case 'wall': {
      // WALLBREAKER rewrites this sentence while it is worn — a rule the
      // perk breaks must not go on being stated as a rule.
      const standing = t.wallBuildCostMult > 0 ? x.wallBuildable(t.wallBuildCostMult) : x.wall;
      return t.redAshWalls ? x.wallAsh(standing, name('red')) : x.wallPlain(standing);
    }
    case 'stone':
      return x.stone(name('red'));
    case 'tile': {
      const worth = worthOf(state.cells, hex, t, homeOf(state), state.luck);
      const power = rarityLine(cell.rarity, s);
      // The colour's personality rides along (2026-08-19, "the colors are
      // not explained") — a tapped tile is the cheapest place to learn
      // what its colour wants, right where it is wanting it.
      const personality = colourLesson(cell.colour, t, ctx.theme, s);
      return (
        x.tile(name(cell.colour), worth) +
        (personality === null ? '' : `\n${personality}`) +
        (power === null ? '' : `\n${power}`)
      );
    }
    case 'empty':
      return cell.native === undefined ? x.open : x.native(name(cell.native));
  }
}

/**
 * THE DEBUG LINE — the only console this project has (2026-09-02).
 *
 * Testing happens on the deployed site, on a phone, in portrait: there is no
 * dev server, no console worth opening and no way to read a number that is not
 * on the screen. `debug.overlay` has been a declared flag since the core was
 * lifted, marked `wired: true`, and **nothing in this body has ever read it**
 * — while `?ff=`, its only door, was never parsed either. Two halves of one
 * miss, and the exact shape `features.ts`'s own header warns about.
 *
 * Ashwake 1 carried this as `Game#debugLine`. The fields are its, unchanged:
 * the seed a bug is reproduced from, the board's size, the four run numbers,
 * both RNG cursors (which is how a desync is spotted at all), the death cause,
 * the relics, the worn perk, the find sense and the claim count.
 *
 * **Not `text/`, and that is not a D4 exception.** D4 governs every sentence a
 * PLAYER reads. This is a diagnostic: ids and integers, in no language,
 * addressed to whoever is holding the phone next to a bug report. Translating
 * `rng 41/12` would make it harder to read in both languages at once.
 */
export function debugLine(state: GameState, worn: string | null): string {
  let claims = 0;
  for (const cell of Object.values(state.cells)) {
    if (cell.kind === 'landmark' && cell.claimed) claims++;
  }
  return (
    `seed ${state.rootSeed} · cells ${Object.keys(state.cells).length} · ` +
    `p${state.placements} t${state.tiles} pts${state.points} luck${state.luck} · ` +
    `rng ${state.rng.tiles.cursor}/${state.rng.loot.cursor}` +
    (state.death === null ? '' : ` · ${state.death}`) +
    ` · relics${state.relics} · perk:${worn ?? '-'} · sense${state.tuning.findSense} · ` +
    `claims${claims}`
  );
}
