import { hasMet, meet, type Progress, type TeachId } from '@meta/progress';
import type { BoardView } from '@render/Renderer';
import type { HudView } from '@view/view';

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
  'place',
  'ripe',
  'pop',
  'glow',
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
 */
export function nextLesson(now: Moment, progress: Progress): Teach | null {
  for (const id of ORDER) {
    if (hasMet(progress, id)) continue;
    if (!isTrue(id, now)) continue;
    return { id, as: CARDS.has(id) ? 'card' : 'toast' };
  }
  return null;
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
    case 'place':
      // The first thing anyone sees: there is somewhere to put a tile.
      return !placed && board.cells.some((c) => c.legal);
    case 'ripe':
      return hud.ripeCount > 0;
    case 'pop':
      return hud.canHarvest;
    case 'glow':
      // A pocket is ready and worth more than the one tile that made it.
      return hud.pocketsReady > 0 && hud.harvestTiles > 1;
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
      // Fired by the player OPENING the purse, not by having one — see
      // `App`'s toggle. Never true on its own.
      return false;
    case 'relic':
      return hud.relics > 0;
    case 'colours':
      return placed && hud.draft.length > 0;
    case 'lastGasp':
      return hud.left !== null && hud.left <= 1;
  }
}
