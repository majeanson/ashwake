import type { GameState } from '@engine/state';
import { writeDailyRun, writeRun, writeWorld, type Slot } from './storage';
import type { WorldMemory } from '@meta/world';

/**
 * What writes to disk on a session's behalf, and refuses to once that session
 * is over (Stage 4, 2026-08-29).
 *
 * **This is the file that makes the relic farm structurally impossible**, and
 * it is worth stating the bug it exists for. Ashwake 1, 2026-08-19: a crossing
 * moves a run from one world into another. If the OLD session is still alive
 * while the new one starts — a pending save, a queued frame, an app resumed
 * from the background mid-transition — it writes its own state over the world
 * that has just been crossed into, and the relics that were spent to cross are
 * back. Do that in a loop and the economy is over.
 *
 * The fix is not care. Care is what fails at 2am on a phone that was
 * backgrounded during a fade. The fix is that a keeper has a LIFETIME:
 *
 * - **`alive`** — it belongs to the current session. A keeper whose session has
 *   ended writes nothing, ever again, no matter who still holds a reference to
 *   it or what timer fires.
 * - **`dropped`** — the session was ended deliberately AND its world handed on.
 *   A dropped keeper is not merely inactive; it has been told that what it
 *   remembers is no longer true.
 *
 * Every write goes through here. A component that reached for `writeRun`
 * directly would be a component that can write after the world moved on, which
 * is the entire bug.
 */

export type Keeper = {
  /** Remember the run in progress. Ignored once the keeper is not alive. */
  readonly saveRun: (state: GameState) => void;
  /** Remember what this world knows. Ignored once the keeper is not alive. */
  readonly saveWorld: (world: WorldMemory) => void;
  /** Write anything pending right now — before a scene changes, or on hide. */
  readonly flush: () => void;
  /**
   * End it. Nothing after this writes, and nothing that was pending is
   * written either: a queued save from a session that has been dropped is
   * precisely the write that resurrects a spent world.
   */
  readonly drop: () => void;
  /**
   * Whether this keeper still writes.
   *
   * **No production consumer, and that is the right answer** (checked
   * 2026-09-02). Nothing in the shell asks — nothing should: a caller that
   * branched on it would be a second place deciding whether a session is over,
   * and `drop` exists precisely so there is one.
   *
   * What it is for is the only thing that CAN check the promise this file is
   * built on — that switching places drops the old keeper before the new one
   * exists, so two keepers never write to one world. `keeper.test.ts` and
   * `useDevice.test.ts` are its readers, and a hand-over is invisible from the
   * outside without it.
   */
  readonly alive: () => boolean;
};

/**
 * How long a run may sit unwritten.
 *
 * Every placement writing synchronously would put a JSON encode of the whole
 * board in the middle of a tap. A short debounce keeps taps cheap; `flush` on
 * hide is what makes it safe, because a phone can be closed between two taps
 * and never come back.
 */
const SETTLE_MS = 400;

/**
 * Where a run is being played: one of the three worlds, or a dated daily.
 *
 * The daily is not a fourth world and modelling it as one would be the bug:
 * it has no world memory to fold ground into, its board is keyed by DATE
 * rather than by slot, and it must never touch the world the player was in.
 * A keeper is what enforces that, because a keeper is the only thing that
 * writes.
 */
export type Place = Slot | { readonly daily: string };

export const isDaily = (place: Place): place is { readonly daily: string } =>
  typeof place !== 'number';

export function keeperFor(place: Place): Keeper {
  let alive = true;
  let pendingRun: GameState | null = null;
  let pendingWorld: WorldMemory | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const flush = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    // The guard is INSIDE the flush, not only at the call sites: a timer that
    // was already scheduled when the keeper was dropped still fires.
    if (!alive) {
      pendingRun = null;
      pendingWorld = null;
      return;
    }
    if (pendingRun !== null) {
      if (isDaily(place)) writeDailyRun(place.daily, pendingRun);
      else writeRun(place, pendingRun);
      pendingRun = null;
    }
    if (pendingWorld !== null) {
      // A daily has no world memory: every phone plays the same board and
      // nothing about it is remembered as ground walked. Dropping the write
      // here rather than at the call site is the point — the keeper is the
      // only thing that writes, so it is the only place the rule can hold.
      if (!isDaily(place)) writeWorld(place, pendingWorld);
      pendingWorld = null;
    }
  };

  const later = (): void => {
    if (!alive || timer !== null) return;
    timer = setTimeout(flush, SETTLE_MS);
  };

  return {
    saveRun(state) {
      if (!alive) return;
      pendingRun = state;
      later();
    },
    saveWorld(world) {
      if (!alive || isDaily(place)) return;
      pendingWorld = world;
      later();
    },
    flush,
    drop() {
      alive = false;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pendingRun = null;
      pendingWorld = null;
    },
    alive: () => alive,
  };
}
