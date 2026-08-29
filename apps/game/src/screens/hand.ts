/**
 * How many cards a hand row takes (ported from Ashwake 1, 2026-08-27).
 *
 * Not `draft + stash`, which is what this body was doing and is wrong the
 * moment the stash unlocks: four dealt cards beside two slots is six across,
 * and six across on a 390px phone is 56px a card — wide enough for a thumb,
 * too narrow for the ground's NAME, and the name is one of the three channels
 * a card says its colour in (the other two are the mark and the fill).
 *
 * So the rule is Marc's own, from the session where the hand and the stash
 * were merged into one row:
 *
 * - **Five or fewer** — one row of exactly that many. The cards stay
 *   comfortably thumbable and the board keeps its height.
 * - **Six** — three across, two rows. His words: *"we can use 2x3 too"*.
 * - **Seven or eight** — four across, which is the widest row that still
 *   leaves a card readable.
 *
 * A second row costs about 79px of board, which is why the threshold is as
 * high as it is: *"we lost too much game space"* (Marc, 2026-08-27). The board
 * is the game; the hand is how you reach it.
 *
 * Counted from the cards actually DRAWN — spacers included. A hand one card
 * short still occupies its slot (see `handCards`), so the grid does not
 * reshape under a thumb between a stash and the next deal.
 */
export function handColumns(cards: number, held: number): number {
  const total = cards + held;
  if (total <= 5) return Math.max(1, total);
  if (total === 6) return 3;
  return 4;
}

/**
 * What the hand draws: every dealt card, then a spacer for each one missing.
 *
 * The hand is laid out from `draftWidth` — how many cards it DEALS — rather
 * than from how many it is currently holding, because stashing into an empty
 * slot takes a card out of the draft and nothing puts one back until the next
 * placement. Without the spacers the row would reflow twice under a thumb in
 * the two taps between (Marc, 2026-08-27).
 */
export function handSpacers(dealt: number, width: number): number {
  return Math.max(0, width - dealt);
}

/**
 * One card per stash slot: the tiles held, then an empty HOLD for each slot
 * still free. A stash of two full slots draws two tiles and no HOLD.
 *
 * `Math.max(1, slots)` because a stash that exists is a stash you can see —
 * a dial set to zero means no stash at all and never reaches here.
 */
export function stashSlots(canHold: boolean, slots: number): number {
  return canHold ? Math.max(1, slots) : 0;
}
