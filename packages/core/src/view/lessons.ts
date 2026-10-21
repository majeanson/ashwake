import { CARAVAN_BANDS, WARE_IDS } from '@content/caravan';
import { COLOURS, type Colour, type Tuning } from '@content/tuning';
import { waresOnSale } from '@engine/caravan';
import { steerDrawsAfterHand } from '@engine/rules';
import type { TeachId } from '@meta/progress';
import { CHROME_ICON, CONCEPT_ICON, LANDMARK_ICON, TILE_ICON, type IconName } from '@theme/icons';
import { namesOf, type Theme } from '@theme/tokens';
import type { Strings, TaughtId } from '@text/Strings';
import type { FigureId } from './figure';
import { colourLesson, type TipRow } from './view';

/**
 * One lesson, one source (2026-08-28).
 *
 * Marc: "the world, the screen, etc. should be from in-game too, not just
 * text. lets think of a fresh new idea that agglomerates all concept. a single
 * source: when you get helped in game, its help you can review there."
 *
 * He was describing a measurable defect. Before this file the same rule was
 * written in as many places as it had doors: the ripening rule six times from
 * four independent literals (the manual's START line, the manual's RIPEN line,
 * the teach card, the glossary, `describeHexOf`, the figure caption); "relics
 * travel, what you buy stays" five times, and the comments at
 * `shell/session.ts` record that it had already silently DRIFTED twice. Four
 * registries — `TEACH_IDS`, `GLOSSARY`, `FIGURES`, `#helpSections` — all keyed
 * off or beside `TeachId`, none of them the one the others answered to.
 *
 * The cure is not new. It is `LUCK_CORE` and `LAST_GASP_RULE` — Marc's own two
 * shared clauses, each already feeding two or three doors that append only the
 * ending they alone need — generalised from a string constant to a registry,
 * with the pictures hung off it.
 *
 * ## Why beats, and not three prose fields
 *
 * The obvious shape is `{ short, card, detail }`. It is also exactly today's
 * bug with a nicer type: **three prose fields drift because they are three
 * arbitrary LENGTHS.** Nobody can hold "the forty-word ripening rule and the
 * twenty-five-word one and the fifteen-word one" in their head, so when one is
 * edited the others rot — which is precisely how six copies happened.
 *
 * So the unit is not a length. It is a SENTENCE WITH A WEIGHT. "Shorter" then
 * becomes a filter over one list, and a filter cannot drift from what it
 * filters:
 *
 * - `core`   — the lesson in one sentence. Every door prints it.
 * - `more`   — the rest of the visible lesson.
 * - `card`   — a sentence only the TEACHING CARD prints.
 * - `detail` — the manual's DETAILS fold, and nowhere else.
 *
 * `card` is not the three-fields door reopening, and the difference is the
 * whole point of the model: a sentence still exists exactly ONCE, and its
 * weight only says which doors print it. It exists because a card fires at
 * FIRST CONTACT, where the manual has four other sections to lean on — the
 * RIPE card must say what to do next, because the player meeting it has not
 * read POP yet and may never open the manual at all.
 *
 * A door that has room for one sentence takes `core` and appends its own live
 * clause, which is what `statNote('luck')` already does by hand. That
 * appending is the escape hatch that stops anyone reaching for a fourth field.
 *
 * ## The hard boundary
 *
 * A beat sees `(Tuning, Theme, Strings)` and nothing else — not the detour
 * flag, not the hooks, not the worn perk, not the run's seed. The signature
 * draws the migration line for free: prose that needs a session fact (WHY,
 * WHICH GAME, WHAT REMAINS, THIS BUILD, WHAT YOU CARRY, HOW A RUN ENDS) stays
 * with the screen, and that exclusion is a gift rather than a compromise — it
 * is exactly the copy Marc tuned on 2026-08-27 and exactly the copy that is
 * duplicated nowhere.
 *
 * ## Two languages (2026-08-28)
 *
 * The CONDITIONS live here — which sentence a dial selects, whether a beat is
 * spoken at all — and the SENTENCES live in `text/` (`en.ts`, `fr-CA.ts`). A
 * beat reads `s.lesson.pop.surroundsAsh(name)` rather than carrying the words,
 * so French and English can never disagree about when a rule applies, only
 * about how it is put. `name` and `terms` come from the same place, because
 * the tappable spelling of a concept is a fact of the language.
 */

/**
 * Every concept the game can teach.
 *
 * A superset of `TeachId` — the drip's ledger — because some concepts are
 * words the manual prints without ever firing a card for them. Most of the
 * extras are the ones `glossary.ts` added on 2026-08-27 for exactly that
 * reason.
 */
export type LessonId = TeachId | 'expedition' | 'stash' | 'grounds' | 'magic' | 'end' | 'native';

/** A hex has six sides, and the ground advice's figures are "all six paying". */
const SIDES = 6;

/** Whether this run can bank a relic at all — a world; never a daily, a shared board or LEARN FIRST. */
const relicsFlow = (t: Tuning): boolean =>
  t.claimRelics > 0 || t.luckToRelics > 0 || t.burnRelics > 0;

/** How heavy a sentence is. Absent means `more`. */
type Weight = 'core' | 'more' | 'card' | 'detail';

/**
 * One sentence of a lesson, in this run's own numbers and this device's own
 * language.
 *
 * Returning `null` is how a dial being off removes a sentence rather than
 * flattening it: `redAshMatches`, `harvestSizeCap`, `holdSlots` and the rest
 * each own a beat that simply is not spoken when the system is zeroed. That is
 * the same conditional the literals already carried, kept whole.
 *
 * A beat is a WHOLE SENTENCE, never a clause. The manual prints one `<p>` per
 * beat, and a clause-level beat would render an orphan fragment; the tests
 * enforce it by checking every beat ends in terminal punctuation.
 */
type Beat = {
  readonly say: (t: Tuning, theme: Theme, s: Strings) => string | null;
  readonly at?: Weight;
};

/**
 * The manual tabs that hold lesson sections.
 */
type ManualTab = 'start' | 'grounds' | 'world' | 'hand';

export type Lesson = {
  /** One of the concepts the catalogue has words for — a subset of `LessonId`,
   *  because some teach ids are moments (`place`, `wall`) rather than terms. */
  readonly id: TaughtId;
  /** From one of the four mark registries only — never a literal shape. The
   *  registries name a Phosphor icon since 2026-08-30 (`@theme/icons`); before
   *  that they named a Unicode character, which is a request rather than a
   *  shape and which three of the marks were having answered by a wordmark
   *  font. */
  readonly icon?: IconName;
  /** The ink the lesson's name wears on its card: MAGIC keeps the one `rarityInked` gave it. */
  readonly ink?: 'ink-magic' | 'ink-unique';
  readonly beats: readonly Beat[];
  /**
   * Where the manual prints this lesson as a section. Absent means the lesson
   * is reachable only through its term card. A tab's sections print in the
   * order they stand in `LESSONS`.
   */
  readonly tab?: ManualTab;
  /**
   * A set this lesson lists, one row each: THE FOUR GROUNDS (2026-09-30).
   *
   * Deleted and restored the same day. The sweep found it read and never set,
   * because the lesson it was written for had never been built: the drip
   * fired `colours` at every device and `LessonCard` drew nothing for it,
   * so it was never told and LAST GASP, behind it, never spoke.
   */
  readonly rows?: (t: Tuning, theme: Theme, s: Strings) => readonly TipRow[];
  /**
   * What each row is CALLED, and the words that open it (2026-10-13). A row is
   * a thing the concept lists — THE MAP's cache, site, shrine — and it has a
   * name a NEW chip wears and terms a sentence can make tappable, so a tap on
   * CACHE opens the map at the cache row. Absent where a lesson's rows are
   * only a table (THE FOUR GROUNDS).
   */
  readonly rowHeads?: (s: Strings) => readonly RowHead[];
  /**
   * The picture of this rule. Travels WITH the lesson, so every door that
   * teaches it draws the same one — which is the whole of Marc's ask.
   *
   * A CARD draws a figure or rows, never both: a portrait teaching card
   * already runs icon, lead, body and button, and both together overflow it.
   * A lesson that has both (POP) draws the figure on the card the game fires
   * and its rows in the manual, and leads a row when a card is opened at one
   * (`cardDraws`). `lessons.test.ts` asserts it.
   */
  readonly figure?: FigureId;
  /**
   * A figure only the MANUAL draws, under the rows (2026-10-13). A card
   * carries rows or a figure, never both (see `figure`); the manual has the
   * room, and THE MAP's `destinations` caption is the one sentence that says
   * a faint destination is a spent one.
   */
  readonly manualFigure?: FigureId;
};

/** The things THE MAP lists, one row each (2026-10-13). */
export type RowKey =
  | 'cache'
  | 'site'
  | 'shrine'
  | 'territory'
  | 'find'
  | 'lens'
  // POP's rows that are named words (the stone a pop leaves, the size bonus,
  // reach) and the ring marks, and THE EXPEDITION's two marks (2026-10-13).
  | 'ripeEdge'
  | 'stone'
  | 'sizeBonus'
  | 'reach'
  | 'wall'
  | 'legal'
  // MAGIC's two rarities (2026-10-13).
  | 'magic'
  | 'unique'
  // LUCK's buttons, one row each as the purse draws them.
  | 'redraw'
  | 'steer'
  | 'forge'
  | 'sacrifice'
  // THE RUN'S END's relics.
  | 'relic';

/** A row's name and tappable spellings, like a lesson's own. */
type RowHead = {
  readonly key: RowKey;
  readonly name: string;
  /** UPPERCASE, longest first — merged with the lessons' own by `tips.ts`. */
  readonly terms: readonly string[];
  /** The ink its words wear in prose, where it is not the plain term's (MAGIC's
   *  and UNIQUE's, which `rarityInked` always gave them). */
  readonly ink?: 'ink-magic' | 'ink-unique';
};

/**
 * What a CARD draws under a lesson's words (2026-10-13): its figure, or its
 * rows, never both. A lesson with only one draws that one. POP has both: the
 * fired card draws the `pop` figure and the manual draws the rows, but a card
 * opened AT a row (a tap on PIERRE) draws the rows, led by the one asked about,
 * because the figure cannot answer it.
 */
export const cardDraws = (lesson: Lesson, row: RowKey | undefined): 'figure' | 'rows' | null =>
  lesson.rows !== undefined && (row !== undefined || lesson.figure === undefined)
    ? 'rows'
    : lesson.figure !== undefined
      ? 'figure'
      : null;

/**
 * What this lesson is CALLED — the manual's heading, the teach card's lead,
 * the term card's title — in the language asked for.
 */
export const lessonName = (lesson: Lesson, s: Strings): string => s.lesson[lesson.id].name;

/**
 * What a row of this lesson is called, or the lesson's own name where it has
 * no such row — the label of a NEW chip (2026-10-13), which offers CACHE or
 * SHRINE rather than the concept they live in.
 */
export const rowName = (lesson: Lesson, row: RowKey | undefined, s: Strings): string =>
  lesson.rowHeads?.(s).find((head) => head.key === row)?.name ?? lessonName(lesson, s);

/**
 * UPPERCASE, longest first — the spellings `tips.ts`'s matcher alternates
 * over. An EMPTY list is a lesson with no tappable word, which is how the
 * concepts `glossary.ts` deliberately left out can hold their prose without
 * becoming a button nobody could ever reach (THE FOUR GROUNDS, since
 * 2026-09-30; `purse`, `place`, `wall` and `lastGasp` never were lessons, and
 * speak through `SaidCard` and the drip's toast lines instead) — and how the 2026-09-03 manual sections (`costRise`,
 * `reach`, `field`, `lens`) explain a rule without minting a vocabulary word
 * for it.
 */
export const lessonTerms = (lesson: Lesson, s: Strings): readonly string[] =>
  s.lesson[lesson.id].terms;

const weightOf = (beat: Beat): Weight => beat.at ?? 'more';

/** Every sentence of one weight that this run actually speaks. */
function beatsAt(lesson: Lesson, weight: Weight, t: Tuning, theme: Theme, s: Strings): string[] {
  const out: string[] = [];
  for (const beat of lesson.beats) {
    if (weightOf(beat) !== weight) continue;
    const said = beat.say(t, theme, s);
    if (said !== null && said !== '') out.push(said);
  }
  return out;
}

/** The visible lesson: `core` then `more`, one string per sentence. What the
 *  manual prints as its lines. */
export function lessonLines(lesson: Lesson, t: Tuning, theme: Theme, s: Strings): string[] {
  return [...beatsAt(lesson, 'core', t, theme, s), ...beatsAt(lesson, 'more', t, theme, s)];
}

/** The folded arithmetic — the manual's DETAILS, and nowhere else. */
export function lessonDetail(lesson: Lesson, t: Tuning, theme: Theme, s: Strings): string[] {
  return beatsAt(lesson, 'detail', t, theme, s);
}

/**
 * The lesson in ONE sentence, for a door that has room for one and then
 * appends its own live clause. `LUCK_CORE`'s job, generalised.
 */
export function lessonCore(lesson: Lesson, t: Tuning, theme: Theme, s: Strings): string {
  return beatsAt(lesson, 'core', t, theme, s).join(' ');
}

/**
 * The visible lesson as one paragraph — the term card's definition, and the
 * body of a teaching card.
 *
 * That those two are the SAME words is the design's honest claim. Today they
 * differ only because they were written twice, days apart, by two passes.
 */
export function lessonDefine(lesson: Lesson, t: Tuning, theme: Theme, s: Strings): string {
  return lessonLines(lesson, t, theme, s).join(' ');
}

/**
 * The TEACHING card's body: the visible lesson, plus whatever this lesson
 * keeps for the moment of first contact.
 *
 * The card and the manual therefore open on the same sentence, always, and
 * differ only by what the card adds.
 *
 * **The `card` weight had no reader at all until 2026-08-30.** Every door in
 * this body printed `lessonDefine`, which is `core` + `more` — so the four
 * sentences written for first contact, in both languages, tested by
 * `lessons.test.ts` and pinned by `teaching.pin.test.ts`, reached nobody. That
 * is the whole reason the weight exists: RIPE's card must say what to do next,
 * because the player meeting it has not read POP and may never open the
 * manual. Found by grepping for a consumer, which is the standing check in
 * `CLAUDE.md`, and it is the fifth mechanic caught by it.
 *
 * It replaces `lessonCardText`, which composed a "{glyph}  {NAME}\n{body}"
 * string for a host to take apart again. `LessonCard` has the icon and the
 * name already; a lead line only existed to be re-split — and once a mark
 * stopped being a character (2026-08-30) it could not have been composed into
 * a string at all.
 */
export function lessonCardDefine(lesson: Lesson, t: Tuning, theme: Theme, s: Strings): string {
  return [...lessonLines(lesson, t, theme, s), ...beatsAt(lesson, 'card', t, theme, s)].join(' ');
}

/**
 * The lessons themselves — the structure and the conditions. The words are in
 * `text/`, one file per language, under the same keys.
 *
 * Figures are attached here because they are already keyed by the same
 * concepts: `ripen` and `pop` are POP's pictures, `place` is THE EXPEDITION's, `rare` is
 * MAGIC's, `stash` is THE STASH's.
 */
export const LESSONS: readonly Lesson[] = [
  // ORDER IS THE MANUAL'S READING ORDER (moved from Manual.tsx's SECTIONS).
  // Filter by `tab` and the sequence is the section order: START reads
  // EXPEDITION (what you are doing), POP (the verb and everything it leaves),
  // THE RUN'S END. THE CARAVAN sits beside THE MAP's bounty (2026-09-30): the
  // other reason a pop pays more. Lessons without a tab sit beside their kin.
  /**
   * THE EXPEDITION (2026-10-13): what you are doing here, before any rule. Its
   * `core` is the shared `howItWorks`, so the goal card (a `SaidCard`, which
   * quotes that clause and is this lesson's delivery with the story) and the
   * manual's opening are one wording; its `more` is the three lines that say
   * what a run costs and what comes home (`ui.expedition`, which moved here
   * word for word). The second line composes with the shape-of-the-game clause
   * the coach's last step also reads.
   *
   * It never fires as a card of its own, so it has no icon and no figure of
   * its own on a card: the manual draws the `place` figure under its rows, which
   * are the marks of the board that are not rules — a wall (the wall toast's
   * own sentence) and the glowing edge of a hex you may place on. The `place`
   * and `wall` moments, and the story and goal cards, `open` this lesson
   * (`shell/teaching.ts`); it is printed for everyone, as the expedition block
   * always was (the manual prints every section for everyone).
   */
  {
    id: 'expedition',
    tab: 'start',
    manualFigure: 'place',
    beats: [
      { at: 'core', say: (_t, _theme, s) => s.howItWorks },
      ...[0, 1].map((n): Beat => ({
        say: (_t, _theme, s) => s.lesson.expedition.lines[n] ?? null,
      })),
      // The relics line only where relics flow (2026-10-21): a daily, a shared
      // board and LEARN FIRST have every faucet at 0, and the card promised
      // them a shop. The dial picks the sentence, as the territory row's does.
      { say: (t, _theme, s) => (relicsFlow(t) ? (s.lesson.expedition.lines[2] ?? null) : null) },
    ],
    rows: (_t, _theme, s) => [
      // Neither prints its name: the sentence leads with it ("Mur : ...").
      {
        key: 'wall',
        ground: 'wall',
        icon: CONCEPT_ICON.wall,
        text: s.lesson.expedition.row.wall.core,
      },
      { key: 'legal', ring: 'legal', text: s.lesson.expedition.row.legal.core },
    ],
    rowHeads: (s) => [
      {
        key: 'wall',
        name: s.lesson.expedition.row.wall.name,
        terms: s.lesson.expedition.row.wall.terms,
      },
      {
        key: 'legal',
        name: s.lesson.expedition.row.legal.name,
        terms: s.lesson.expedition.row.legal.terms,
      },
    ],
  },
  /**
   * POP (2026-10-13): a tile ripens, a pocket is a ripe tile and its ripe
   * neighbours, a tile's worth is what ripening shows, and a pop cashes the
   * pocket and leaves stone. RIPE, POCKET, WORTH, POP, SIZE BONUS, STONE and
   * REACH were seven lessons that each explained one clause of the other six;
   * the first three sentences are its `core` in the order a player meets them.
   *
   * Its rows are the manual's depth — the ripe edge, stone, the size bonus and
   * reach, each the sentence it was — and the FIRED card draws the `pop` figure
   * instead (`cardDraws`): a portrait card cannot carry both. A card opened at
   * a row (PIERRE, BONUS DE TAILLE) leads that row instead. The `ripen` figure
   * is the manual's, under the rows.
   *
   * RIPE's two first-contact sentences (`cardLean`, `cardPlain`) are gone: what
   * they told the player is `pop.core` (cash it now or let it grow), `lean`
   * (the draw lean, under the same dials) and the card beat below (tap a ripe
   * tile to price its pocket). One card is the walk's now — the `ripe` moment's
   * dismissal tells both `ripe` and `pop` (`toldBy`).
   */
  {
    id: 'ripe',
    tab: 'start',
    figure: 'ripen',
    beats: [
      { at: 'core', say: (_t, _theme, s) => s.lesson.ripe.ripens },
      { at: 'core', say: (_t, _theme, s) => s.lesson.ripe.pocket },
      // The depth is the manual's DETAILS fold (2026-10-15): the card is the
      // idea and the next move, and nothing else.
      { at: 'detail', say: (_t, _theme, s) => s.lesson.ripe.worth },
      {
        at: 'detail',
        say: (t, theme, s) =>
          t.redAshMatches
            ? s.lesson.ripe.surroundsAsh(namesOf(theme, s.locale).red)
            : s.lesson.ripe.surrounds,
      },
      // "Tap a ripe tile to price it" was a card beat here until 2026-10-19;
      // the `pop` coach line says it on the same frame, so it is said once.
    ],
    rowHeads: (s) => {
      const r = s.lesson.ripe.row;
      return [{ key: 'ripeEdge', name: r.ripeEdge.name, terms: r.ripeEdge.terms }];
    },
    // The ripe tile's ring; the sentence leads with its own name.
    rows: (_t, _theme, s) => [
      { key: 'ripeEdge', ring: 'ripe', text: s.lesson.ripe.row.ripeEdge.core },
    ],
  },
  {
    id: 'pop',
    tab: 'start',
    icon: CONCEPT_ICON.pop,
    figure: 'pop',
    beats: [
      { at: 'core', say: (_t, _theme, s) => s.lesson.pop.core },
      { at: 'detail', say: (_t, _theme, s) => s.lesson.pop.paid },
      { say: (_t, _theme, s) => s.lesson.pop.wait },
      // The draw lean, findable by a manual reader (2026-09-03). It was said
      // only in the old `ripe.cardLean` — a first-contact sentence the manual never
      // prints — under the same condition this beat keeps.
      {
        at: 'detail',
        say: (t, _theme, s) =>
          t.luckPerPop > 0 && t.colourBiasDraws > 0 ? s.lesson.pop.lean : null,
      },
      // The timing choice, findable from the RÉCOLTER door itself
      // (2026-09-04). It was said only in `s.view.harvest.firstPopWhen`, the
      // first-ever-pop toast — a sentence a player who dismissed that toast
      // once could never see again, on the one door that exists to explain
      // POP. The first-pop card said it again, seconds later, until 2026-10-19.
      { say: (_t, _theme, s) => s.lesson.pop.when },
    ],
    rowHeads: (s) => {
      const r = s.lesson.pop.row;
      return [
        { key: 'stone', name: r.stone.name, terms: r.stone.terms },
        { key: 'sizeBonus', name: r.sizeBonus.name, terms: r.sizeBonus.terms },
        { key: 'reach', name: r.reach.name, terms: r.reach.terms },
      ];
    },
    rows: (t, theme, s) => {
      const r = s.lesson.pop.row;
      return [
        {
          key: 'stone',
          ground: 'stone',
          icon: CONCEPT_ICON.stone,
          name: r.stone.name,
          text: t.redAshMatches ? r.stone.coreAsh(namesOf(theme, s.locale).red) : r.stone.core,
        },
        {
          key: 'sizeBonus',
          name: r.sizeBonus.name,
          text: t.harvestSizeCap > 0 ? r.sizeBonus.coreCapped(t.harvestSizeCap) : r.sizeBonus.core,
        },
        {
          key: 'reach',
          name: r.reach.name,
          text:
            t.distanceStep > 0
              ? `${r.reach.core} ${r.reach.multiplier(t.distanceStep)}`
              : r.reach.core,
        },
      ];
    },
  },
  /**
   * THE RUN'S END (2026-10-13): the cost's clock, the last placement and the
   * relics a run leaves with are ONE concept. Three lessons and a shop sentence
   * each said a piece of how a run finishes (`costRise`, `relic`, and the
   * LAST GASP toast's rule); the last START section reads in that order now —
   * what a placement costs, that it only rises, the forgiven last placement —
   * and the relic is its row.
   *
   * The ledger keeps `costRise` and `lastGasp` as the toasts that tell it and
   * `relic` as the chip that opens it at the relic row (`shell/teaching.ts`).
   * The clock sentence is the stat note's own clause (`CLOCK`), and the last
   * gasp is the toast's own rule (`s.lastGaspRule`), so no door words either
   * twice. A flattened curve (`costRisesEvery: 0`) drops `rises` and the
   * arithmetic: a run that never gets dearer is not told it does.
   */
  {
    id: 'end',
    tab: 'start',
    beats: [
      { at: 'core', say: (_t, _theme, s) => s.lesson.end.core },
      {
        at: 'core',
        say: (t, _theme, s) => (t.costRisesEvery > 0 ? s.lesson.end.rises : null),
      },
      { say: (_t, _theme, s) => s.lastGaspRule },
      {
        at: 'detail',
        say: (t, _theme, s) =>
          t.costRisesEvery > 0
            ? t.costGrace > 0
              ? s.lesson.end.curveGrace(t.baseCost, t.costGrace, t.costRisesEvery)
              : s.lesson.end.curvePlain(t.costRisesEvery)
            : null,
      },
    ],
    rowHeads: (s) => [
      {
        key: 'relic',
        name: s.lesson.end.row.relic.name,
        terms: s.lesson.end.row.relic.terms,
      },
    ],
    // The relic row only where relics flow (2026-10-21); its chip (`relic`)
    // already waited on `relics > 0`, the printed row did not.
    rows: (t, _theme, s) =>
      relicsFlow(t)
        ? [
            {
              key: 'relic',
              icon: CONCEPT_ICON.relic,
              name: s.lesson.end.row.relic.name,
              text: s.lesson.end.row.relic.core,
            },
          ]
        : [],
  },
  // SACRIFICE was deleted here on 2026-10-13 (Marc's merge ruling): `burnRelics` and
  // `burnLuck` are 0 for good, so its lesson was unreachable. Resurrectable from git
  // (the commit before this one still has it, with the strings under lesson.sacrifice).
  /**
   * THE MAP (2026-10-13): the fog, its destinations and the lens are ONE
   * concept. Eight lessons (cache, site, shrine, territory, find, bounty,
   * native ground, the fog) each said a piece of it, and a manual block said
   * the lens — and the legend listed the destinations a thumb's length above
   * the sections that explained them. Now the concept is its `core` (the
   * world remembers) and its ROWS: one per thing on the map, each the lesson's
   * own sentence it used to be, with the manual's depth under it (`lines`:
   * the bounty under the site, native ground under the territory, the lens's
   * other two lines under the lens).
   *
   * The ledger keeps cache, site, shrine, territory, lens and field as the
   * MOMENTS that tell it (`shell/teaching.ts` says which row each opens); `map`
   * is the concept's own, told by the first destination in view.
   *
   * `lensHint` is the toast's own sentence and stays shared: the manual and
   * the drip cannot describe the gesture two ways.
   */
  {
    id: 'map',
    tab: 'world',
    beats: [
      // "The world remembers" only where there is a world to (2026-10-21): a
      // daily and a shared board pay their territories in tiles instead
      // (`territoryPays`, the dial the territory row forks on too), and
      // remember nothing unless kept.
      {
        at: 'core',
        say: (t, _theme, s) => (t.territoryPays > 0 ? s.lesson.map.coreKept : s.lesson.map.core),
      },
      { say: (_t, _theme, s) => s.lensHint },
      // The one thing every destination has in common, for the card that fires
      // the first time one is in view; the rows say what each pays.
      { at: 'card', say: (_t, _theme, s) => s.lesson.map.pays },
      // What a first run cannot use yet, out of the rows a card prints
      // (2026-10-19): the manual keeps them.
      { at: 'detail', say: (_t, _theme, s) => s.lesson.map.rearm },
      {
        at: 'detail',
        say: (t, _theme, s) => (t.questNeed > 0 ? s.lesson.map.oneBounty : null),
      },
    ],
    rowHeads: (s) => {
      const r = s.lesson.map.row;
      return [
        { key: 'cache', name: r.cache.name, terms: r.cache.terms },
        { key: 'site', name: r.site.name, terms: r.site.terms },
        { key: 'shrine', name: r.shrine.name, terms: r.shrine.terms },
        { key: 'territory', name: r.territory.name, terms: r.territory.terms },
        { key: 'find', name: r.find.name, terms: r.find.terms },
        { key: 'lens', name: r.lens.name, terms: r.lens.terms },
      ];
    },
    rows: (t, _theme, s) => {
      const r = s.lesson.map.row;
      return [
        {
          key: 'cache',
          destination: LANDMARK_ICON.cache,
          name: r.cache.name,
          text:
            t.cachePaysPerRing > 0
              ? r.cache.coreRing(t.cachePays, t.cachePaysPerRing)
              : r.cache.core(t.cachePays),
        },
        {
          key: 'site',
          destination: LANDMARK_ICON.site,
          name: r.site.name,
          text: r.site.core(t.sitePays),
          lines: [{ text: r.site.bounty(t.questNeed, t.questRadius, t.questBonus) }],
        },
        {
          key: 'shrine',
          destination: LANDMARK_ICON.shrine,
          name: r.shrine.name,
          text: r.shrine.core,
        },
        {
          key: 'territory',
          destination: LANDMARK_ICON.territory,
          name: r.territory.name,
          /*
           * THE DIAL PICKS THE SENTENCE (2026-09-09).
           *
           * `core` quotes `territoryTiles` and `territoryTilesCap` — the bonus
           * a HELD territory pays into every later run's purse — and ends the
           * first clause with "for good". On a daily or a shared board both
           * numbers are dead (there is no later run in this world to pay) and
           * "for good" is false unless the player keeps the board, while the
           * one number that IS paid, `territoryPays`, went unmentioned. So the
           * card explaining the mark under the thumb described a territory the
           * player could not have.
           *
           * Forked on the dial rather than on a run kind, which is this file's
           * hard boundary: a beat sees `(Tuning, Theme, Strings)` and nothing
           * else. It is also the stronger statement — `territoryPays` being
           * raised is exactly the condition under which the engine pays, so
           * the lesson and the payment cannot come apart.
           */
          text:
            t.territoryPays > 0
              ? r.territory.pays(t.territoryRadius, t.territoryPays)
              : r.territory.core(t.territoryRadius, t.territoryTiles, t.territoryTilesCap),
          lines: [{ text: r.territory.native }],
        },
        {
          key: 'find',
          destination: LANDMARK_ICON.find,
          name: r.find.name,
          text: r.find.core,
        },
        {
          key: 'lens',
          // The magnifier the camera cluster's button wears.
          icon: CHROME_ICON.lens,
          name: r.lens.name,
          text: r.lens.open,
          lines: [{ text: r.lens.hold }, { text: r.lens.read }],
        },
      ];
    },
    // The `destinations` figure's caption is the one place the manual says that
    // FAINT MEANS SPENT. It sits under the rows in the manual; a card (which
    // has the rows) does not draw it.
    manualFigure: 'destinations',
  },
  /**
   * THE CARAVAN (2026-09-30, Marc: _"add respective how to play, guide,
   * hints, etc. for caravans and uniformize its entity"_). Its card fires the
   * first time it is IN TOWN with a pocket to try (`shell/teaching.ts`), and
   * it wears the same storefront as its line, its picker and its lens row.
   *
   * What it IS holds under every dial. The sizes, the visit and the wares are
   * the DETAILS fold's: the sizes are the answer a missed pop gives anyway,
   * and a card at first contact has no room for thirteen wares. The wares
   * listed are the ones `offerFor` can draw for this tuning, each in its own
   * picker words, so the manual and the picker cannot describe one two ways.
   */
  {
    id: 'caravan',
    tab: 'world',
    icon: CONCEPT_ICON.caravan,
    beats: [
      { at: 'core', say: (_t, _theme, s) => s.lesson.caravan.core },
      { say: (_t, _theme, s) => s.lesson.caravan.try },
      {
        at: 'detail',
        say: (t, _theme, s) => (t.caravanEvery > 0 ? s.lesson.caravan.refused : null),
      },
      { at: 'card', say: (_t, _theme, s) => s.lesson.caravan.card },
      {
        at: 'detail',
        say: (t, _theme, s) =>
          t.caravanEvery > 0
            ? s.lesson.caravan.sizes(CARAVAN_BANDS[0][0], CARAVAN_BANDS[0][1], CARAVAN_BANDS[1][0])
            : null,
      },
      {
        at: 'detail',
        say: (t, _theme, s) =>
          t.caravanEvery > 0 && t.caravanAway >= 1
            ? s.lesson.caravan.visits(t.caravanEvery, Math.floor(t.caravanAway))
            : null,
      },
      ...WARE_IDS.map((ware): Beat => ({
        at: 'detail',
        say: (t, _theme, s) =>
          t.caravanEvery > 0 && waresOnSale(t).includes(ware)
            ? s.lesson.caravan.ware(s.caravan.ware[ware].name, s.caravan.ware[ware].note)
            : null,
      })),
    ],
  },
  /**
   * LUCK (2026-10-13) is the purse's card too. Opening the purse used to raise
   * a card of its own, `purseLesson` (LUCK IS FOR SPENDING), through the Said
   * door with its own sentences and rows; now it raises THIS lesson's card, so
   * the fired LUCK card, the purse's first open, the manual and the term card
   * are one thing with one set of words.
   *
   * The rows are the purse's buttons, one per button in the order the drawer
   * draws them (`spendsFor`), each quoting its own face and its own price, and
   * they read the SAME `s.view.purse` functions the sheet itself does. The one
   * fact a price cannot say — luck is use-it-or-lose-it, and "you CAN lose it
   * all" is Marc's own phrasing (2026-08-20) — is the card's `spend` beat.
   * Only rows whose dials are on are named; the steers fork on `steerSure`.
   */
  {
    id: 'luck',
    tab: 'hand',
    icon: CONCEPT_ICON.luck,
    beats: [
      { at: 'core', say: (_t, _theme, s) => s.lesson.luck.core },
      {
        at: 'card',
        say: (t, _theme, s) => {
          const p = s.view.purse;
          return s.lesson.luck.spend(
            t.luckToRelics > 0 ? p.lostPartly(Math.round(t.luckToRelics * 100)) : p.lostAll,
          );
        },
      },
    ],
    rows: (t, theme, s) => {
      // Named as the BUTTONS are named (2026-08-27, Marc: "first luck drawer
      // expand we should explain all actions"): every row quotes its own face.
      const n = namesOf(theme, s.locale);
      const p = s.view.purse;
      return [
        ...(t.luckRerollCost > 0 ? [{ key: 'redraw', text: p.redraw(t.luckRerollCost) }] : []),
        // The steers were a parenthesised list inside somebody else's sentence;
        // they are four buttons on screen, so four lines, each in its ground's
        // own colour.
        ...(t.luckSteerCost > 0
          ? COLOURS.map((colour): TipRow => ({
              key: 'steer',
              colour,
              text: (t.steerSure ? p.steerSure : p.steer)(
                n[colour],
                t.luckSteerCost,
                steerDrawsAfterHand(t),
              ),
            }))
          : []),
        ...(t.luckForgeCost > 0 ? [{ key: 'forge', text: p.forge(t.luckForgeCost) }] : []),
        ...(t.titheRate > 0
          ? [{ key: 'sacrifice', text: p.sacrifice(Math.round(t.titheRate * 100)) }]
          : []),
      ];
    },
  },
  /**
   * MAGIC (2026-10-13): the two rarities are one concept. They were two
   * lessons that each carried the shared star sentence and the figure, and a
   * manual section COMPOSED of the pair; now it is one lesson whose `core` is
   * the magic rule, whose UNIQUE rule is its row, and whose first-contact
   * sentence is what to do with one. The rules are shared constants in each
   * catalogue, so a tap on a tile (`view.rarity`) says them the same way.
   *
   * The MAGIC row is not drawn: the card's `core` IS that sentence, and a row
   * repeating it a line below would be the same words twice. It keeps its
   * `rowHeads` entry, because the word MAGIQUE still opens this lesson and a
   * rare chip is named by it. A card carries rows or a figure, so the `rare`
   * figure is the manual's (under the rows), and the card draws the UNIQUE
   * row's own ringed tile.
   */
  {
    id: 'magic',
    tab: 'hand',
    ink: 'ink-magic',
    icon: TILE_ICON,
    manualFigure: 'rare',
    beats: [
      { at: 'core', say: (_t, _theme, s) => s.lesson.magic.core },
      // How a placed rare tile looks: the manual's DETAILS, not the card
      // (2026-10-19), which says what it does and where to spend it.
      { at: 'detail', say: (_t, _theme, s) => s.rareStar },
      { at: 'card', say: (_t, _theme, s) => s.lesson.magic.card },
    ],
    rowHeads: (s) => [
      {
        key: 'magic',
        name: s.lesson.magic.row.magic.name,
        terms: s.lesson.magic.row.magic.terms,
        ink: 'ink-magic',
      },
      {
        key: 'unique',
        name: s.lesson.magic.row.unique.name,
        terms: s.lesson.magic.row.unique.terms,
        ink: 'ink-unique',
      },
    ],
    rows: (_t, _theme, s) => [
      { key: 'unique', ring: 'unique', text: s.lesson.magic.row.unique.core },
    ],
  },
  {
    id: 'stash',
    tab: 'hand',
    figure: 'stash',
    beats: [
      {
        at: 'core',
        say: (t, _theme, s) =>
          t.holdSlots > 1 ? s.lesson.stash.coreMany(t.holdSlots) : s.lesson.stash.coreOne,
      },
      // The manual's second line, which the glossary's version had shortened
      // to "Held tiles survive a redraw." — true, and missing the reason
      // anybody would care.
      { say: (_t, _theme, s) => s.lesson.stash.more },
    ],
  },
  /**
   * THE FOUR GROUNDS (2026-09-30): Ashwake 1's card, built at last. Marc,
   * 2026-08-27: _"teach all tiles at one in a beautiful tip"_. One card, not
   * four toasts, because the four only mean anything against each other:
   * every hand is a choice between them. Each row is the ground's own
   * sentence from `colourLesson`, the one a second tap on a card says, so the
   * card and the hand cannot describe a ground two ways; `TipRows` draws the
   * baked tile beside it. A ground whose power is off says nothing, and the
   * lead still does.
   *
   * **The manual's COLOURS tab is this lesson (2026-10-13).** It was a second
   * block, `strategy`, that restated the rule's numbers beside the rule. Now
   * each row also carries `lines` (when to take the ground, what undoes it)
   * for the manual to draw, and the advice that holds for every ground is the
   * DETAILS fold's. A card prints neither: first contact is the rule and four
   * tiles.
   *
   * The id is `grounds`, not the ledger's `colours`: the moment keeps its old
   * name so no device forgets it was told, and its slot `opens` this lesson
   * (`shell/teaching.ts`).
   */
  {
    id: 'grounds',
    tab: 'grounds',
    icon: TILE_ICON,
    beats: [
      { at: 'core', say: (_t, _theme, s) => s.lesson.grounds.core },
      { at: 'detail', say: (_t, _theme, s) => s.lesson.grounds.general.pocket },
      {
        at: 'detail',
        say: (_t, theme, s) => s.lesson.grounds.general.compare(namesOf(theme, s.locale)),
      },
      {
        at: 'detail',
        say: (t, theme, s) =>
          s.lesson.grounds.general.stone(t.redAshMatches ? namesOf(theme, s.locale).red : null),
      },
      { at: 'detail', say: (_t, _theme, s) => s.lesson.grounds.general.distance },
      { at: 'detail', say: (_t, _theme, s) => s.lesson.grounds.general.hand },
    ],
    rows: (t, theme, s) => {
      const g = s.lesson.grounds;
      // Six sides, all paying: the green crowd bonus lands on every one past
      // the first. A ring of yellow pays the larger of a match and company on
      // every side, but only where company counts every stranger; counting
      // distinct colours caps it at three, and there is no single figure to
      // quote.
      const advice: Record<Colour, { pick: string; watch: string }> = {
        green: {
          pick: g.green.pick(SIDES + (SIDES - 1) * t.greenCrowdBonus),
          watch: g.green.watch,
        },
        yellow: {
          pick: g.yellow.pick(
            t.yellowCompanyAll ? SIDES * Math.max(1, t.yellowCompanyBonus) : null,
          ),
          watch: g.yellow.watch,
        },
        red: { pick: g.red.pick(t.redAshWalls), watch: g.red.watch },
        blue: { pick: g.blue.pick(t.blueTideCap), watch: g.blue.watch(t.blueTideCap) },
      };
      return COLOURS.flatMap((colour): TipRow[] => {
        const text = colourLesson(colour, t, theme, s);
        return text === null
          ? []
          : [
              {
                colour,
                text,
                lines: [
                  { head: g.pickWhen, text: advice[colour].pick },
                  { head: g.watchFor, text: advice[colour].watch },
                ],
              },
            ];
      });
    },
  },
  /**
   * LE SOL NATAL (2026-10-21, Marc: _"if we see native grounds for the first
   * time, a zoom in and card could be good, not related to territory"_). Its
   * moment is `field`, the first native hex in view — a tour card flown to
   * like a place's (`shell/teaching.ts`). The rule was the territory row's
   * depth alone (`map.row.territory.native`), which a first run never reaches
   * before it has been standing on native ground for twenty placements.
   */
  {
    id: 'native',
    tab: 'grounds',
    beats: [
      { at: 'core', say: (_t, _theme, s) => s.lesson.native.core },
      { say: (_t, _theme, s) => s.lesson.native.more },
      { at: 'card', say: (_t, _theme, s) => s.lesson.native.card },
    ],
  },
];

/** One lesson by id, or `undefined` where no lesson has been written yet. */
export function lessonOf(id: LessonId): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}

/**
 * Which lesson, and which row of it, explains which destination.
 *
 * One registry, because two screens ask the same question: the manual lists
 * the places, and a tap on the board opens the card for whatever was tapped
 * (2026-08-29, Marc: "make sure we can click on the map for caches, shrines,
 * etc. and we get the card explaining what it is"). Since 2026-10-13 every
 * answer is THE MAP, at the row of the kind that was touched.
 *
 * A FIND has its own row (2026-08-30): it used to map to RELICS, on the
 * argument that what a find gives you is a perk, which is true of the reward
 * and wrong about the QUESTION — a player tapping a shimmer is asking what
 * that mark is.
 */
export const LESSON_FOR_REWARD: Readonly<
  Record<
    'cache' | 'site' | 'shrine' | 'territory' | 'find',
    { readonly lesson: 'map'; readonly row: RowKey }
  >
> = {
  cache: { lesson: 'map', row: 'cache' },
  site: { lesson: 'map', row: 'site' },
  shrine: { lesson: 'map', row: 'shrine' },
  territory: { lesson: 'map', row: 'territory' },
  find: { lesson: 'map', row: 'find' },
};
