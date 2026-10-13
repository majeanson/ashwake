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
 *   shelf uses, so REPLAY THE TUTORIAL is one clear rather than a hunt.
 *
 * Pure: it takes two snapshots and returns what to say. No timers, no DOM, no
 * state of its own — which is what lets it be tested by handing it two views.
 */

/** What the game wants to say right now. */
type Teach = {
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
  'goal',
  'place',
  'ripe',
  'pop',
  // The caravan's card, the first time it is IN TOWN with a pocket to try
  // (2026-09-30). POP is true whenever it is, and comes first, so the card
  // about a reason to pop never lands before the card about popping. It
  // stands ten placements, so a card held back a beat is not missed.
  'caravan',
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
  'reroll',
  'purse',
  'relic',
  'colours',
  'lastGasp',
];

/**
 * Which ones interrupt. A concept earns a card; a consequence gets a line.
 *
 * Exported for one test (2026-09-30): every id here must be a card something
 * DRAWS. COLOURS sat in this set with no lesson for a month, so `LessonCard`
 * drew nothing, nothing told it, and LAST GASP behind it never spoke.
 */
export const CARDS = new Set<TeachId>([
  'story',
  'goal',
  'ripe',
  'pop',
  'caravan',
  'cache',
  'site',
  'luck',
  'purse',
  'relic',
  'colours',
]);

/**
 * THE ONES THAT DO NOT INTERRUPT (2026-10-12, Marc: _"card with new dot"_).
 *
 * A magic tile, a unique tile, a territory and a shrine are each worth a card
 * and none is worth stopping the game for: the player can be playing perfectly
 * well without knowing what they are. They wait as a NEW chip over the hand,
 * and the card opens when it is tapped. They are not in `CARDS` because
 * nothing fires them, and `nextLesson` passes over them, so a chip nobody has
 * tapped never holds back a lesson behind it.
 */
const DOTS: ReadonlySet<TeachId> = new Set<TeachId>(['rare', 'rareUnique', 'territory', 'shrine']);

export type Moment = {
  readonly board: BoardView;
  readonly hud: HudView;
  /** True once the player has placed at least one tile this run. */
  readonly placed: boolean;
  /**
   * Placements since the game last said something (a card or a toast), or
   * undefined where nothing is holding back — a test, a first frame. See
   * `CARD_GAP`.
   */
  readonly since?: number | undefined;
};

/**
 * THE PACE (2026-10-12, two strangers: _"trop d'information trop vite trop
 * tôt"_). After the game says something it says nothing NEW for this many
 * placements, so a first minute is one idea at a time instead of a queue of
 * cards. 0 turns the gate off, as every system's dial does.
 *
 * Held back, not dropped: a moment that stays true stays armed, which is the
 * priority list's own contract.
 */
export const CARD_GAP = 4;

/**
 * Placements since the game last spoke, for a `Moment`. A count above the
 * current one is a new run (placements restart at 0), which has said nothing
 * yet; null is the same.
 */
export const sinceSpoke = (spokeAt: number | null, placements: number): number | undefined =>
  spokeAt === null || spokeAt > placements ? undefined : placements - spokeAt;

/**
 * What is never held back. The opening beats come before there is a pace to
 * keep; RIPE and POP are the two ideas the game cannot be played without, and
 * waiting four placements to hear what a ripe tile is would be the confusion
 * this gate exists to cure; THE FOUR GROUNDS is what the first placement is
 * a choice between, so it is told the moment there is one; LAST GASP is the
 * one lesson whose moment passes with the next placement.
 */
const UNPACED = new Set<TeachId>(['story', 'goal', 'place', 'colours', 'ripe', 'pop', 'lastGasp']);

/**
 * THE FIRST RUN IS WALKED (2026-10-12, Marc: _"take the user by the hand and
 * walk them through their actions and why they do it more thoroughly. Make
 * sure no other info is in the way"_).
 *
 * Until a device's first pop has actually landed (`walked`, written by `App`) —
 * the only things said are the opening beats, the two ideas the walk is
 * about, and the coach's one line for the step the player is on. Every other
 * lesson, NEW chip, once-a-run line (NEW GROUND, UNIQUE, SPARE TILES) and
 * signpost waits: held back, not dropped, since each stays armed.
 */
export const guided = (progress: Progress): boolean => phaseOf(progress) !== 'free';

/**
 * THE FIRST RUN HAS THREE PHASES (2026-10-12, Marc, of the first screen:
 * _"it should force me to pop one … we explain luck, then we continue until no
 * more tiles are left … a big pop, until the end where we explain how it ends
 * … make the tutorial even more structured so it is step by step and not too
 * much at the same time"_).
 *
 * - **walk**: until the first pop lands. Place, colours, surround, and then
 *   POP — which is not optional: `mustPop` refuses a placement while a pocket
 *   waits, so the first pop is a small one, taken on purpose.
 * - **tour**: from that pop until the first run ends. LUCK, then MAGIC, then
 *   build one big pocket and cash it, then how a run ends.
 * - **free**: everything else, as the drip has always had it.
 */
type Phase = 'walk' | 'tour' | 'free';
export const phaseOf = (progress: Progress): Phase =>
  !hasMet(progress, 'walked') ? 'walk' : !hasMet(progress, 'toured') ? 'tour' : 'free';

/** What may still speak, by phase. Held back, not dropped. */
const ALLOWED: Readonly<Record<'walk' | 'tour', ReadonlySet<TeachId>>> = {
  walk: new Set<TeachId>(['story', 'goal', 'place', 'colours', 'ripe', 'pop']),
  tour: new Set<TeachId>(['luck', 'rare']),
};

/**
 * Whether the player must pop before they may place (the walk's one hard
 * gate). The first pocket is the smallest the run will ever offer, which is
 * exactly why it is the one to pop: a player left to place instead builds one
 * big pocket on their first minute and never learns the verb.
 */
export const mustPop = (now: Moment, progress: Progress): boolean =>
  phaseOf(progress) === 'walk' && now.hud.canHarvest && !now.hud.ended;

/** Tiles at which "pop your biggest" is the advice: the tour's bank step. */
const LOW_TILES = 5;

/** The step of the walk or the tour the player is on. */
type CoachStep = 'place' | 'match' | 'grow' | 'pop' | 'build' | 'bank' | 'end';

/**
 * Which step, or null when the walk is over. Read from the current view only,
 * like `isTrue`: no remembered frame, so a step cannot be missed.
 */
export function coachStep(now: Moment, progress: Progress): CoachStep | null {
  const phase = phaseOf(progress);
  if (phase === 'free' || now.hud.ended) return null;
  if (phase === 'tour') {
    const { tiles, cost } = now.hud;
    // Fewer tiles than the next placement costs: the end of a run, taught.
    if (tiles < cost) return 'end';
    if (now.hud.canHarvest && tiles <= Math.max(LOW_TILES, cost * 2)) return 'bank';
    return 'build';
  }
  if (!now.placed) return 'place';
  if (now.hud.canHarvest) return 'pop';
  // The first two tiles are about colour; after that, about surrounding.
  return now.hud.placements < 3 ? 'match' : 'grow';
}

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
  const phase = phaseOf(progress);
  for (const id of ORDER) {
    // In the tour MAGIC is a card, and told once LUCK has been: a chip nobody
    // taps is a lesson that never happens, and a magic tile cannot be dealt on
    // cue, so the concept is taught on its own turn.
    const magicTurn = phase === 'tour' && id === 'rare';
    if (hasMet(progress, id) || (DOTS.has(id) && !magicTurn)) continue;
    // Held back, not dropped: the moment stays armed for its own phase.
    if (phase !== 'free' && !ALLOWED[phase].has(id)) continue;
    if (!(magicTurn ? hasMet(progress, 'luck') : isTrue(id, now))) continue;
    if (!UNPACED.has(id) && now.since !== undefined && now.since < CARD_GAP) continue;
    return { id, as: CARDS.has(id) || magicTurn ? 'card' : 'toast' };
  }
  return null;
}

/**
 * The chips that are showing: every non-interrupting moment that is true and
 * has not been opened yet, in the drip's own order.
 */
export const newDots = (now: Moment, progress: Progress): readonly TeachId[] =>
  // None while the first run is being walked (2026-10-12, Marc: nothing else
  // "in the way"), then under the same pace as the cards (2026-10-12, Marc: _"we start with a
  // magic tile"_): a chip over a first screen that already has a story, a card
  // and a sentence is the clutter this pace exists to prevent.
  guided(progress) || (now.since !== undefined && now.since < CARD_GAP)
    ? []
    : ORDER.filter((id) => DOTS.has(id) && !hasMet(progress, id) && isTrue(id, now));

/**
 * The chips a run has offered, in the order they came, and not yet opened
 * (2026-10-12, Marc's second screenshot: _"we have two newdots … and if i press
 * one, the other gets deleted"_). The pace decides when a chip may APPEAR, not
 * whether one that has appeared may stay: opening one chip's card had marked
 * the game as having just spoken, and the pace hid the other for four
 * placements. `offered` is what has been shown; `fresh` is what `newDots` says
 * now; a chip leaves the list only when its lesson has been met.
 */
export const offerDots = (
  offered: readonly TeachId[],
  fresh: readonly TeachId[],
  progress: Progress,
): readonly TeachId[] =>
  [...offered, ...fresh.filter((id) => !offered.includes(id))].filter(
    (id) => !hasMet(progress, id),
  );

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
      return s.coach.place;
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
    case 'reroll': {
      const row = now.hud.spends.find((spend) => spend.on === 'reroll');
      return row === undefined ? null : s.rerollHint(row.cost);
    }
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
    case 'goal':
      // Right behind the story by `ORDER`, on the same first frame: what this
      // place is, then what to do in it.
      return true;
    case 'place':
      // The first thing anyone sees: there is somewhere to put a tile.
      return !placed && board.cells.some((c) => c.legal);
    case 'ripe':
      return hud.ripeCount > 0;
    case 'pop':
      return hud.canHarvest;
    case 'caravan':
      // In town AND something to pop: the card says "that is the moment to
      // try a pop", so it fires when a pop can be tried — and never ahead of
      // POP's own card, whose moment is exactly `canHarvest`.
      return hud.caravan === 'town' && hud.canHarvest;
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
    case 'reroll':
      // A poor hand AND the luck to do something about it: a hint about a
      // button that cannot be pressed is a taunt.
      return hud.poorHand && hud.spends.some((spend) => spend.on === 'reroll' && spend.affordable);
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
      // The clock's last placement, or — in a run with no clock, which is
      // most of them — fewer tiles than the next one costs. It read only the
      // first, so it never fired where there is no clock (2026-10-12).
      return (hud.left !== null && hud.left <= 1) || (hud.tiles > 0 && hud.tiles < hud.cost);
    case 'toured':
    case 'walked':
      // Written by the first pop that lands, never by a moment.
      return false;
  }
}
