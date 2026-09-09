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
 * ## WALL and FIELD were the interesting omission, and they are IN (2026-09-08)
 *
 * They are the two toast-class places — a line beside a game still in motion,
 * spoken on the quiet beat after a placement — and this file argued them out on
 * the strength of the oldest camera ruling here, Marc, 2026-08-29: *"when we
 * place a tile, make sure the map doesnt move and stays stationary, it always
 * zoom in or zoom out a bit and its annoying."* Put to him with that argument
 * on 2026-09-08, he chose **fly to them too**: all seven concepts on the map
 * get the same treatment.
 *
 * **The ruling is not broken by this, and the distinction is worth keeping
 * straight.** What Marc objected to was the board moving on EVERY placement —
 * an ambient, unasked-for drift that made the map feel unstable. Each of these
 * fires **once per device, ever**, the first time that idea is met. A trip
 * nobody can trigger twice is an event, not a behaviour; the ruling is about
 * the behaviour.
 *
 * They are still the two entries most worth watching in Session A, for the one
 * reason that has not changed: unlike the five above, these speak while the
 * player's hand is still moving. If either reads as the map running away, this
 * is one line to take back out.
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
      // The two toast-class places, added 2026-09-08 on Marc's answer. Each
      // predicate is `teaching.ts`'s own, copied in the same order for the
      // same reason as the four above — `tourTarget.test.ts` pins the pair.
      case 'wall':
        return c.kind === 'wall';
      case 'field':
        return c.kind === 'empty' && c.native !== null;
      default:
        return false;
    }
  });
  return cell?.key ?? null;
}
