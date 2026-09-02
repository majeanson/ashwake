import { grantFind, type PerkId, type Progress } from '@meta/progress';
import type { HexKey } from '@engine/hex';

/**
 * WHAT A FIND HOLDS, for the receipt that has to name it (2026-09-02).
 *
 * `view/receipts.ts` takes a `perkAt` and a `worn` so a find's claim can say
 * which perk it gave; `shell/store.ts` forwards both into the session; **`App`
 * passed neither.** So every find claimed in the real game came back
 * `findNothing` — *"Nothing new inside"* — including the ones that had just
 * granted a perk, and the toast naming that perk was overwritten by the denial
 * a line later. The one moment the perk hunt pays out, the game denied it.
 *
 * `receipts.test.ts` is green throughout, because it supplies the hook itself.
 * The machinery was proved and the wiring was not, which is this repository's
 * signature miss wearing an OPTION instead of an export.
 *
 * ## Why this is a module and not a ref
 *
 * The receipt is built inside `dispatch`, so the answer must be the shelf as it
 * stood an instant BEFORE the grant — which is a value only the dispatching
 * handler knows. The obvious shape is a React ref read by the session's
 * closure, and the React Compiler refuses it: the session is built during
 * render, and a ref may not be read there even from a closure that runs later.
 *
 * So the holder is module scope, the same deliberate choice `shell/install.ts`
 * makes for `beforeinstallprompt` and for the same reason: the value has to
 * outlive a render without belonging to one. `aim` is called from an event
 * handler, which is where a write like this is allowed to live.
 *
 * One board is playable at a time, so one holder is the whole of the state.
 */

type Shelf = {
  /** The perks already carried, which is what `grantFind` filters against. */
  readonly progress: Progress;
  /** The world seed a find's perk is derived from. */
  readonly seed: number;
  /**
   * Whether a grant will actually happen.
   *
   * A perk lives on the world that found it, so a daily and a shared seed
   * grant none — and their receipts must go on saying "only on your own
   * world", which `findNothing` already does. False makes `perkAt` null and
   * that sentence true rather than a guess.
   */
  readonly grants: boolean;
};

let shelf: Shelf | null = null;

/** Point the receipt at the shelf this dispatch will be judged against. */
export const aim = (next: Shelf): void => {
  shelf = next;
};

/**
 * The perk a find at this hex would give, or null.
 *
 * `grantFind` is deterministic in (shelf, seed, hex), so asking it with the
 * pre-grant shelf returns the very perk the shell is about to hand out rather
 * than a second guess at it — one rule, asked twice, which is the only way the
 * receipt and the grant cannot disagree.
 */
export function perkAt(hex: HexKey): PerkId | null {
  if (shelf === null || !shelf.grants) return null;
  return grantFind(shelf.progress, shelf.seed, hex)?.perk.id ?? null;
}

/** Whether that perk is already being worn — `grantFind` equips the first one
 *  a bare shelf finds, so the sentence has to know. */
export const wornPerk = (perk: PerkId): boolean =>
  shelf !== null && shelf.progress.equipped.includes(perk);

/** Forget the board being left. A run with no shelf aimed grants nothing, which
 *  is the honest answer for a session that has not dispatched yet. */
export const forgetShelf = (): void => {
  shelf = null;
};
