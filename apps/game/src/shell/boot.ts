import { dailySeed } from '@meta/daily';
import { parseRoute } from '@meta/route';
import type { GameState } from '@engine/state';
import type { HexKey } from '@engine/hex';
import type { WorldMemory } from '@meta/world';
import { campFor } from './store';
import { dial } from './look';
import type { Slot } from './storage';

/**
 * WHICH BOARD THIS PAGE IS OPENING ON (`PASS.md` P2.1).
 *
 * `MODES.md` calls this the **boot** door, and it is the odd one out in that
 * table twice over: it is the only door that does not go through `enterRun`,
 * and **it is the only place in the game where `detour` can become true.** A
 * detour can only be ENTERED at boot, from the URL — every other door states
 * `detour: false`, and that invariant is what three sessions of mode bugs
 * bought.
 *
 * So this is the door with the most flags, in the file whose own opening line
 * says every one of those bugs was a door forgetting one. It had no test,
 * because there was no way to call it: it read `location`, three storage
 * functions and a slot, and returned a whole live `Session`.
 *
 * **What leaves is the LADDER; what stays is the session.** `createSession`'s
 * arguments include four callbacks that close over the session being built —
 * `crossingCarries` reads `made.get().state` — and no amount of extraction
 * makes those pure. What was tangled up with them is a decision that is
 * nothing but its inputs: given a query string, a slot, and what is on the
 * disk, WHICH seed, WHICH saved run, and IS this a detour.
 */

/** The disk, injected — so a test can describe a device instead of writing one.
 *  `App` passes `shell/storage`'s four readers unchanged. */
export type BootDisk = {
  readonly dailyRun: (date: string) => GameState | null;
  readonly run: (slot: Slot) => GameState | null;
  readonly worldSeed: (slot: Slot) => number;
  readonly world: (slot: Slot) => WorldMemory | null;
};

type BootPlan = {
  /** The date this page is opening in, or null for the world slot. */
  readonly daily: string | null;
  readonly seed: number;
  /** The board handed back to be resumed, or null for a fresh one. */
  readonly resume: GameState | null;
  /** Whether this run is on a seed that is not this device's world. */
  readonly detour: boolean;
  /** BEGIN AT CAMP, from `?camp=1`. */
  readonly wakeAt: HexKey | null;
  /** `?place=n` — how many placements to walk before handing the board over. */
  readonly place: number;
  /** `?end=1` — walk a whole run, so the end screen can be looked at. */
  readonly toEnd: boolean;
};

/**
 * The boot ladder.
 *
 * Order of who outranks whom: **the URL, then the run this device left
 * unfinished, then home.** The URL first because a link is an explicit request
 * and the only way anyone plays somebody else's board. The saved run second,
 * and it is the reason this is a ladder rather than `asked ?? mine`: a run is
 * saved under the seed it was PLAYED on, and reloading a shared link has to
 * pick that same run back up rather than deal a fresh board on the same seed.
 */
export function bootPlan(search: string, slot: Slot, disk: BootDisk): BootPlan {
  const params = new URLSearchParams(search);
  const route = parseRoute(search);

  /*
   * A shot query means a fresh board every time. Otherwise a run this device
   * left behind is resumed as the very object the reducer left, not
   * re-simulated — a replayed run is a run that can disagree with the one that
   * was played.
   */
  const place = Math.max(0, Math.trunc(dial(params, 'place', 0)));
  const toEnd = dial(params, 'end', 0) > 0;
  const scripted = place > 0 || toEnd;

  /*
   * A shared DAILY, which is one of the two kinds of link SHARE hands out.
   *
   * The seed is the DATE's, so the link opens the board it is talking about,
   * and the kept run is that date's — `readDailyRun` refuses to hand one back
   * under any other date. **It is not a detour**: a detour is a foreign world
   * seed that must not touch this device's world memory, and a daily is
   * already walled off by being a `Place` the keeper knows.
   */
  const opening = route.daily;

  /*
   * `?seed=` is the other kind, and the ordinary way a stranger meets the
   * game. The run is real and it is scored; what it must not do is touch the
   * device's OWN world — see the seed guard in `settle`, and `detour` below,
   * which is what stops a shrine claiming an unlock for a world this run was
   * never played on.
   */
  /*
   * THE SEED COMES FROM `parseRoute`, and did not until 2026-09-10.
   *
   * This line read `Number(params.get('seed') ?? '') || null` — a second
   * implementation of a parse the core already owns, and a worse one. Found by
   * `pnpm sweep`: `Route.seed` was ruled "read only by tests", the ruling
   * stopped matching once the ladder moved into this file, and the gate's
   * question was why a validated parser being called on the line above had no
   * reader.
   *
   * Two things the local version got wrong, and `route.test.ts` had already
   * decided both:
   *
   *   - **A fractional seed was passed through.** `?seed=7.9` opened a board on
   *     7.9, and that test's own words are the reason it must not: *"a
   *     hand-typed 7.9 must open the same world as 7 rather than something no
   *     other phone can reproduce."*
   *   - **Zero was treated as absent**, because `|| null` cannot tell 0 from
   *     nothing — the mistake `dial` exists to avoid, one import away. A bare
   *     `?seed=` is seed 0, pinned as SHIPPED rather than designed, and it
   *     opens board 0 as a detour now instead of quietly going home. Nothing
   *     generates that link (`shareOf` always writes a real number), so this is
   *     a hand-typed URL behaving the way the core says it does.
   */
  const asked = opening !== null ? dailySeed(opening) : route.seed;
  const saved = scripted ? null : opening !== null ? disk.dailyRun(opening) : disk.run(slot);

  /*
   * The device's own world, minted by `worldSeedFor` if this slot has never
   * had one. It used to be `readWorld(slot)?.worldSeed ?? null` falling
   * through to the literal `1` — so every phone that had never played opened
   * on the same board, and the world it later settled adopted whatever seed
   * the run happened to carry. The world is the place, and the run is played
   * on it.
   */
  const mine = opening !== null ? null : disk.worldSeed(slot);

  const seed = asked ?? saved?.rootSeed ?? mine ?? 1;
  /* A run whose seed does not match what the page is opening is not resumable
     here at all — that is a different world. */
  const resume = saved !== null && saved.rootSeed === seed ? saved : null;
  const detour = opening === null && mine !== null && seed !== mine;

  /*
   * `?camp=1` — BEGIN AT CAMP on the URL. Every guard `campFor` keeps, plus
   * two this level knows: a RESUMED run carries its own wake hex, and a detour
   * or a daily has no world to have a farthest territory in.
   */
  const wakeAt =
    route.camp && resume === null && !detour && opening === null ? campFor(disk.world(slot)) : null;

  return { daily: opening, seed, resume, detour, wakeAt, place, toEnd };
}
