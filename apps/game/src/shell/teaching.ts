import { type Tuning } from '@content/tuning';
import { hasMet, meet, type Progress, type TeachId } from '@meta/progress';
import type { BoardView } from '@render/Renderer';
import { namesOf, type Theme } from '@theme/tokens';
import type { Strings } from '@text/Strings';
import { statNote, type HudView } from '@view/view';

/**
 * When the game says something, and what (Stage 3, 2026-08-29).
 *
 * **The core has the ledger and the words; it does not have the moments.**
 * `LESSONS` says what RIPE means and `TEACH_IDS` remembers whether this device
 * has been told, but nothing in `packages/core` knows that a tile just became
 * ripe for the first time. That is this file, and it is the one substantial
 * thing Stage 3 had to write rather than lift.
 *
 * Ashwake 1's shape, which is the part worth copying exactly:
 *
 * - **A priority list, not a queue.** The first unmet-and-true moment fires and
 *   the rest stay armed for the next quiet action. Two lessons at once is two
 *   cards stacked over a board, and a player dismisses the second without
 *   reading it.
 * - **Cards outrank toasts.** A concept gets a card; a consequence gets a line.
 * - **A lesson fires once per device**, written through the same ledger the
 *   shelf uses, so RESET TEACHING is one clear rather than a hunt.
 *
 * Pure: it takes two snapshots and returns what to say. No timers, no DOM, no
 * state of its own — which is what lets it be tested by handing it two views.
 */

/** What the game wants to say right now. */
export type Teach = {
  readonly id: TeachId;
  /** A card interrupts; a toast is one line and goes on its own. */
  readonly as: 'card' | 'toast';
};

/**
 * The order moments are asked in.
 *
 * Roughly the order a first run meets them, with the two that describe the
 * board's own state — a tile ripening, a pocket ready — ahead of the ones that
 * describe the economy, because a player who does not know what RIPE means
 * cannot use anything they are told about cost.
 */
const ORDER: readonly TeachId[] = [
  'story',
  'place',
  'ripe',
  'pop',
  'costRise',
  'cache',
  'site',
  'shrine',
  'territory',
  'wall',
  'field',
  'rare',
  'rareUnique',
  'lens',
  'luck',
  'purse',
  'relic',
  'colours',
  'lastGasp',
];

/** Which ones interrupt. A concept earns a card; a consequence gets a line. */
const CARDS = new Set<TeachId>([
  'story',
  'ripe',
  'pop',
  'cache',
  'site',
  'shrine',
  'territory',
  'rare',
  'rareUnique',
  'luck',
  'purse',
  'relic',
  'colours',
]);

export type Moment = {
  readonly board: BoardView;
  readonly hud: HudView;
  /** True once the player has placed at least one tile this run. */
  readonly placed: boolean;
};

/**
 * The first thing worth saying that this device has not been told.
 *
 * Returns null far more often than not — which is the point. A game that
 * teaches on every action is a game nobody is playing.
 *
 * ## Both halves fire (2026-09-03, later the same day)
 *
 * For one day this function skipped toast-class moments, because the drip's
 * audit found the toast half had NO SPEAKER: `App` consumed `nextLesson`
 * only where `as === 'card'`, so a returned toast was words nobody saw that
 * stood in front of every card behind it in `ORDER` — `wall` alone blocked
 * MAGIC, UNIQUE, LUCK, RELICS and COLOURS on every fresh device. The
 * fifteenth mechanic of the unconsumed-consumer shape, and the first that
 * was silently eating OTHER mechanics.
 *
 * The speaker exists now — `App`'s `speakLesson`, on the QUIET beats only: a
 * dispatch no receipt claimed, a card's dismissal, a run's first breath — and
 * `toastLine` below is its word table. A toast is marked told only when a
 * line was actually spoken; one whose evidence has left the board returns
 * null and stays armed, because the purse lesson already demonstrated what
 * burning a ledger entry on unshown words costs.
 */
export function nextLesson(now: Moment, progress: Progress): Teach | null {
  for (const id of ORDER) {
    if (hasMet(progress, id)) continue;
    if (!isTrue(id, now)) continue;
    return { id, as: CARDS.has(id) ? 'card' : 'toast' };
  }
  return null;
}

/**
 * The toast's own words — one line per toast-class moment (2026-09-03).
 *
 * Every sentence but one is a sentence the catalogue already prints at a
 * slower door, on the house rule of one wording in two places rather than
 * two wordings: `place` is its own figure's caption, `costRise` is the HUD
 * stat's tap answer, `wall` is the legend's row, `field` is the hex's own
 * tap answer, `lastGasp` is the shared rule clause. Only `lens` needed a new
 * sentence (`s.lensHint`, Marc's wording), because no invitation to the
 * gesture existed anywhere in either language.
 *
 * Null means the moment's evidence is gone from the board (a `field` cell no
 * longer in view): the caller says nothing and the ledger keeps the moment
 * armed.
 */
export function toastLine(
  id: TeachId,
  now: Moment,
  t: Tuning,
  theme: Theme,
  s: Strings,
): string | null {
  switch (id) {
    case 'place':
      return s.figure.place;
    case 'costRise':
      return statNote('cost', now.hud, t, s);
    case 'wall':
      return s.ui.legendWall;
    case 'field': {
      const cell = now.board.cells.find((c) => c.kind === 'empty' && c.native !== null);
      return cell?.native == null ? null : s.view.hex.native(namesOf(theme, s.locale)[cell.native]);
    }
    case 'lens':
      return s.lensHint;
    case 'lastGasp':
      return s.lastGaspRule;
    default:
      // A card-class id has no line: the card is its voice.
      return null;
  }
}

/** Mark one told. Idempotent, so a double-dismiss cannot double-write. */
export const told = (progress: Progress, id: TeachId): Progress => meet(progress, id);

/**
 * Whether a moment is happening.
 *
 * Every one of these reads the CURRENT view and nothing else — no diffing, no
 * remembered previous frame. A moment that is true for as long as its condition
 * holds is a moment that cannot be missed because a frame was dropped, and the
 * ledger is what stops it firing twice.
 */
function isTrue(id: TeachId, now: Moment): boolean {
  const { board, hud, placed } = now;
  switch (id) {
    case 'story':
      // Ahead of PLACE by construction (see `ORDER`): true from the first
      // frame of any run, board geometry included, so it is the one card a
      // stranger cannot fail to meet.
      return true;
    case 'place':
      // The first thing anyone sees: there is somewhere to put a tile.
      return !placed && board.cells.some((c) => c.legal);
    case 'ripe':
      return hud.ripeCount > 0;
    case 'pop':
      return hud.canHarvest;
    case 'costRise':
      return hud.cost > 1;
    case 'cache':
    case 'site':
    case 'shrine':
    case 'territory':
      return board.cells.some((c) => c.kind === 'landmark' && !c.claimed && c.landmark === id);
    case 'wall':
      return board.cells.some((c) => c.kind === 'wall');
    case 'field':
      return board.cells.some((c) => c.kind === 'empty' && c.native !== null);
    case 'rare':
      return hud.draft.some((c) => c.rarity === 'magic');
    case 'rareUnique':
      return hud.draft.some((c) => c.rarity === 'unique');
    case 'lens':
      // Only worth explaining once there is enough board to sort through.
      return board.cells.filter((c) => c.kind === 'tile').length >= 6;
    case 'luck':
      return hud.luck > 0;
    case 'purse':
      /*
       * Fired by the player OPENING the purse, not by having one, so it is
       * never true here — see `App`'s `onPurse`, which raises
       * `purseLesson`'s card and then marks it told.
       *
       * That handler marked it told and showed NOTHING until 2026-08-30, so
       * this `false` was load-bearing for a lesson that could not fire from
       * anywhere. A moment that is always false is only honest while
       * something else owns the moment; when nothing does, it is a lesson
       * spending its own ledger entry to say nothing.
       */
      return false;
    case 'relic':
      return hud.relics > 0;
    case 'colours':
      return placed && hud.draft.length > 0;
    case 'lastGasp':
      return hud.left !== null && hud.left <= 1;
  }
}
