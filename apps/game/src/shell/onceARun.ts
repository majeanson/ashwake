import type { GameState } from '@engine/state';
import type { HudView } from '@view/view';
import type { Strings } from '@text/Strings';

/**
 * The two things a run says exactly once (Stage 5, 2026-08-29).
 *
 * Not teaching. The teaching ledger is a DEVICE fact — you learn what RIPE
 * means once and never again — and these are true afresh every run: reaching
 * new ground is worth marking each time it happens, and a unique arriving in
 * a hand is worth a reminder long after its first-contact card was read.
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

export type OnceId = 'newGround' | 'unique';

export type Moment = {
  readonly state: GameState;
  /** How far this run has actually built — the view's own measure. */
  readonly hud: HudView;
  /** The world's farthest reach when this run began. */
  readonly reachAtStart: number;
  /** What this run has already said. */
  readonly said: ReadonlySet<OnceId>;
};

/**
 * The first unsaid thing that is true, or null — which is the answer almost
 * every time, and the point.
 */
export function onceARun(now: Moment, s: Strings): { id: OnceId; text: string } | null {
  if (!now.said.has('newGround') && now.hud.depthValue > now.reachAtStart) {
    return { id: 'newGround', text: s.onceARun.newGround };
  }
  if (!now.said.has('unique') && now.state.draft.some((tile) => tile.rarity === 'unique')) {
    return { id: 'unique', text: s.onceARun.unique };
  }
  return null;
}
