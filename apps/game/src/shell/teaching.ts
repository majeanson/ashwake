import { type Tuning } from '@content/tuning';
import { neighbourKeys, type HexKey } from '@engine/hex';
import { hasMet, meet, type Progress, type TeachId } from '@meta/progress';
import type { BoardView, CellView } from '@render/Renderer';
import { namesOf, type Theme } from '@theme/tokens';
import type { Strings } from '@text/Strings';
import { LESSON_FOR_REWARD, type LessonId, type RowKey } from '@view/lessons';
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

type Phase = 'walk' | 'tour' | 'free';

/**
 * A CUE is a control the game lights while it talks about it (2026-10-15, Marc:
 * _"if we showcase some actions or concepts, highlight them briefly until the
 * user taps"_). The ring is CSS (`[data-cue]` on the shell in `ui.css`); the
 * ids are what that stylesheet and `CUE_SELECTOR` both answer to.
 *
 * A cue is for a thing the sentence NAMES: a glow on a control the words never
 * mention is a mystery with a ring on it. `hand` is the next tiles, `tiles`
 * `points` and `cost` are the stat row's, `pop` `purse` `lens` the cluster's.
 */
export type CueId = 'hand' | 'pop' | 'tiles' | 'points' | 'cost' | 'purse' | 'lens';

/** Where each cue lives in the DOM, for the tap that puts it out. */
export const CUE_SELECTOR: Readonly<Record<CueId, string>> = {
  hand: '[data-hud="hand"] .tile',
  pop: '[data-action="pop"]',
  tiles: '[data-stat="tiles"]',
  points: '[data-stat="points"]',
  cost: '[data-stat="cost"]',
  purse: '[data-action="purse"]',
  lens: '[data-action="lens"]',
};

/**
 * How long a cue stays lit if nobody taps it, in ms; 0 turns cues off, as every
 * system's dial does. Brief on purpose: a glow that never leaves is chrome.
 */
export const CUE_MS: number = 8000;

/**
 * One moment, everything the game knows about it, in one place (2026-10-13).
 *
 * This was nine hand-synced lists — the order, the card set, the chip set, the
 * unpaced set, the per-phase allowance, `isTrue`'s switch, `toastLine`'s
 * switch, and `tourTarget`'s copy of the cell predicates — and a new moment
 * had to land in each by hand. `TEACH_IDS` coverage is a test now
 * (`teaching.test.ts`), so a moment missing from this table fails loudly.
 */
type Slot = {
  readonly id: TeachId;
  /**
   * Card, toast or chip. **Which ones interrupt:** a concept earns a card; a
   * consequence gets a line.
   *
   * A chip is THE ONES THAT DO NOT INTERRUPT (2026-10-12, Marc: _"card with new
   * dot"_): a magic tile, a unique tile, a territory and a shrine are each
   * worth a card and none is worth stopping the game for: the player can be
   * playing perfectly well without knowing what they are. They wait as a NEW
   * chip over the hand, and the card opens when it is tapped. Nothing FIRES
   * them, and `nextLesson` passes over them, so a chip nobody has tapped never
   * holds back a lesson behind it.
   *
   * Every card here must be one something DRAWS (2026-09-30): COLOURS sat in
   * the card set with no lesson for a month, so `LessonCard` drew nothing,
   * nothing told it, and LAST GASP behind it never spoke.
   */
  readonly as: 'card' | 'toast' | 'chip';
  /**
   * The lesson this moment opens, and the row of it to lead, where it is not
   * the moment's own id (2026-10-13). The ledger names a MOMENT and the
   * registry names a CONCEPT; they were the same word until THE FOUR GROUNDS
   * took over the `colours` moment's lesson, and THE MAP took the fog's six.
   * Absent means the lesson with the slot's own id. Read through `opensAt`,
   * never directly.
   *
   * The row is a function where the slot cannot know it from its id: the map
   * card opens at the row of whichever destination it found on the board,
   * through the same predicate its `when` and `target` use.
   *
   * A toast carries `opens` too, though nothing opens it: it says which
   * concept the moment belongs to.
   */
  readonly opens?: {
    readonly lesson: LessonId;
    readonly row?: RowKey | ((board: BoardView) => RowKey | undefined);
  };
  /**
   * A moment that must already have been told before this one is OFFERED
   * (2026-10-13): the fog's chips wait for THE MAP, so a chip never explains
   * a kind before the concept it belongs to. It holds a chip back, not a card
   * the tour forces — see `nextLesson`'s exception for the territory.
   */
  readonly after?: TeachId;
  /**
   * Other moments that dismissing this card tells with it (2026-10-13), for a
   * card that delivers two. The purse's card is LUCK's, so it tells `luck`.
   * (The walk's RIPE card told `pop` too until 2026-10-14, when the two cards
   * became short and separate again.) `teaching.test.ts` lists the companions
   * explicitly.
   */
  readonly tells?: readonly TeachId[];
  /** The control this moment talks about, lit once it has been said (`cueOf`). */
  readonly cue?: CueId;
  /** The phase of the first run in which this may still speak. Absent: only once the run is free. */
  readonly phase?: 'walk' | 'tour';
  /**
   * Present (as `false`) when the pace never holds this back. The opening
   * beats come before there is a pace to keep; RIPE and POP are the two ideas
   * the game cannot be played without, and waiting four placements to hear
   * what a ripe tile is would be the confusion the gate exists to cure; THE
   * FOUR GROUNDS is what the first placement is a choice between, so it is told
   * the moment there is one; LAST GASP is the one lesson whose moment passes
   * with the next placement.
   */
  readonly paced?: false;
  /**
   * Whether the moment is happening.
   *
   * Every one reads the CURRENT view and nothing else — no diffing, no
   * remembered previous frame. A moment that is true for as long as its
   * condition holds is a moment that cannot be missed because a frame was
   * dropped, and the ledger is what stops it firing twice.
   */
  readonly when: (now: Moment) => boolean;
  /**
   * What `when` is while the first run is being guided (the walk and the tour),
   * where that is stricter (2026-10-17): a lesson about a place is told when the
   * player is ONE TILE from it, not whenever it is in view.
   */
  readonly guidedWhen?: (now: Moment) => boolean;
  /**
   * The hex a lesson is ABOUT, where a lesson is about a hex at all (see
   * `tourTarget`). A slot about a cell asks `when` and `target` through ONE
   * cell predicate, so the card and the trip cannot drift apart.
   */
  readonly target?: (board: BoardView) => HexKey | null;
  /**
   * The toast's own words — one line per toast-class moment (2026-09-03). Null
   * means the moment's evidence is gone from the board: the caller says nothing
   * and the ledger keeps the moment armed. See `toastLine`.
   */
  readonly line?: (now: Moment, t: Tuning, theme: Theme, s: Strings) => string | null;
};

/** A slot whose moment is a cell on the board: `when` and `target` share `p`. */
const onCell = (p: (c: CellView) => boolean): Pick<Slot, 'when' | 'target'> => ({
  when: (now) => now.board.cells.some(p),
  target: (board) => board.cells.find(p)?.key ?? null,
});

/** The four destinations, all one test — a fifth reward kind lands here or nowhere. */
const landmark =
  (id: 'cache' | 'site' | 'shrine' | 'territory') =>
  (c: CellView): boolean =>
    c.kind === 'landmark' && !c.claimed && c.landmark === id;

/**
 * A destination of this kind that the very next tile can claim: a legal hex
 * touches it. It is a BEACON at that moment, not a revealed cell — placing a
 * tile reveals its neighbours and claims a touching destination in the same
 * move, so one is never seen unclaimed on revealed ground (2026-10-17: the
 * first version asked for a revealed one and so could never fire).
 */
const withinOneTile =
  (kind: 'cache' | 'site') =>
  (board: BoardView): CellView | undefined => {
    const legal = new Set(board.cells.filter((c) => c.legal).map((c) => c.key));
    return board.cells.find(
      (c) =>
        landmark(kind)(c) && !c.remembered && neighbourKeys(c.q, c.r).some((k) => legal.has(k)),
    );
  };

/** The tour's way of telling a kind: when the next tile reaches it, and the
 *  camera goes to that one rather than the first in the list. */
const oneTileAway = (kind: 'cache' | 'site'): Pick<Slot, 'guidedWhen' | 'target'> => ({
  guidedWhen: (now) => withinOneTile(kind)(now.board) !== undefined,
  target: (board) => (withinOneTile(kind)(board) ?? board.cells.find(landmark(kind)))?.key ?? null,
});

/** A destination in view that has not been reached, whatever it pays: THE
 *  MAP's moment, and the one cell its card opens at and flies to. */
const anyDestination = (c: CellView): boolean =>
  c.kind === 'landmark' && !c.claimed && c.landmark !== null;

/** The kinds that have a moment of their own to be told (a find has none). */
const KIND_MOMENT: Readonly<Partial<Record<string, TeachId>>> = {
  cache: 'cache',
  site: 'site',
  shrine: 'shrine',
  territory: 'territory',
};

/**
 * Every moment, in the order they are asked.
 *
 * Roughly the order a first run meets them, with the two that describe the
 * board's own state — a tile ripening, a pocket ready — ahead of the ones that
 * describe the economy, because a player who does not know what RIPE means
 * cannot use anything they are told about cost.
 *
 * ## What `target` deliberately leaves out
 *
 * **POP's second half**: the walk's one POP card is the RIPE moment, and it
 * flies to the first ripe tile. The pop moment itself (`canHarvest`) has no
 * card of its own any more, so there is no second trip to the same pocket.
 *
 * **RARE and UNIQUE**, which are in the hand; **LUCK, THE PURSE, RELICS, THE
 * COLOURS, the story** and the cost line, which are about the run rather than
 * about ground.
 *
 * ## WALL and FIELD were the interesting omission, and they are IN (2026-09-08)
 *
 * Marc, 2026-09-06, of the shrine: _"zoom on it then zoom back where the user
 * was (same view) so its clearer"_; and 2026-09-08, of the rest: _"yes do the
 * same for caches, sites and territories and other concepts on the map"_.
 *
 * They are the two toast-class places — a line beside a game still in motion,
 * spoken on the quiet beat after a placement — and were argued out on the
 * strength of the oldest camera ruling here, Marc, 2026-08-29: _"when we
 * place a tile, make sure the map doesnt move and stays stationary, it always
 * zoom in or zoom out a bit and its annoying."_ Put to him with that argument
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
 * player's hand is still moving. If either reads as the map running away,
 * dropping their `target` is one line each.
 */
export const SCHEDULE: readonly Slot[] = [
  {
    id: 'story',
    as: 'card',
    // A SaidCard delivers it (`App`), but the manual's opening is its home.
    opens: { lesson: 'expedition' },
    phase: 'walk',
    paced: false,
    // Ahead of PLACE by construction: true from the first frame of any run,
    // board geometry included, so it is the one card a stranger cannot fail to
    // meet.
    when: () => true,
  },
  {
    id: 'goal',
    as: 'card',
    opens: { lesson: 'expedition' },
    phase: 'walk',
    paced: false,
    // Right behind the story, on the same first frame: what this place is, then
    // what to do in it.
    when: () => true,
  },
  {
    id: 'place',
    cue: 'hand',
    as: 'toast',
    opens: { lesson: 'expedition' },
    phase: 'walk',
    paced: false,
    // The first thing anyone sees: there is somewhere to put a tile.
    when: ({ placed, board }) => !placed && board.cells.some((c) => c.legal),
    line: (_now, _t, _theme, s) => s.coach.place,
  },
  // TWO SHORT CARDS, back to back (2026-10-14, Marc: the one merged card was a
  // wall of text): the first ripe tile raises RIPE's, and a pocket that can be
  // cashed raises POP's right behind it. They are two lessons again, so each
  // card is the length of its concept.
  {
    id: 'ripe',
    as: 'card',
    opens: { lesson: 'ripe' },
    phase: 'walk',
    paced: false,
    // `target` and `when` differ here on purpose: the moment is the HUD's count
    // of ripe tiles, the place is the first ripe cell. `tourTarget.test.ts`
    // pins that they agree over real boards.
    when: ({ hud }) => hud.ripeCount > 0,
    target: (board) => board.cells.find((c) => c.ripe)?.key ?? null,
  },
  {
    id: 'pop',
    cue: 'pop',
    as: 'card',
    opens: { lesson: 'pop' },
    phase: 'walk',
    paced: false,
    when: ({ hud }) => hud.canHarvest,
  },
  // The caravan's card, the first time it is IN TOWN with a pocket to try
  // (2026-09-30). It is a free-phase card, so the walk's POP card has always
  // been told by then: the card about a reason to pop never lands before the
  // card about popping.
  {
    id: 'caravan',
    as: 'card',
    // In town AND something to pop: the card says "that is the moment to try a
    // pop", so it fires when a pop can be tried.
    when: ({ hud }) => hud.caravan === 'town' && hud.canHarvest,
  },
  {
    id: 'costRise',
    cue: 'cost',
    as: 'toast',
    opens: { lesson: 'end' },
    when: ({ hud }) => hud.cost > 1,
    line: (now, t, _theme, s) => statNote('cost', now.hud, t, s),
  },
  // THE MAP (2026-10-13): the first unclaimed destination in view tells the
  // concept, at the row of the kind it found; the kinds that come after it are
  // chips, offered once the concept has been told. Dismissing it tells the
  // concept AND that kind (`toldBy`).
  {
    id: 'map',
    as: 'card',
    opens: {
      lesson: 'map',
      row: (board) => {
        const cell = board.cells.find(anyDestination);
        return cell?.landmark == null ? undefined : LESSON_FOR_REWARD[cell.landmark].row;
      },
    },
    ...onCell(anyDestination),
  },
  {
    id: 'cache',
    as: 'chip',
    // Told on the tour like the site, one tile before it (2026-10-17, Marc:
    // caches showed on the horizon and said nothing).
    phase: 'tour',
    paced: false,
    after: 'map',
    opens: { lesson: 'map', row: 'cache' },
    ...onCell(landmark('cache')),
    ...oneTileAway('cache'),
  },
  {
    id: 'site',
    as: 'chip',
    // In the tour a site is a card like a territory (2026-10-16, Marc: explain
    // the site when the tutorial approaches it): see `nextLesson`.
    phase: 'tour',
    // Unpaced (2026-10-17, Marc: a card the player has never seen and needs
    // disregards the pace): its moment is one tile wide, and four placements of
    // waiting is a site claimed unexplained.
    paced: false,
    after: 'map',
    opens: { lesson: 'map', row: 'site' },
    ...onCell(landmark('site')),
    ...oneTileAway('site'),
  },
  {
    id: 'shrine',
    as: 'chip',
    after: 'map',
    opens: { lesson: 'map', row: 'shrine' },
    ...onCell(landmark('shrine')),
  },
  // In the tour a territory is a card, not a chip: see `nextLesson`.
  {
    id: 'territory',
    as: 'chip',
    phase: 'tour',
    paced: false,
    after: 'map',
    opens: { lesson: 'map', row: 'territory' },
    ...onCell(landmark('territory')),
  },
  {
    id: 'wall',
    as: 'toast',
    // The wall's own row in THE EXPEDITION: the toast and the row are one sentence.
    opens: { lesson: 'expedition', row: 'wall' },
    ...onCell((c) => c.kind === 'wall'),
    line: (_now, _t, _theme, s) => s.lesson.expedition.row.wall.core,
  },
  {
    id: 'field',
    as: 'toast',
    // Native ground is the territory row's depth.
    opens: { lesson: 'map', row: 'territory' },
    ...onCell((c) => c.kind === 'empty' && c.native !== null),
    line: (now, _t, theme, s) => {
      const cell = now.board.cells.find((c) => c.kind === 'empty' && c.native !== null);
      return cell?.native == null ? null : s.view.hex.native(namesOf(theme, s.locale)[cell.native]);
    },
  },
  // In the tour MAGIC is a card, told once LUCK has been: see `nextLesson`.
  {
    id: 'rare',
    as: 'chip',
    phase: 'tour',
    opens: { lesson: 'magic', row: 'magic' },
    when: ({ hud }) => hud.draft.some((c) => c.rarity === 'magic'),
  },
  {
    id: 'rareUnique',
    as: 'chip',
    opens: { lesson: 'magic', row: 'unique' },
    when: ({ hud }) => hud.draft.some((c) => c.rarity === 'unique'),
  },
  {
    id: 'lens',
    cue: 'lens',
    as: 'toast',
    opens: { lesson: 'map', row: 'lens' },
    // Only worth explaining once there is enough board to sort through.
    when: ({ board }) => board.cells.filter((c) => c.kind === 'tile').length >= 6,
    line: (_now, _t, _theme, s) => s.lensHint,
  },
  { id: 'luck', cue: 'purse', as: 'card', phase: 'tour', when: ({ hud }) => hud.luck > 0 },
  {
    id: 'reroll',
    cue: 'purse',
    as: 'toast',
    opens: { lesson: 'luck' },
    // A poor hand AND the luck to do something about it: a hint about a button
    // that cannot be pressed is a taunt.
    when: ({ hud }) =>
      hud.poorHand && hud.spends.some((spend) => spend.on === 'reroll' && spend.affordable),
    line: (now, _t, _theme, s) => {
      const row = now.hud.spends.find((spend) => spend.on === 'reroll');
      return row === undefined ? null : s.rerollHint(row.cost);
    },
  },
  {
    id: 'purse',
    cue: 'purse',
    as: 'card',
    // The purse's card IS the LUCK lesson's (2026-10-13), its rows the buttons,
    // so reading it tells LUCK too: the tour's own LUCK card must not come
    // back with the same words once this one has been read.
    opens: { lesson: 'luck' },
    tells: ['luck'],
    /*
     * Fired by the player OPENING the purse, not by having one, so it is
     * never true here — see `App`'s `onPurse`, which raises LUCK's card and
     * tells this moment when it is dismissed.
     *
     * That handler marked it told and showed NOTHING until 2026-08-30, so
     * this `false` was load-bearing for a lesson that could not fire from
     * anywhere. A moment that is always false is only honest while
     * something else owns the moment; when nothing does, it is a lesson
     * spending its own ledger entry to say nothing.
     */
    when: () => false,
  },
  // The first relic no longer interrupts (2026-10-13, Marc): a chip that opens
  // THE RUN'S END at its relic row.
  {
    id: 'relic',
    as: 'chip',
    opens: { lesson: 'end', row: 'relic' },
    when: ({ hud }) => hud.relics > 0,
  },
  {
    id: 'colours',
    cue: 'hand',
    opens: { lesson: 'grounds' },
    as: 'card',
    phase: 'walk',
    paced: false,
    when: ({ placed, hud }) => placed && hud.draft.length > 0,
  },
  {
    id: 'lastGasp',
    cue: 'tiles',
    as: 'toast',
    opens: { lesson: 'end' },
    paced: false,
    // The clock's last placement, or — in a run with no clock, which is most of
    // them — fewer tiles than the next one costs. It read only the first, so it
    // never fired where there is no clock (2026-10-12).
    when: ({ hud }) =>
      (hud.left !== null && hud.left <= 1) || (hud.tiles > 0 && hud.tiles < hud.cost),
    line: (_now, _t, _theme, s) => s.lastGaspRule,
  },
];

/**
 * The lesson a moment's card, chip or term opens, and the row of it to lead:
 * its slot's `opens`, else its own id. Without a board a row that depends on
 * one is left unsaid (a chip's row never does).
 */
export function opensAt(
  id: TeachId,
  board?: BoardView,
): { readonly lesson: LessonId; readonly row?: RowKey } {
  const opens = SCHEDULE.find((slot) => slot.id === id)?.opens;
  if (opens === undefined) return { lesson: id };
  const row =
    typeof opens.row === 'function'
      ? board === undefined
        ? undefined
        : opens.row(board)
      : opens.row;
  return row === undefined ? { lesson: opens.lesson } : { lesson: opens.lesson, row };
}

/**
 * Every moment that dismissing this card (or opening this chip) tells
 * (2026-10-13). Usually the one: but THE MAP's card tells the concept AND the
 * kind of destination it showed, so that kind does not come back as a chip;
 * and a kind's card forced on the tour (a territory) tells the concept it
 * belongs to, because the player has now seen the map.  A card with `tells` (the purse's, which is LUCK's too)
 * tells its companions. A toast tells only itself.
 */
export function toldBy(id: TeachId, board: BoardView): readonly TeachId[] {
  const slot = SCHEDULE.find((s) => s.id === id);
  if (slot === undefined || slot.as === 'toast') return [id];
  if (slot.tells !== undefined) return [id, ...slot.tells];
  if (slot.opens?.lesson !== 'map') return [id];
  if (id !== 'map') return [id, 'map'];
  const kind = KIND_MOMENT[board.cells.find(anyDestination)?.landmark ?? ''];
  return kind === undefined ? [id] : [id, kind];
}

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
 *
 * What may still speak in each is the slot's `phase`. Held back, not dropped.
 */
export const phaseOf = (progress: Progress): Phase =>
  !hasMet(progress, 'walked') ? 'walk' : !hasMet(progress, 'toured') ? 'tour' : 'free';

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
 * like each slot's `when`: no remembered frame, so a step cannot be missed.
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

/** What each coach step points at: the control its sentence tells the player to use. */
const STEP_CUE: Readonly<Record<CoachStep, CueId>> = {
  place: 'hand',
  match: 'hand',
  grow: 'tiles',
  pop: 'pop',
  build: 'tiles',
  bank: 'pop',
  end: 'tiles',
};

/** The control a coach step points at. */
export const stepCue = (step: CoachStep): CueId => STEP_CUE[step];

/** The control a moment talks about, or null where it is about no control. */
export const cueOf = (id: TeachId): CueId | null =>
  SCHEDULE.find((slot) => slot.id === id)?.cue ?? null;

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
 * stood in front of every card behind it in `SCHEDULE` — `wall` alone blocked
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
  for (const slot of SCHEDULE) {
    const { id } = slot;
    // In the tour MAGIC and a TERRITORY are cards, not chips: a chip nobody
    // taps is a lesson that never happens. MAGIC is told once LUCK has been,
    // because a magic tile cannot be dealt on cue and so the concept is taught
    // on its own turn; a territory is told as it comes into view (2026-10-13,
    // Marc: _"explain territories as they spawn on tiles too"_), and the card's
    // dismissal flies the camera to it like every place's does. That card is
    // THE MAP at the territory row (2026-10-13), so it tells the territory AND
    // the concept (`toldBy`), and so it is not held for `after`, which only a
    // chip waits on (`afterMet`): it is the card that satisfies it.
    const magicTurn = phase === 'tour' && id === 'rare';
    const tourCard =
      magicTurn || (phase === 'tour' && (id === 'territory' || id === 'site' || id === 'cache'));
    if (hasMet(progress, id) || (slot.as === 'chip' && !tourCard)) continue;
    // Held back, not dropped: the moment stays armed for its own phase.
    if (phase !== 'free' && slot.phase !== phase) continue;
    const happening =
      phase !== 'free' && slot.guidedWhen !== undefined ? slot.guidedWhen(now) : slot.when(now);
    if (!(magicTurn ? hasMet(progress, 'luck') : happening)) continue;
    if (slot.paced !== false && now.since !== undefined && now.since < CARD_GAP) continue;
    return { id, as: slot.as === 'toast' ? 'toast' : 'card' };
  }
  return null;
}

/** Whether the moment a slot waits on (`after`) has been told; no `after`, always. */
const afterMet = (id: TeachId, progress: Progress): boolean => {
  const after = SCHEDULE.find((slot) => slot.id === id)?.after;
  return after === undefined || hasMet(progress, after);
};

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
    : SCHEDULE.filter(
        (s) =>
          s.as === 'chip' && !hasMet(progress, s.id) && afterMet(s.id, progress) && s.when(now),
      ).map((s) => s.id);

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
    (id) => !hasMet(progress, id) && afterMet(id, progress),
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
 * armed. A card-class id has no line: the card is its voice.
 */
export const toastLine = (
  id: TeachId,
  now: Moment,
  t: Tuning,
  theme: Theme,
  s: Strings,
): string | null => SCHEDULE.find((slot) => slot.id === id)?.line?.(now, t, theme, s) ?? null;

/**
 * The hex a lesson is ABOUT, where a lesson is about a hex at all.
 *
 * `find` over the slot's cell predicate in the same order as its `when`'s
 * `some`, so the card that fires and the hex it flies to are the same cell,
 * sharing one predicate (`onCell`) rather than a copy that could drift.
 * `tourTarget.test.ts` pins that a target exists exactly when the moment is
 * true. Null for every lesson that is not about a place.
 */
export const tourTarget = (id: TeachId, board: BoardView): HexKey | null =>
  SCHEDULE.find((slot) => slot.id === id)?.target?.(board) ?? null;

/**
 * What opening the purse does (2026-10-13). The purse's card IS the LUCK
 * lesson's, so a device the tour has already told LUCK is not told it twice:
 * the open marks `purse` silently and raises nothing. Opened before that, the
 * purse raises the card (whose dismissal tells `purse` and `luck`). Already told,
 * nothing.
 */
export const purseOpened = (progress: Progress): 'card' | 'silent' | null =>
  hasMet(progress, 'purse') ? null : hasMet(progress, 'luck') ? 'silent' : 'card';

/** Mark one told. Idempotent, so a double-dismiss cannot double-write. */
export const told = (progress: Progress, id: TeachId): Progress => meet(progress, id);
