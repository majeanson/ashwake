import { useSyncExternalStore } from 'react';
import { TUNING, type Tuning } from '@content/tuning';
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
  /** Start again on a seed. */
  readonly restart: (seed: number) => void;
};

export function createSession(opts: {
  readonly seed: number;
  readonly theme: Theme;
  readonly strings: Strings;
  readonly tuning?: Tuning;
}): Session {
  const tuning = opts.tuning ?? TUNING;
  let state = newRun(opts.seed, tuning);
  let harvestAt: HexKey | null = null;
  let popped: Snapshot['popped'] = null;
  let popCount = 0;
  let snapshot: Snapshot = build();
  const listeners = new Set<() => void>();

  function build(): Snapshot {
    const ctx = renderContext(state, harvestAt);
    return {
      state,
      harvestAt,
      board: toBoardView(state, harvestAt, null, [], opts.theme.light, ctx),
      hud: toHudView(state, opts.strings, harvestAt, null, ctx),
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
    restart(seed) {
      state = newRun(seed, tuning);
      harvestAt = null;
      popped = null;
      commit();
    },
  };
}

export function useSession(session: Session): Snapshot {
  return useSyncExternalStore(session.subscribe, session.get, session.get);
}
