import type { GameState } from '@engine/state';
import type { HexKey } from '@engine/hex';
import type { Tuning } from '@content/tuning';
import type { Session } from './store';
import type { RunMemory } from './storage';
import type { OnceId } from './onceARun';

/**
 * ONE WAY INTO A RUN (2026-09-02).
 *
 * There are five doors — BEGIN AT CAMP and NEW RUN (`startRun`), the daily,
 * a world switch, and the crossing — and every one of them wrote the same
 * eight or nine pieces of state, in its own order, with its own subset. `App`
 * has known this was the hazard since the doors were built; `forgetEnding`'s
 * docblock says it in as many words:
 *
 *   > *"One function called by every door ... everything a run starts from has
 *   > to be put down in one order, or two doors disagree about what a run
 *   > starts from."*
 *
 * `forgetEnding` did that for the three things a finished run leaves behind.
 * Everything ELSE stayed spread across five callbacks, and by 2026-09-02 the
 * five had drifted into three live bugs:
 *
 *   - **`takeCrossing` never reset `saidOnce`.** A UNIQUE greeted on the world
 *     you paid to leave stayed silent for the whole of the world you paid for.
 *   - **`takeCrossing` never set `startedFrom`.** NEW GROUND on a freshly
 *     minted world was measured against the reach of the ABANDONED one, so the
 *     first thirty rings of a new world announced nothing, and the end screen's
 *     list of what the run woke compared against a world that no longer exists.
 *   - **`takeCrossing` never framed.** Every other door recentres the camera on
 *     the tile the run starts from; the crossing left it wherever the last
 *     world's ending had put it.
 *   - **`startRun` never called `beginRun`.** So `fromTerritories` — *"a perk
 *     nobody can see is indistinguishable from no perk at all"* — was said on
 *     BEGIN, on a world switch, on the daily and on a crossing, and never on
 *     the button a player presses most.
 *
 * Four misses, all of the same shape: not a wrong step, a MISSING one, in a
 * list nothing enumerates.
 *
 * ## Why this is an order and not a hook
 *
 * Every piece here is a setter the shell already owns, so there is nothing to
 * decide and nothing to make pure — `shell/signpost.ts`'s split does not apply,
 * because there is no decision in it. What there IS, and what was worth
 * lifting out of a 2,900-line file, is the SEQUENCE: which things must be put
 * down before the session is restarted, and which must be said after.
 *
 * The order matters in three places and each is a bug that has happened:
 *
 * 1. **The place is set before the session restarts.** The keeper is made from
 *    the place, and the keeper is the only thing that writes — a daily's board
 *    existing for one render while the keeper still points at a world is how a
 *    daily's state lands in a world's key (`useDevice`'s own note on `daily`).
 * 2. **The world is let go before the restart, not after.** The held copy is
 *    merged into by the first action of the run; letting go afterwards means
 *    the run's first placement merges onto the world it just left.
 * 3. **`begin` is said last.** It reads the session's state to say what the
 *    world paid, and before `restart` that state is the previous run's.
 */

/** What one door differs from another by. Everything else is the same. */
export type Door = {
  /** Where this run is played: a dated daily, or `null` for the world slot. */
  readonly daily: string | null;
  /** A board handed back to be resumed, or `null` for a fresh one. */
  readonly resume: GameState | null;
  readonly seed: number;
  /** The world's revealed ground, or `undefined` where there is no world. */
  readonly memory: RunMemory | undefined;
  readonly economy: Tuning;
  /** BEGIN AT CAMP. Only a fresh run may camp. */
  readonly wakeAt: HexKey | null;
  /**
   * What this run measures its gains against, or `null` where there is nothing
   * to measure against — a daily, which has no world.
   *
   * `null` is a MODE and not an absence, exactly as `reachAtStart` is: it says
   * "this run has no history to be new ground against", which is different
   * from "its history is empty".
   */
  readonly from: StartedFrom | null;
  /**
   * True only for the crossing, which mints the world it is entering and hands
   * it to the keeper itself. Every other door is going somewhere the held copy
   * is not, and holding on would merge this run's ground into the last world.
   */
  readonly keepsWorld: boolean;
  /**
   * Whether this run is on a seed that is not this device's world (2026-09-09).
   *
   * Stated by every door rather than inherited, because inheriting is what was
   * wrong: `App` builds its session once and the flag was set from how the
   * PAGE was opened, so a `?seed=` visitor who kept the board as one of their
   * worlds kept the flag too — see `Session.detour` for the fourteen things
   * that then answered for the wrong run.
   *
   * Every door here is `false`, and that is not a redundancy worth collapsing:
   * a detour can only be ENTERED at boot, from the URL, and the compiler asking
   * each door to say so is the check that a sixth door cannot forget.
   */
  readonly detour: boolean;
  /** Pressed from inside a panel, so the panels have to close behind it. */
  readonly fromMenus: boolean;
};

/** What a run measures its gains against. */
export type StartedFrom = {
  readonly reach: number;
  readonly perks: readonly string[];
  readonly unlocks: readonly string[];
};

/** The shell's own hands. Passed rather than imported, so this module decides
 *  the order and nothing else. */
export type Wiring = {
  readonly session: Session;
  readonly setDaily: (date: string | null) => void;
  /** Put down the last ending — see `App`'s `forgetEnding`. */
  readonly forgetEnding: () => void;
  /** Let go of the held world memory. */
  readonly forgetWorld: () => void;
  /** What this run has already said once, cleared per run. */
  readonly saidOnce: { current: Set<OnceId> };
  /** What this run started from, or null on a daily. */
  readonly startedFrom: { current: StartedFrom | null };
  /** The state a finished run was banked from, cleared so the next can bank. */
  readonly banked: { current: GameState | null };
  readonly setLens: (colour: null) => void;
  /**
   * Put down whatever the strip over the board is still saying (2026-09-09).
   *
   * `note` is per-RUN — a claim, a pop's lead line, NEW GROUND — and nothing
   * cleared it on the way through a door. `forgetEnding` clears eleven pieces
   * of ending state and not this one, because this one belongs to the BOARD.
   * So the first frame of a new run carried the last run's last sentence over
   * it, on any device where `begin()` happens to say nothing: no territory
   * bonus and every lesson already taught, which is every veteran device.
   */
  readonly forgetNote: () => void;
  /** The ending is gone, so the way back to its map is too. */
  readonly setWalking: (walking: boolean) => void;
  readonly leaveMenus: () => void;
  /** Recentre on the tile this run begins at. */
  readonly frameTheRun: () => void;
  /** Step onto the board, and say what the world is paying for it. */
  readonly begin: () => void;
  /**
   * Session C's gate: they went again (Stage 6, 2026-09-08).
   *
   * Here rather than at the five call sites because this is the ONE place
   * every door into a run passes through — including the first one, which is
   * why the rule that a first run does not count lives in
   * `shell/playtest#startedAnother` rather than in a condition here.
   * A no-op unless `?playtest=1`.
   */
  readonly wentAgain: () => void;
};

/**
 * Put the last run down and start this one.
 *
 * Read top to bottom: everything before `restart` is what has to be true
 * BEFORE a board exists, and everything after is what can only be said once
 * one does.
 */
export function enterRun(w: Wiring, door: Door): void {
  // 1. WHERE. The keeper is made from the place; nothing may write before it
  //    points at the right one.
  w.setDaily(door.daily);

  // 2. WHAT THE LAST RUN LEFT. The ending, the world, the once-a-run sentences,
  //    and the guard that says a run has already been banked.
  w.forgetEnding();
  if (!door.keepsWorld) w.forgetWorld();
  w.saidOnce.current = new Set();
  w.startedFrom.current = door.from;
  w.banked.current = null;

  // 3. THE BOARD.
  w.session.restart(door.seed, door.resume, door.memory, door.economy, door.wakeAt, door.detour);

  // 4. WHAT THE SCREEN CARRIED OVER AND MUST NOT.
  w.setLens(null);
  w.forgetNote();
  w.setWalking(false);
  if (door.fromMenus) w.leaveMenus();

  // 5. AND THE ARRIVAL, which reads the board that now exists.
  w.begin();
  w.frameTheRun();

  // 6. AND, IF ANYBODY IS WATCHING, that they chose to do this at all.
  w.wentAgain();
}
