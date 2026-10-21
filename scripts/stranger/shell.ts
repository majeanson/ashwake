import { type Colour, type Tuning } from '../../packages/core/src/content/tuning';
import { type HexKey } from '../../packages/core/src/engine/hex';
import { canSpend, newRun, reduce } from '../../packages/core/src/engine/reduce';
import {
  canPlaceNow,
  harvestValue,
  legalPlacements,
  steerDrawsAfterHand,
} from '../../packages/core/src/engine/rules';
import type { GameState, HarvestChoice, Spend } from '../../packages/core/src/engine/state';
import {
  EMPTY_PROGRESS,
  hasMet,
  type Progress,
  type TeachId,
} from '../../packages/core/src/meta/progress';
import { newWorld } from '../../packages/core/src/meta/world';
import type { BoardView } from '../../packages/core/src/render/Renderer';
import type { Strings } from '../../packages/core/src/text/Strings';
import type { Theme } from '../../packages/core/src/theme/tokens';
import {
  cardDraws,
  LESSONS,
  lessonCardDefine,
  lessonDetail,
  lessonLines,
  lessonName,
  lessonOf,
  lessonTerms,
  type Lesson,
  type LessonId,
} from '../../packages/core/src/view/lessons';
import {
  describeHexOf,
  harvestNote,
  pocketNote,
  renderContext,
  statNote,
  toBoardView,
  toHudView,
  type HudView,
  type TipRow,
} from '../../packages/core/src/view/view';
import { economyFor } from '../../apps/game/src/shell/economy';
import { onceARun, type OnceId } from '../../apps/game/src/shell/onceARun';
import {
  coachStep,
  mustPop,
  nextLesson,
  opensAt,
  purseOpened,
  shows,
  sinceSpoke,
  toastLine,
  told,
  toldBy,
  type Moment,
} from '../../apps/game/src/shell/teaching';

/**
 * The shell, without a screen.
 *
 * `App.tsx` is the one place a run, the teaching ledger and the player's
 * gestures meet, and it is React. This file is the same meeting without React:
 * a `Table` is the run plus what `App` keeps beside it (`progress`, `spokeAt`,
 * the undo slot, the tapped pocket, the once-a-run set), a `Gesture` is one
 * thing a thumb can do (`INTERACTIONS.md`), and `apply` is what the shell does
 * with it — the refusal while the walk waits for a pop, the receipt a harvest
 * prints, then the drip in `App`'s own order: a card, then on a quiet beat a
 * toast, else the coach, else a once-a-run line.
 *
 * Nothing here decides what is TRUE of the game. The rules are `reduce`, the
 * words are `text/`, the moments are `shell/teaching.ts`; this file only
 * calls them in the order the phone does, so that what a stranger reads here
 * is what a stranger reads there — minus the pictures, which it says so.
 */

/** What a stranger is given to learn from. */
export type Condition = 'drip' | 'ask' | 'flood' | 'silent';
export const CONDITIONS: readonly Condition[] = ['drip', 'ask', 'flood', 'silent'];

/** Whether the game speaks first: the cards, the toasts, the coach, the once-a-run lines. */
export const speaksFirst = (c: Condition): boolean => c === 'drip' || c === 'ask';
/** Whether the manual can be opened on demand. */
const hasManual = (c: Condition): boolean => c === 'ask';
/** Whether the whole manual is handed over before the first placement. */
const floodsManual = (c: Condition): boolean => c === 'flood';

export type Table = {
  readonly condition: Condition;
  readonly state: GameState;
  readonly progress: Progress;
  /** Placements at which the game last spoke — `App`'s `spokeAt`. */
  readonly spokeAt: number | null;
  /** The state before the last placement, while UNDO may take it back. */
  readonly undo: GameState | null;
  /** The ripe tile last tapped, which prices its pocket — `harvestAt`. */
  readonly asked: HexKey | null;
  readonly saidOnce: ReadonlySet<OnceId>;
  /** The coach step last said, so a step is said once — `App`'s `coached`. */
  readonly coached: string | null;
  /** Reducer steps, as the sim counts them. */
  readonly steps: number;
  /** Every gesture made at least once, for the untaught list. */
  readonly used: ReadonlySet<GestureName>;
};

export type Gesture =
  | { readonly name: 'poser'; readonly index: number; readonly hex: HexKey }
  | { readonly name: 'recolter'; readonly choice: HarvestChoice; readonly hex: HexKey | null }
  | { readonly name: 'toucher'; readonly hex: HexKey }
  | { readonly name: 'garder' }
  | { readonly name: 'annuler' }
  | { readonly name: 'bourse' }
  | { readonly name: 'depenser'; readonly on: Spend; readonly colour: Colour | null }
  | { readonly name: 'caravane'; readonly pick: number }
  | { readonly name: 'stat'; readonly id: StatId }
  | { readonly name: 'manuel'; readonly lesson: LessonId | null };
export type GestureName = Gesture['name'];
export type StatId = 'tiles' | 'points' | 'cost' | 'luck' | 'map' | 'left';
export const GESTURES: readonly GestureName[] = [
  'poser',
  'recolter',
  'toucher',
  'garder',
  'annuler',
  'bourse',
  'depenser',
  'caravane',
  'stat',
  'manuel',
];

/** One thing the game said this turn, and through which door. */
export type Said = {
  readonly kind:
    'card' | 'toast' | 'coach' | 'once' | 'receipt' | 'answer' | 'refused' | 'manual' | 'end';
  readonly text: string;
};

export type Snapshot = { readonly board: BoardView; readonly hud: HudView };

type Turn = {
  readonly table: Table;
  readonly said: readonly Said[];
};

/**
 * The harness's own refusals — the few sentences the phone never needs
 * because its controls cannot be mis-tapped (a hex that is not lit cannot be
 * placed on). Marked with ⟂ so a transcript shows them as the harness's voice.
 */
const REFUSAL = {
  cannotPlace: '⟂ Aucune pose possible en ce moment.',
  noSuchTile: (i: number) => `⟂ Il n’y a pas de tuile [${i}] dans ta main.`,
  notLegal: (hex: HexKey) =>
    `⟂ La case ${hex} n’est pas une arête lumineuse : on ne peut pas poser là.`,
  nothingRipe: '⟂ Rien de mûr à récolter.',
  notRipe: (hex: HexKey) => `⟂ La case ${hex} n’est pas une tuile mûre.`,
  noTreasure: '⟂ Cette poche ne donne pas de trésor.',
  noBurn: '⟂ Le sacrifice n’est pas offert.',
  notShown: '⟂ Ce bouton n’est pas à l’écran.',
  cannotHold: '⟂ Rien à garder en ce moment.',
  nothingToUndo: '⟂ Rien à annuler.',
  cannotAfford: '⟂ Pas assez de CHANCE pour ça.',
  noOffer: '⟂ La caravane n’offre rien en ce moment.',
  noManual: '⟂ Il n’y a pas de manuel dans cette partie.',
  noSuchLesson: '⟂ Le manuel n’a pas de section de ce nom.',
} as const;

export function newTable(condition: Condition, seed: number): Table {
  // A fresh phone's NEW RUN: the home world with nothing earned.
  const tuning = economyFor({ kind: 'home', world: newWorld(seed), progress: EMPTY_PROGRESS });
  return {
    condition,
    state: newRun(seed, tuning),
    progress: EMPTY_PROGRESS,
    spokeAt: null,
    undo: null,
    asked: null,
    saidOnce: new Set(),
    coached: null,
    steps: 0,
    used: new Set(),
  };
}

export function snapshot(table: Table, s: Strings): Snapshot {
  const ctx = renderContext(table.state, table.asked);
  return {
    board: toBoardView(table.state, table.asked, null, [], undefined, ctx),
    hud: toHudView(table.state, s, table.asked, null, ctx),
  };
}

const momentOf = (snap: Snapshot, table: Table): Moment => ({
  board: snap.board,
  hud: snap.hud,
  placed: snap.hud.placements > 0,
  since: sinceSpoke(table.spokeAt, snap.hud.placements),
});

/** Which first-run controls are on screen right now (`shell/teaching.ts`'s `shows`). */
type Controls = {
  readonly purse: boolean;
  readonly cost: boolean;
  readonly hold: boolean;
  readonly caravan: boolean;
  readonly reach: boolean;
};
export const controls = (p: Progress): Controls => ({
  purse: shows('purse', p, null),
  cost: shows('cost', p, null),
  hold: shows('hold', p, null),
  caravan: shows('caravan', p, null),
  reach: shows('reach', p, null),
});

/** The gestures the screen offers this turn. A gesture not offered is refused, as a hidden button would be. */
export function offered(table: Table, snap: Snapshot): readonly GestureName[] {
  const c = controls(table.progress);
  const out: GestureName[] = ['poser', 'toucher', 'stat'];
  if (snap.hud.canHarvest) out.push('recolter');
  if (c.hold && snap.hud.canHold) out.push('garder');
  if (table.undo !== null) out.push('annuler');
  if (c.purse && snap.hud.spends.length > 0) out.push('bourse', 'depenser');
  // The picker is not a first-run control: `App`'s `caravanOpen` reads only
  // `offersWaiting`, so a pocket the caravan takes opens the three wares on a
  // fresh phone too. `reveal('caravan')` gates the ask line alone (the
  // shakedown hid the choice behind it, and a stranger could never pick).
  if (snap.hud.offer !== null) out.push('caravane');
  if (hasManual(table.condition)) out.push('manuel');
  return out;
}

const rowLines = (row: TipRow): string[] => [
  `${row.name === undefined ? '' : `${row.name} : `}${row.text}`,
  ...(row.lines ?? []).map((l) => `${l.head === undefined ? '' : `${l.head} : `}${l.text}`),
];

/**
 * A fired card, as `LessonCard` prints it: the first-contact body, then its
 * rows (led by the row the moment opens, with that row's lines) or the caption
 * of its figure — the picture itself is the one thing this harness cannot show.
 */
function cardText(
  id: TeachId,
  board: BoardView,
  t: Tuning,
  theme: Theme,
  s: Strings,
): string | null {
  // The two opening moments are `SaidCard`s on the phone, not lesson cards:
  // the story, then the game in two sentences (`App`, "THE GAME IN TWO
  // SENTENCES"). They open THE EXPEDITION in the manual, but they do not
  // print it.
  if (id === 'story') return `${s.ui.theStory} — ${s.story.join(' ')}`;
  if (id === 'goal') return `${s.ui.theGoal} — ${s.howItWorks}`;
  const at = opensAt(id, board);
  const lesson = lessonOf(at.lesson);
  if (lesson === undefined) return null;
  const parts = [lessonCardDefine(lesson, t, theme, s)];
  const draws = cardDraws(lesson, at.row);
  if (draws === 'rows' && lesson.rows !== undefined) {
    const rows = lesson.rows(t, theme, s);
    const shown = at.row === undefined ? rows : rows.filter((r) => r.key === at.row);
    for (const row of shown) parts.push(...rowLines(row));
  } else if (draws === 'figure' && lesson.figure !== undefined) {
    parts.push(`[image : ${s.figure[lesson.figure]}]`);
  }
  return `${lessonName(lesson, s)} — ${parts.join(' ')}`;
}

/** One manual section, whole: the lines, the rows, the DETAILS fold. */
function sectionText(lesson: Lesson, t: Tuning, theme: Theme, s: Strings): string {
  const parts = [...lessonLines(lesson, t, theme, s)];
  for (const row of lesson.rows?.(t, theme, s) ?? []) parts.push(...rowLines(row));
  const detail = lessonDetail(lesson, t, theme, s);
  if (detail.length > 0) parts.push(`(Détails : ${detail.join(' ')})`);
  if (lesson.manualFigure !== undefined) parts.push(`[image : ${s.figure[lesson.manualFigure]}]`);
  return `${lessonName(lesson, s)} — ${parts.join(' ')}`;
}

/** The sections the manual prints, in its reading order. */
const manualSections = (): readonly Lesson[] => LESSONS.filter((l) => l.tab !== undefined);

/** The whole manual, for the flood. */
export const wholeManual = (t: Tuning, theme: Theme, s: Strings): string =>
  manualSections()
    .map((l) => sectionText(l, t, theme, s))
    .join('\n\n');

/** The manual's table of contents, or one section. */
function manualText(lesson: LessonId | null, t: Tuning, theme: Theme, s: Strings): string {
  if (lesson === null) {
    return `${s.ui.howToPlay} — sections : ${manualSections()
      .map((l) => lessonName(l, s))
      .join(' · ')}`;
  }
  const found = lessonOf(lesson);
  return found === undefined ? REFUSAL.noSuchLesson : sectionText(found, t, theme, s);
}

/** A word as a reader types it: no accent, no curly apostrophe, no case. */
const plainWord = (x: string): string =>
  x.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, "'").trim().toUpperCase();

/**
 * A manual section as a reader would ask for it: its id, its printed name,
 * or any word a section answers to — a lesson's own terms or one of its
 * rows' (`manuel MUR` opens THE EXPEDITION). The shakedown's `ask` reader
 * typed `L'EXPÉDITION`, `expedition` and `MUR` and opened nothing: the lookup
 * wanted the printed name with its typographic apostrophe, which a tap on a
 * word never has to spell.
 */
export function lessonByName(name: string, s: Strings): LessonId | null {
  if (name.trim() === '') return null;
  // Two passes: the accents kept, then dropped. MÛR (ripe) and MUR (the wall)
  // are one word without them, and a reader who typed the accent meant it.
  const exact = (x: string): string => x.replace(/[’`]/g, "'").trim().toUpperCase();
  for (const read of [exact, plainWord]) {
    const wanted = read(name);
    const found = LESSONS.find(
      (l) =>
        read(l.id) === wanted ||
        read(lessonName(l, s)) === wanted ||
        lessonTerms(l, s).some((term) => read(term) === wanted) ||
        (l.rowHeads?.(s) ?? []).some(
          (row) => read(row.name) === wanted || row.terms.some((term) => read(term) === wanted),
        ),
    );
    if (found !== undefined) return found.id;
  }
  return null;
}

/**
 * The drip, in `App`'s order. A card fires whenever one is due (it is modal on
 * the phone; here it is read and tapped away in the same turn, which is what
 * `tellMoment` does on a dismiss). The rest speaks only on a QUIET beat — a
 * gesture no receipt claimed: one toast, else the coach's line for the step,
 * else a once-a-run line.
 *
 * A table that does not speak first (`flood`, `silent`) still walks the
 * ledger: the moments are marked told at the same beats, so the first run
 * reveals its controls on the same schedule (`shows` reads the ledger — the
 * purse waits for LUCK's moment) and `walked`/`toured` fall where they fall.
 * Only the words are dropped. The shakedown run found the purse hidden for a
 * whole silent game, 301 luck unspent, because this did not hold.
 */
function drip(table: Table, snap: Snapshot, s: Strings, theme: Theme, quiet: boolean): Turn {
  if (snap.hud.ended) return { table, said: [] };
  const talk = speaksFirst(table.condition);
  const said: Said[] = [];
  let progress = table.progress;
  let spokeAt = table.spokeAt;
  let coached = table.coached;
  let saidOnce = table.saidOnce;
  const t = table.state.tuning;
  const now = (): Moment => ({
    board: snap.board,
    hud: snap.hud,
    placed: snap.hud.placements > 0,
    since: sinceSpoke(spokeAt, snap.hud.placements),
  });

  // Cards chain: dismissing one (`tellMoment`) recomputes `teach`, and an
  // unpaced card that is due shows at once — the story, then the goal, on the
  // first frame. A paced card waits `CARD_GAP` placements, which `since` holds
  // at 0 after a card, so the chain ends on its own. The bound is the
  // schedule's length; a loop past it would be a card told and not marked.
  for (let i = 0; i < 16; i++) {
    const due = nextLesson(now(), progress);
    if (due === null || due.as !== 'card') break;
    const text = cardText(due.id, snap.board, t, theme, s);
    progress = toldBy(due.id, snap.board).reduce(told, progress);
    spokeAt = snap.hud.placements;
    if (talk && text !== null) said.push({ kind: 'card', text });
  }

  if (quiet) {
    let spoke = false;
    const next = nextLesson(now(), progress);
    if (next !== null && next.as === 'toast') {
      const line = toastLine(next.id, now(), t, theme, s);
      if (line !== null) {
        progress = told(progress, next.id);
        spokeAt = snap.hud.placements;
        if (talk) said.push({ kind: 'toast', text: line });
        spoke = true;
      }
    }
    if (talk && !spoke) {
      const step = coachStep(now(), progress);
      if (step !== null && step !== coached) {
        coached = step;
        said.push({ kind: 'coach', text: s.coach[step] });
        if (step === 'end') progress = told(progress, 'lastGasp');
        spoke = true;
      }
    }
    if (talk && !spoke) {
      const once = onceARun(
        { state: table.state, hud: snap.hud, reachAtStart: null, said: saidOnce },
        s,
      );
      if (once !== null) {
        saidOnce = new Set([...saidOnce, once.id]);
        said.push({ kind: 'once', text: once.text });
      }
    }
  }

  return { table: { ...table, progress, spokeAt, coached, saidOnce }, said };
}

/**
 * The run's first breath: the drip's own opening — the story, the goal, the
 * walk's first line — on a quiet beat. The flood hands the story, the goal and
 * the whole manual over here instead, and the silent table says nothing.
 */
export function begin(table: Table, s: Strings, theme: Theme): Turn {
  const snap = snapshot(table, s);
  const t = table.state.tuning;
  if (floodsManual(table.condition)) {
    // The ledger still walks (story, goal, place told), so the reveal
    // schedule is the phone's; the words are the whole manual instead.
    const walked = drip(table, snap, s, theme, true);
    return {
      table: walked.table,
      said: [
        { kind: 'card', text: cardText('story', snap.board, t, theme, s) ?? '' },
        { kind: 'card', text: cardText('goal', snap.board, t, theme, s) ?? '' },
        { kind: 'manual', text: wholeManual(t, theme, s) },
      ],
    };
  }
  return drip(table, snap, s, theme, true);
}

const spentLine = (
  before: GameState,
  after: GameState,
  on: Spend,
  colour: Colour | null,
  theme: Theme,
  s: Strings,
): string => {
  const t = before.tuning;
  const paid = before.luck - after.luck;
  switch (on) {
    case 'reroll':
      return s.spent.reroll(paid);
    case 'steer': {
      const name = colour === null ? '' : theme.terrainNames[s.locale][colour];
      const draws = steerDrawsAfterHand(t);
      return (t.steerSure ? s.spent.steerSure : s.spent.steer)(name, draws, paid);
    }
    case 'forge':
      return s.spent.forge(paid);
    case 'tithe':
      return s.spent.tithe(paid, after.relics - before.relics);
  }
};

/** One gesture, as the shell takes it. */
export function apply(table: Table, g: Gesture, s: Strings, theme: Theme): Turn {
  const snap = snapshot(table, s);
  const c = controls(table.progress);
  const t = table.state.tuning;
  let next: Table = { ...table, used: new Set([...table.used, g.name]) };
  const said: Said[] = [];
  const refuse = (text: string): Turn => ({ table: next, said: [{ kind: 'refused', text }] });
  const answer = (text: string, kind: Said['kind'] = 'answer'): Turn => ({
    table: next,
    said: [{ kind, text }],
  });

  switch (g.name) {
    case 'poser': {
      if (mustPop(momentOf(snap, table), table.progress)) return refuse(s.coach.popFirst);
      if (!canPlaceNow(table.state)) return refuse(REFUSAL.cannotPlace);
      if (table.state.draft[g.index] === undefined) return refuse(REFUSAL.noSuchTile(g.index));
      if (!legalPlacements(table.state.cells, t).includes(g.hex))
        return refuse(REFUSAL.notLegal(g.hex));
      const before = table.state;
      const state = reduce(reduce(before, { type: 'SELECT', index: g.index }), {
        type: 'PLACE',
        hex: g.hex,
      });
      if (state.placements === before.placements) return refuse(REFUSAL.notLegal(g.hex));
      next = {
        ...next,
        state,
        steps: next.steps + 2,
        undo: t.undoSteps > 0 ? before : null,
        asked: null,
      };
      break;
    }
    case 'recolter': {
      if (!snap.hud.canHarvest) return refuse(REFUSAL.nothingRipe);
      const at = g.hex ?? snap.hud.harvestAt;
      if (at === null) return refuse(REFUSAL.nothingRipe);
      const before = table.state;
      const value = harvestValue(before, at);
      if (value.count === 0) return refuse(REFUSAL.notRipe(at));
      if (g.choice === 'treasure' && value.treasure === null) return refuse(REFUSAL.noTreasure);
      if (g.choice === 'burn' && !snap.hud.burnPaysRelics) return refuse(REFUSAL.noBurn);
      // Under the single payout there is ONE button, and it pops: tiles and
      // the scaled points together, with the receipt's tiles recipe. The
      // shakedown let a 'points' choice through, which took the receipt down
      // the fork's branch and printed the raw worth beside a stat that moved
      // by a quarter of it — a confusion three strangers reported and the
      // phone never shows.
      const choice =
        t.singlePayout && (g.choice === 'tiles' || g.choice === 'points') ? 'tiles' : g.choice;
      const state = reduce(before, { type: 'HARVEST', choice, at });
      if (state === before) return refuse(REFUSAL.notRipe(at));
      said.push({ kind: 'receipt', text: harvestNote(before, choice, value, s) });
      let progress = table.progress;
      // The walk ends at the first pop that actually lands (`App`, `did.popped`).
      if (state.log.popped > before.log.popped) progress = told(progress, 'walked');
      next = { ...next, state, progress, steps: next.steps + 1, undo: null, asked: null };
      break;
    }
    case 'toucher': {
      const ripe = snap.board.cells.find((cell) => cell.key === g.hex)?.ripe === true;
      if (ripe) {
        next = { ...next, asked: g.hex };
        return answer(pocketNote(table.state, g.hex, s));
      }
      return answer(
        describeHexOf(
          { state: table.state, theme, strings: s, detour: false, shrinesClaimed: 0 },
          g.hex,
        ),
      );
    }
    case 'garder': {
      if (!c.hold) return refuse(REFUSAL.notShown);
      if (!snap.hud.canHold) return refuse(REFUSAL.cannotHold);
      const state = reduce(table.state, { type: 'HOLD' });
      if (state === table.state) return refuse(REFUSAL.cannotHold);
      next = { ...next, state, steps: next.steps + 1, undo: null };
      break;
    }
    case 'annuler': {
      if (table.undo === null) return refuse(REFUSAL.nothingToUndo);
      next = { ...next, state: table.undo, undo: null, asked: null, steps: next.steps + 1 };
      break;
    }
    case 'bourse': {
      if (!c.purse || snap.hud.spends.length === 0) return refuse(REFUSAL.notShown);
      const how = purseOpened(table.progress);
      if (how === 'card') {
        const text = cardText('purse', snap.board, t, theme, s);
        if (text !== null) said.push({ kind: 'card', text });
        next = {
          ...next,
          progress: toldBy('purse', snap.board).reduce(told, table.progress),
          spokeAt: snap.hud.placements,
        };
      } else if (how === 'silent') {
        next = { ...next, progress: told(table.progress, 'purse') };
      }
      const rows = lessonOf('luck')?.rows?.(t, theme, s) ?? [];
      const lines = rows.flatMap(rowLines);
      said.push({
        kind: 'answer',
        text: `${s.lesson.luck.name} : ${snap.hud.luck}. ${lines.join(' ')}`,
      });
      return { table: next, said };
    }
    case 'depenser': {
      if (!c.purse) return refuse(REFUSAL.notShown);
      if (!canSpend(table.state, g.on)) return refuse(REFUSAL.cannotAfford);
      const before = table.state;
      const state = reduce(
        before,
        g.colour === null
          ? { type: 'SPEND', on: g.on }
          : { type: 'SPEND', on: g.on, colour: g.colour },
      );
      if (state === before) return refuse(REFUSAL.cannotAfford);
      said.push({ kind: 'receipt', text: spentLine(before, state, g.on, g.colour, theme, s) });
      next = { ...next, state, steps: next.steps + 1, undo: null };
      break;
    }
    case 'caravane': {
      if (snap.hud.offer === null || snap.hud.offer[g.pick] === undefined)
        return refuse(REFUSAL.noOffer);
      const state = reduce(table.state, { type: 'CARAVAN', pick: g.pick });
      if (state === table.state) return refuse(REFUSAL.noOffer);
      next = { ...next, state, steps: next.steps + 1 };
      break;
    }
    case 'stat': {
      const hidden =
        (g.id === 'cost' && !c.cost) ||
        (g.id === 'luck' && !c.purse) ||
        (g.id === 'map' && !c.reach) ||
        (g.id === 'left' && snap.hud.left === null);
      if (hidden) return refuse(REFUSAL.notShown);
      return answer(statNote(g.id, snap.hud, t, s));
    }
    case 'manuel': {
      if (!hasManual(table.condition)) return refuse(REFUSAL.noManual);
      return answer(manualText(g.lesson, t, theme, s), 'manual');
    }
  }

  const after = snapshot(next, s);
  // ...and the tour ends with the first run that ends after the walk (`App`).
  if (after.hud.ended && hasMet(next.progress, 'walked') && !hasMet(next.progress, 'toured')) {
    next = { ...next, progress: told(next.progress, 'toured') };
  }
  const dripped = drip(next, after, s, theme, said.length === 0);
  const all = [...said, ...dripped.said];
  if (after.hud.ended && after.hud.epitaph !== null)
    all.push({ kind: 'end', text: after.hud.epitaph });
  return { table: dripped.table, said: all };
}
