import type { HexKey } from '@engine/hex';
import type { TeachId } from '@meta/progress';
import type { BoardView } from '@render/Renderer';

/**
 * The hex a lesson is ABOUT, where a lesson is about a hex at all.
 *
 * Marc, 2026-09-06, of the shrine: *"zoom on it then zoom back where the user
 * was (same view) so its clearer"*; and 2026-09-08, of the rest: *"yes do the
 * same for caches, sites and territories and other concepts on the map"*.
 *
 * **Each predicate is the teaching moment's own, copied.** `shell/teaching.ts`
 * decides a card is due with `cells.some(...)`, and `some` stops at its first
 * match — so `find` over the same test in the same order returns that exact
 * cell and not merely one like it. Copied rather than shared because the two
 * sides answer different questions: one decides whether to SPEAK, this one
 * decides where to POINT, and a lesson could stop being about a place without
 * its moment changing at all. `tourTarget.test.ts` pins them against
 * `teaching.ts` so the copy cannot drift silently.
 *
 * ## What is deliberately not here
 *
 * **POP**, though `hud.canHarvest` is as true of a place as RIPE is. Its card
 * explains a BUTTON, and the pocket it would fly to is the same pocket RIPE's
 * card just flew to a beat earlier — two trips to one hex, for one idea.
 *
 * **RARE and UNIQUE**, which are in the hand; **LUCK, THE PURSE, RELICS, THE
 * COLOURS, the story** and the cost line, which are about the run rather than
 * about ground.
 *
 * **And WALL and FIELD, which ARE places and are the interesting omission.**
 * Both are toast-class: a line beside a game still in motion, spoken on the
 * quiet beat after a placement. Flying the board away there would break the
 * oldest camera ruling this repository has — Marc, 2026-08-29: *"when we place
 * a tile, make sure the map doesnt move and stays stationary, it always zoom in
 * or zoom out a bit and its annoying"* — where every entry below fires off a
 * card the player has just read and pressed GOT IT on, with nothing else
 * happening. One line each to add if that trade is wrong; the trade is a screen
 * decision, so it is stated in `NEXT.md` rather than guessed at here.
 */
export function tourTarget(id: TeachId, board: BoardView): HexKey | null {
  const cell = board.cells.find((c) => {
    switch (id) {
      // The four destinations, all one test — `teaching.ts` asks them as one
      // case too, so a fifth reward kind would land in both places or neither.
      case 'cache':
      case 'site':
      case 'shrine':
      case 'territory':
        return c.kind === 'landmark' && !c.claimed && c.landmark === id;
      case 'ripe':
        return c.ripe;
      default:
        return false;
    }
  });
  return cell?.key ?? null;
}
