import type { CellView } from '@render/Renderer';
import type { Colour } from '@content/tuning';

/**
 * WHAT A TAP ON THE BOARD MEANS (`PASS.md` P2.3).
 *
 * `INTERACTIONS.md`'s first table is this decision, row by row, and it is the
 * table that file exists for: **four of this body's inert mechanics were
 * controls rendered here and connected to nothing** — the colour lens, the
 * stash, the board's tap-to-describe, and unselecting a card. Its own summary
 * of the damage is that three of the eight rows were a "silent no-op".
 *
 * The decision lived as an eight-branch cascade inside `App`, with each branch
 * doing its own work between the `if` and the `return` — so the ORDER, which is
 * the whole rule, could only be read by reading the effects. It could not be
 * asked what a tap on a ripe legal hex means, and that is a question with an
 * answer.
 *
 * **The order is the rule, and every rung is a decision somebody made:**
 *
 *  1. **touring** — a tap on a board that is away means "come back", and
 *     nothing else. The board stays live through a trip (a finger outranks a
 *     journey), so a thumb that has just pressed GOT IT was raycasting into a
 *     board mid-flight and landing on whatever hex the camera happened to be
 *     over. Placing is the one thing on this board that cannot be undone.
 *  2. **ripe** before **legal**, because a ripe tile is both and pricing a
 *     pocket is the answer a tap on one wants.
 *  3. **legal with an empty hand** says so, rather than doing nothing.
 *  4. **legal** places.
 *  5. **remembered fog** works the lens: a colour you know lights up, and a
 *     second tap puts it down. Two gestures reach the lens and this is the one
 *     that was unreachable in this body until 2026-09-01, because
 *     `HexField`'s raycast refused remembered ground.
 *  6. **a landmark you have actually reached** opens the card that defines it,
 *     as well as saying this run's numbers. Beacons and remembered ground are
 *     excluded on purpose: a modal over every glow on the horizon is the wrong
 *     weight for "what is that", and a young board is mostly edge.
 *  7. **a placed tile** says to HOLD it (2026-09-25); a hold, or Enter from
 *     the keyboard, lights its ground — see `holdMeans`.
 *  8. **anything else** is described.
 */

/** What the shell must do about a tap. The effects stay in `App`; the choice
 *  is here, and each is one row of `INTERACTIONS.md`'s first table. */
type Tap =
  /** Come back from a tour, and do nothing else with this tap. */
  | { readonly does: 'return' }
  /** Price this pocket and aim POP at it. */
  | { readonly does: 'price' }
  /** Legal, but there is nothing in hand to put down. */
  | { readonly does: 'hand-empty' }
  /** Place the selected card here. */
  | { readonly does: 'place' }
  /** Light this colour up across the board. */
  | { readonly does: 'lens-on'; readonly colour: Colour }
  /** A quick tap on a placed tile: say that holding it lights its ground. */
  | { readonly does: 'hold-hint'; readonly colour: Colour }
  /** Put the lens down. */
  | { readonly does: 'lens-off' }
  /** Open the card that defines this landmark, and say its numbers. */
  | { readonly does: 'card' }
  /** Say what is here. */
  | { readonly does: 'describe' };

/** What the shell knows at the moment of a tap. */
export type Reach = {
  /** True while the board is away on a tour. */
  readonly touring: boolean;
  /** How many cards are in hand. */
  readonly inHand: number;
  /** The colour currently held up, or null. */
  readonly lens: Colour | null;
  /** The colour this device remembers at that hex, or null where it knows
   *  nothing — `rememberedNativeAt`, which reads the live world. */
  readonly known: Colour | null;
  /** The press is one that LIGHTS a placed tile's ground rather than asking
   *  about it: the keyboard's Enter, which has no way to hold. A finger's hold
   *  never reaches `tapMeans` — it is `holdMeans`, on a timer. */
  readonly held: boolean;
};

/**
 * The tap, decided.
 *
 * Every branch below `return` also clears the target in `App` — tapping
 * something that cannot be built on lets the priced pocket go — and that stays
 * an effect rather than a variant, because it is true of five rows and saying
 * so five times is how five rows come to disagree.
 */
export function tapMeans(cell: CellView, reach: Reach): Tap {
  if (reach.touring) return { does: 'return' };
  if (cell.ripe) return { does: 'price' };
  if (cell.legal) return reach.inHand === 0 ? { does: 'hand-empty' } : { does: 'place' };

  if (cell.remembered) {
    // A colour you know, and not the one already held up: light it. Tapping
    // the SAME ground twice is what puts a lens down, which is the second of
    // the two gestures that can — see `LensOff` for the third, a control.
    if (reach.known !== null && reach.known !== reach.lens) {
      return { does: 'lens-on', colour: reach.known };
    }
    if (reach.lens !== null) return { does: 'lens-off' };
  }

  /*
   * A PLACED TILE LIGHTS ITS GROUND (Marc, 2026-09-25: "when we click on a
   * tile on the map (farm, quarry, etc.) make it pop the lens for that
   * color", then, the same day: "dont open lens when we click on the board,
   * just the map is updated"). So a tap is the lens on the BOARD and never
   * the panel: the same `lens-on` remembered ground answers with. An open
   * panel follows it, because the panel reads the held ground. A tile of the
   * ground already held puts the lens down, the second-tap rule remembered
   * ground keeps. A RIPE tile still prices its pocket (above): that is the
   * tap POP is aimed with.
   */
  if (cell.kind === 'tile' && cell.colour !== null && !cell.remembered) {
    /*
     * AND A HOLD, NOT A TAP (Marc, the same evening, on the phone: "longer
     * tap"). A quick tap while building is the commonest touch on this board,
     * and it was changing the lens under the thumb. So a quick tap says how
     * it is done, which is what makes it findable, and a hold does it.
     */
    if (!reach.held) return { does: 'hold-hint', colour: cell.colour };
    return cell.colour === reach.lens
      ? { does: 'lens-off' }
      : { does: 'lens-on', colour: cell.colour };
  }

  if (cell.kind === 'landmark' && cell.landmark !== null && !cell.beacon && !cell.remembered) {
    return { does: 'card' };
  }
  return { does: 'describe' };
}

/**
 * What a finger HELD on the board means, or null for "nothing: let the tap
 * happen". Only a placed tile answers a hold — ripe or not, since a ripe one's
 * quick tap is already POP's aim — by lighting its ground, or putting the lens
 * down if that ground is the one held. A board away on a tour answers nothing:
 * the release will bring it home, as any tap does.
 */
export function holdMeans(cell: CellView, reach: Reach): Tap | null {
  if (reach.touring) return null;
  if (cell.kind !== 'tile' || cell.colour === null || cell.remembered) return null;
  return cell.colour === reach.lens
    ? { does: 'lens-off' }
    : { does: 'lens-on', colour: cell.colour };
}
