import type { GameState } from '@engine/state';
import type { HudView } from '@view/view';
import type { Strings } from '@text/Strings';

/**
 * The three things a run says exactly once (Stage 5, 2026-08-29; the third
 * on 2026-09-16).
 *
 * Not teaching. The teaching ledger is a DEVICE fact — you learn what RIPE
 * means once and never again — and these are true afresh every run: reaching
 * new ground is worth marking each time it happens, a unique arriving in a
 * hand is worth a reminder long after its first-contact card was read, and a
 * purse that has outrun the clock is a fact about THIS run's arithmetic.
 *
 * **SPARE TILES is the one Marc found on the board** — 202 tiles, 167
 * placements left, the tiles half of every POP buying nothing, and the game
 * saying nothing (`HudView.tilesSpare`). The sentence existed in both
 * languages and lived in the guide line he took off the screen on
 * 2026-08-29, so the fact had no door for two weeks. Asked where it should go
 * he said _"one toast when it becomes true"_, and this is that: once a run,
 * over the board, on the first beat nothing louder wants. Not per placement —
 * the state stays true for the rest of the run, and a sentence that repeats
 * while nothing changes is the guide line he removed.
 *
 * Pure, and shaped like `teaching.ts` for the same reason: what is said is a
 * decision, and a decision belongs somewhere it can be tested without a
 * browser.
 *
 * **NEW GROUND is measured against the world's reach as it was when the run
 * BEGAN**, captured once and carried. Ashwake 1 learned this the hard way: the
 * world's own memory is kept current by the shell's merge, so reading it live
 * would move the boundary the moment the run crossed it, and the announcement
 * would never fire.
 */

export type OnceId = 'newGround' | 'unique' | 'tilesSpare';

type Moment = {
  readonly state: GameState;
  /** How far this run has actually built — the view's own measure. */
  readonly hud: HudView;
  /**
   * The world's farthest reach when this run began, or `null` where the run
   * has no world at all.
   *
   * **Null is not zero, and that distinction is the bug this field was given a
   * type for** (2026-09-02). NEW GROUND says *"farther than this world has ever
   * reached"* — a sentence about a WORLD. A daily has none, and a shared seed
   * is somebody else's, so on both there is nothing for the claim to be about.
   *
   * It used to take a plain number and the shell handed it the HOME world's
   * reach whatever mode was running, so stepping from a world into the daily
   * measured today's board against a ladder it was not on: a player whose world
   * had reached 20 had to out-reach their own history before the daily would
   * say anything, and a player on a fresh device was told the daily was new
   * ground on the first placement. Wrong in both directions, from one missing
   * distinction.
   */
  readonly reachAtStart: number | null;
  /** What this run has already said. */
  readonly said: ReadonlySet<OnceId>;
};

/**
 * The first unsaid thing that is true, or null — which is the answer almost
 * every time, and the point.
 */
export function onceARun(now: Moment, s: Strings): { id: OnceId; text: string } | null {
  if (
    !now.said.has('newGround') &&
    now.reachAtStart !== null &&
    now.hud.depthValue > now.reachAtStart
  ) {
    return { id: 'newGround', text: s.onceARun.newGround };
  }
  if (!now.said.has('unique') && now.state.draft.some((tile) => tile.rarity === 'unique')) {
    return { id: 'unique', text: s.onceARun.unique };
  }
  if (!now.said.has('tilesSpare') && now.hud.tilesSpare) {
    // The guide's own sentence, and the guide's own fork: under one POP the
    // "POP for PTS" wording points at a button that is not on the screen.
    const g = s.view.guide;
    return {
      id: 'tilesSpare',
      text: now.state.tuning.singlePayout ? g.tilesSpareSingle : g.tilesSpare,
    };
  }
  return null;
}
