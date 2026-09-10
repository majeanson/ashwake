import type { Action, GameState } from '@engine/state';
import type { HexKey } from '@engine/hex';

/**
 * WHAT AN ACTION ACTUALLY DID (`PASS.md` P2.2).
 *
 * `act` is the seam every receipt, sound, buzz, lesson, world merge and diary
 * row hangs off, and four of its own docblocks make the same claim in the same
 * words: **"one place knows what an action DID, so one place can sound it —
 * the alternative is a component watching for a change it did not cause."**
 *
 * That claim was true of the SEAM and false of the code. Three facts were
 * re-derived at nine sites inside one function:
 *
 *   - **a pop happened** — `action.type === 'HARVEST' && after.log.popped >
 *     before.log.popped` — spelled out for the voice, for the buzz, and for the
 *     playtest sheet;
 *   - **a claim landed** — `after.claimed.length > before.claimed.length` —
 *     spelled out for the voice, the buzz, and the camera's visit;
 *   - **a placement landed** — for the buzz and for the sheet;
 *   - and **the pocket's size**, `after.log.harvests.at(-1)?.count ?? 1`, three
 *     times: once for the voice and twice for the cascade's own length.
 *
 * None of them was WRONG. What they were is nine places for one fact to drift,
 * in the function that is the game's single most load-bearing seam — and the
 * repository's own scar tissue is full of exactly that. `?playtest=1` records
 * three of Session C's four facts off this seam, so a test of `action.type`
 * alone would credit a placement the rules refused, which on a stranger's
 * sheet would be a lie.
 *
 * **Why the RULES matter here and not just the tidiness.** Every one of these
 * asks about the STATE, not about the action: a `PLACE` the rules refuse must
 * confirm nothing, and a `HARVEST` on a pocket that could not pop must sound
 * nothing. The action's arrival is not the event; the state moving is.
 */

/** What one dispatch turned out to be. Read by the voice, the buzz, the
 *  playtest sheet, the camera and the cards — all of them, from one answer. */
type Happened = {
  /** A PLACE the rules accepted. */
  readonly placed: boolean;
  /** A HARVEST that actually popped a pocket. */
  readonly popped: boolean;
  /** A destination was claimed by this action. */
  readonly claimed: boolean;
  /** Where, so the camera can go and show it. Null unless `claimed`. */
  readonly claimedAt: HexKey | null;
  /**
   * Tiles in the pocket this action popped, or 1.
   *
   * The voice pitches a pop by it and `cascadeMs` sizes the animation by it, so
   * the card that accounts for a pop waits exactly as long as the motion it is
   * accounting for. One is the floor rather than zero: it is a multiplier for
   * both readers, and a silent note of no length is not the same as a small
   * one.
   */
  readonly pocket: number;
};

export function whatHappened(action: Action, before: GameState, after: GameState): Happened {
  const claimed = after.claimed.length > before.claimed.length;
  return {
    placed: action.type === 'PLACE' && after.placements > before.placements,
    popped: action.type === 'HARVEST' && after.log.popped > before.log.popped,
    claimed,
    claimedAt: claimed ? (after.claimed.at(-1) ?? null) : null,
    pocket: after.log.harvests.at(-1)?.count ?? 1,
  };
}

/**
 * What the board should FEEL like, or nothing.
 *
 * The priority is the rule and it is the reason this is a function: **a claim
 * rides ON a placement**, so both are true on the same dispatch and two buzzes
 * would read as one long one. The claim wins — it is the rarer event and the
 * one worth telling apart — and a pop cannot coincide with a placement at all.
 *
 * `shell/touch.ts` owns what each moment feels like; this owns only which.
 */
export const feelOf = (h: Happened): 'claim' | 'pop' | 'place' | null =>
  h.claimed ? 'claim' : h.popped ? 'pop' : h.placed ? 'place' : null;
