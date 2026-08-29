import { useSyncExternalStore } from 'react';
import { TUNING, type Colour, type Tuning } from '@content/tuning';
import { newRun, reduce } from '@engine/reduce';
import { harvestValue } from '@engine/rules';
import type { Action, GameState } from '@engine/state';
import type { HexKey } from '@engine/hex';
import type { BoardView, CellView } from '@render/Renderer';
import type { Strings } from '@text/Strings';
import type { Theme } from '@theme/tokens';
import { renderContext, toBoardView, toHudView, type HudView } from '@view/view';

/**
 * One run, held outside React (Stage 2, 2026-08-28).
 *
 * The engine is a pure reducer and the props layer is pure selectors, so the
 * store is nothing but "the current state, and who wants to know when it
 * changes". React reads it through `useSyncExternalStore`; the board reads
 * the same snapshot; nothing re-derives a view twice per frame because the
 * snapshot is built once per dispatch and handed to everyone.
 *
 * What is NOT here yet: persistence, the keeper's alive/dropped guards, world
 * memory, the daily, the crossing — all Stage 4. This is the smallest thing
 * that lets a tap on a hex reach `reduce` and come back as a drawn tile.
 */

export type Snapshot = {
  readonly state: GameState;
  /** The pocket being priced, or null for the default. */
  readonly harvestAt: HexKey | null;
  readonly board: BoardView;
  readonly hud: HudView;
  /**
   * The last pop, for the board's leap: which cells left, and a counter so a
   * second pop of the same cells still reads as a new event.
   */
  readonly popped: Popped | null;
};

/** Function-typed on purpose: `useSyncExternalStore` takes `get` and
 *  `subscribe` apart from the object, so none of these may depend on `this`. */
export type Popped = {
  /** The cells AS THEY WERE, read before the reducer turned them to stone —
   *  the leap is drawn from what was there, in its own colour. */
  readonly cells: readonly CellView[];
  /** The pocket the player actually tapped, so the cascade ripples outward
   *  from the point of contact rather than from object order. */
  readonly at: HexKey | null;
  /** A counter, so a second pop of the same cells still reads as a new event. */
  readonly id: number;
};

export type Session = {
  readonly theme: Theme;
  readonly strings: Strings;
  readonly get: () => Snapshot;
  readonly subscribe: (listener: () => void) => () => void;
  readonly dispatch: (action: Action) => void;
  /** Price a pocket: a tap on a ripe tile. Null clears it. */
  readonly target: (hex: HexKey | null) => void;
  /**
   * The colour lens: one colour held up, every other tile stepped back.
   *
   * The core has taken a `spotlight` since the rules were lifted — it is what
   * `dimmed` and `lensed` are computed from, on the board AND in remembered
   * ground — and the shell passed `null` for it, which made a whole feature
   * dead code that every test still covered. Held here beside `harvestAt` for
   * the same reason: it is a way of LOOKING at a run, not part of one, so it
   * never reaches the reducer and never reaches the disk.
   */
  readonly spotlight: (colour: Colour | null) => void;
  /** Start again on a seed. */
  /**
   * Step into a run: a fresh one at `seed`, or `from` picked up exactly as the
   * reducer left it.
   *
   * One door rather than two because the crossing is the same crossing — the
   * pop, the priced pocket and every listener must be told once, in one order,
   * whichever kind of run is being entered. Resuming re-uses the very object
   * that was saved rather than replaying it: a replayed run is a run that can
   * disagree with the one that was played.
   */
  readonly restart: (seed: number, from?: GameState | null) => void;
};

export function createSession(opts: {
  readonly seed: number;
  readonly theme: Theme;
  readonly strings: Strings;
  readonly tuning?: Tuning;
  /** A run read back off the device. Resuming is the same object the reducer
   *  left behind, so a resumed run is not a re-simulated one. */
  readonly resume?: GameState | null;
}): Session {
  const tuning = opts.tuning ?? TUNING;
  let state = opts.resume ?? newRun(opts.seed, tuning);
  let harvestAt: HexKey | null = null;
  let spotlight: Colour | null = null;
  let popped: Snapshot['popped'] = null;
  let popCount = 0;
  let snapshot: Snapshot = build();
  const listeners = new Set<() => void>();

  function build(): Snapshot {
    const ctx = renderContext(state, harvestAt);
    return {
      state,
      harvestAt,
      board: toBoardView(state, harvestAt, spotlight, [], opts.theme.light, ctx),
      hud: toHudView(state, opts.strings, harvestAt, spotlight, ctx),
      popped,
    };
  }

  function commit(): void {
    snapshot = build();
    for (const listener of listeners) listener();
  }

  return {
    theme: opts.theme,
    strings: opts.strings,
    get: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch(action) {
      if (action.type === 'HARVEST') {
        // The cells that are about to leave, read BEFORE the reducer turns
        // them to stone — the leap is drawn from what was there.
        const value = harvestValue(state, action.at ?? harvestAt ?? undefined);
        if (value.count > 0) {
          const going = new Set<HexKey>(value.keys);
          popped = {
            cells: snapshot.board.cells.filter((c) => going.has(c.key)),
            at: action.at ?? harvestAt ?? snapshot.board.targetHex,
            id: ++popCount,
          };
        }
      }
      const next = reduce(state, action);
      if (next === state) return;
      state = next;
      // A priced pocket that popped or ripened away is no longer a pocket.
      if (harvestAt !== null && state.cells[harvestAt]?.kind !== 'tile') harvestAt = null;
      commit();
    },
    target(hex) {
      if (hex === harvestAt) return;
      harvestAt = hex;
      commit();
    },
    spotlight(colour) {
      if (colour === spotlight) return;
      spotlight = colour;
      commit();
    },
    restart(seed, from) {
      state = from ?? newRun(seed, tuning);
      harvestAt = null;
      spotlight = null;
      popped = null;
      commit();
    },
  };
}

export function useSession(session: Session): Snapshot {
  return useSyncExternalStore(session.subscribe, session.get, session.get);
}
