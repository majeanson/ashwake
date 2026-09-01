/**
 * How many cards a hand row takes — ALL of them (2026-08-30).
 *
 * **One row, whatever the count.** Marc: *"be thorough in ui/ux so we DON'T
 * lose any height space and have maximum map."* This used to wrap at six
 * (`3 × 2`), which cost 60 measured pixels of board on a 390px phone — and a
 * six-card hand is the ordinary state of any world that has woken two shrines,
 * so most of a device's life was played with a two-row hand.
 *
 * The wrap was bought for one thing, and it was the right worry at the time:
 * six across on a 390px phone is 58px a card, "too narrow for the ground's
 * NAME, and the name is one of the three channels a card says its colour in".
 * All three have since changed, and the name is gone (2026-08-31, Marc:
 * *"remove text in the hand tiles, keep color and symbol"*). The card is the
 * baked HEX with a Phosphor mark on it and no words, so the picture carries the
 * colour at any width and the mark scales with its own column (`.tile-mark` in
 * `ui.css`, sized from `--hand-cols`). Nothing on a card decides the layout
 * any more.
 *
 * **Six is the real maximum**, which is what makes one row safe: `draftWidth`
 * is 3 and the DRAFT unlock takes it to 4; `holdSlots` is 1 and the HOLD
 * unlock takes it to 2. OPEN HAND deals 5 and removes the stash entirely, so
 * it is 5. At six across, a card is 58px on a 390px phone and 46px on a 320px
 * one — both above the 44px tap floor `e2e/targets.spec.ts` holds every
 * control to, and `hand.test.ts` pins the arithmetic so a new dial cannot
 * quietly push a row under it.
 *
 * Counted from the cards actually DRAWN — spacers included. A hand one card
 * short still occupies its slot (see `handSpacers`), so the grid does not
 * reshape under a thumb between a stash and the next deal.
 */
export function handColumns(cards: number, held: number): number {
  return Math.max(1, cards + held);
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
