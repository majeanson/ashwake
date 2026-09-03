/**
 * The destination signpost (2026-09-02).
 *
 * `hintFor` has computed `HudView.hint` since the rules were lifted — "a CACHE,
 * five hexes out" — and **nothing in this body has ever read it.** The audit of
 * 2026-09-02 found it the same way the colour lens, the stash, the board's
 * tap-to-describe and the fog were found: a rule the core implements and tests,
 * reachable from nothing. It is the endless world's whole answer to "where do I
 * go?", so a plane with no signpost is a plane with no reason to walk.
 *
 * Ashwake 1 spoke it as a TOAST ON CHANGE rather than as a line that sat there
 * permanently being true (`tiles/src/ui/game.ts`, `#lastSignpost`), and the
 * three guards it carried are the whole of this file:
 *
 * - **Primed, never greeting.** The first look after a run begins only records
 *   what is near. A player resuming a board already knows what is beside them,
 *   and being told on arrival reads as the game talking to itself. `last` is
 *   `undefined` for exactly that beat.
 * - **Only on a quiet beat.** A claim's receipt, a pop's line, a teaching card
 *   all outrank it. The caller answers that by only asking when nothing louder
 *   wanted the toast.
 * - **Not before RIPE.** Gated on the one lesson that makes a destination
 *   reachable. Ashwake 1 paid for this: the signpost fired within the first few
 *   placements, so a stranger was told to build out and touch the light before
 *   the game had said what ripening was, and the run died at placement 22 with
 *   the player having done exactly what they were told.
 *
 * Pure, and shaped like `onceARun` for its reason: what is said is a decision,
 * and a decision belongs somewhere it can be tested without a browser.
 */

export type Signpost = {
  /** `HudView.hint` — the nearest unclaimed destination, or null. */
  readonly hint: string | null;
  /**
   * The hint at the last look. `undefined` means this run has not looked yet,
   * which is the priming beat and is silent.
   */
  readonly last: string | null | undefined;
  /** Whether RIPE has been taught. A device with no ledger reads as taught. */
  readonly knowsRipe: boolean;
};

/** What to say, or null — which is the answer almost every time, and the point. */
export function signpostFor(now: Signpost): string | null {
  if (now.hint === null) return null;
  if (now.last === undefined) return null;
  if (!now.knowsRipe) return null;
  /*
   * The sentence arrives finished (2026-09-02).
   *
   * This used to return `` `${now.hint}.` `` — a full stop added in the shell,
   * to a sentence written in `text/`. D4's rule is that a catalogue function
   * takes numbers and names and returns WORDS, and punctuation is words: this
   * one line meant French could not choose its own final mark, and it sat
   * beside `view.glows.atEdge` and `view.glows.past`, which are the same
   * sentence in a different tense and end themselves.
   *
   * `s.view.hint` ends itself now, like its two siblings.
   */
  return now.hint === now.last ? null : now.hint;
}
