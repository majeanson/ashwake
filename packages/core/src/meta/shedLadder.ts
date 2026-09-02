import type { Strings } from '@text/Strings';
/**
 * The shed ladder: what a storage-full write triages away, in order.
 *
 * `main.ts`'s `onChange` cannot fail to save the run in progress — it is the
 * one thing on the device that cannot be regenerated — so when `localStorage`
 * throws it sheds other things, cheapest loss first, and retries. This
 * module owns exactly the ORDERING and the honest sentence each rung reports;
 * the actual `localStorage.removeItem` calls stay in `main.ts`, keyed by a
 * slot number this module has no business knowing.
 *
 * The order is not arbitrary — it survived a real bug (2026-08-20). An
 * earlier two-rung version shed `keys.world` while leaving `keys.run`: the
 * next boot found no world, minted a fresh random one, then resumed the old
 * run — whose `rootSeed` no longer matched the new world's — and the merge
 * had no seed guard, so a foreign geography got unioned into the new world's
 * revealed ground. The rule that came out of it: spend the genuinely cheap
 * things first, and never touch the world being played (rung 4 sheds every
 * OTHER world, never the active one).
 *
 * Each rung says its OWN sentence rather than sharing one, because "some
 * history was cleared" is a fair description of the diary and a lie about a
 * world.
 */

export type ShedRungId =
  /** A diagnostic record. Free, and nobody's memory of anything. */
  | 'lastError'
  /**
   * The other slots' receipts — small, and a receipt is a one-shot toast
   * nobody is waiting for on a world they are not in.
   */
  | 'otherReceipts'
  /** The diary. Your worlds, relics and perks are untouched. */
  | 'timeline'
  /**
   * Every OTHER world's whole footprint (world, run, shop levels) — never
   * the one being played, which is the point of the ladder existing.
   */
  | 'otherWorlds'
  /**
   * NOT A RUNG: the ladder ran out (2026-09-02).
   *
   * Every rung spent and the write still failed, so the run in progress is
   * lost and there is nothing left to give that is not the world being
   * played. It is reported through the same channel because it is the same
   * event from the player's side — "something happened to your storage" — and
   * because a second channel is a second thing the shell has to remember to
   * listen to.
   *
   * It was silent. `onShed` reported the rungs that WORKED, so a device that
   * shed its diary AND its other worlds and still could not save said the
   * three reassuring sentences and never the one that mattered. The only
   * outcome a player can act on was the only one with no words.
   *
   * Deliberately absent from `SHED_LADDER`: it is an outcome, not a step, and
   * a ladder you can climb onto is a world you can shed.
   */
  | 'lost';

export type ShedRung = {
  readonly id: ShedRungId;
};

/** The one sentence a rung reports if it is the one that freed enough room —
 *  from `text/`, per language. */
export const shedNote = (id: ShedRungId, s: Strings): string => s.shed[id];

/**
 * Cheapest and least missed first; the active world is never a rung at all,
 * because it is what the whole ladder exists to protect.
 */
export const SHED_LADDER: readonly ShedRung[] = [
  { id: 'lastError' },
  { id: 'otherReceipts' },
  { id: 'timeline' },
  { id: 'otherWorlds' },
];
