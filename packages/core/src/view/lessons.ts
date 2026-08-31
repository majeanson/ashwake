import type { Tuning } from '@content/tuning';
import type { TeachId } from '@meta/progress';
import { CONCEPT_ICON, LANDMARK_ICON, TILE_ICON, type IconName } from '@theme/icons';
import { namesOf, type Theme } from '@theme/tokens';
import type { Strings, TaughtId } from '@text/Strings';
import type { FigureId } from './figure';
import type { TipRow } from './view';

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
 * beat reads `s.lesson.ripe.stoneAsh(name)` rather than carrying the words,
 * so French and English can never disagree about when a rule applies, only
 * about how it is put. `name` and `terms` come from the same place, because
 * the tappable spelling of a concept is a fact of the language.
 */

/**
 * Every concept the game can teach.
 *
 * A superset of `TeachId` — the drip's ledger — because some concepts are
 * words the manual prints without ever firing a card for them. The extra six
 * are the ones `glossary.ts` added on 2026-08-27 for exactly that reason.
 */
export type LessonId =
  TeachId | 'pocket' | 'worth' | 'bounty' | 'stash' | 'sizeBonus' | 'stone' | 'find' | 'sacrifice';

/** How heavy a sentence is. Absent means `more`. */
export type Weight = 'core' | 'more' | 'card' | 'detail';

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
export type Beat = {
  readonly say: (t: Tuning, theme: Theme, s: Strings) => string | null;
  readonly at?: Weight;
};

export type Lesson = {
  /** One of the concepts the catalogue has words for — a subset of `LessonId`,
   *  because some teach ids are moments (`place`, `glow`) rather than terms. */
  readonly id: TaughtId;
  /** From one of the four mark registries only — never a literal shape. The
   *  registries name a Phosphor icon since 2026-08-30 (`@theme/icons`); before
   *  that they named a Unicode character, which is a request rather than a
   *  shape and which three of the marks were having answered by a wordmark
   *  font. */
  readonly icon?: IconName;
  /** MAGIC and UNIQUE keep the ink `rarityInked` already gives them. */
  readonly ink?: 'ink-magic' | 'ink-unique';
  readonly beats: readonly Beat[];
  /** A set this lesson lists — the four grounds, the purse's spends. */
  readonly rows?: (t: Tuning, theme: Theme, s: Strings) => readonly TipRow[];
  /**
   * The picture of this rule. Travels WITH the lesson, so every door that
   * teaches it draws the same one — which is the whole of Marc's ask.
   *
   * A lesson has a figure or rows, never both: a portrait teaching card
   * already runs icon, lead, body and button, and both together overflow it.
   * `lessons.test.ts` asserts it.
   */
  readonly figure?: FigureId;
};

/**
 * What this lesson is CALLED — the manual's heading, the teach card's lead,
 * the term card's title — in the language asked for.
 */
export const lessonName = (lesson: Lesson, s: Strings): string => s.lesson[lesson.id].name;

/**
 * UPPERCASE, longest first — the spellings `tips.ts`'s matcher alternates
 * over. An EMPTY list is a lesson with no tappable word, which is how the nine
 * concepts `glossary.ts` deliberately left out (`costRise`, `glow`, `field`,
 * `lens`, `purse`, `colours`, `place`, `wall`, `lastGasp`) can hold their
 * prose without becoming a button nobody could ever reach.
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
 * concepts: `ripen` is the `ripe` lesson's picture, `pop` is `pop`'s, `rare` is
 * MAGIC's, `stash` is THE STASH's.
 */
export const LESSONS: readonly Lesson[] = [
  /**
   * The worked example of the rule the registry runs on: **where a card and
   * the manual say one rule differently, the manual's sentence wins.** Its
   * prose is Marc's own 2026-08-27 concision pass ("be more concise and
   * simple, straight to the point, less words"); the cards were written
   * 2026-08-19/20 and revised piecemeal, and the newer human-reviewed wording
   * is the one to keep.
   */
  {
    id: 'ripe',
    icon: TILE_ICON,
    figure: 'ripen',
    beats: [
      { at: 'core', say: (_t, _theme, s) => s.lesson.ripe.core },
      {
        say: (t, theme, s) =>
          t.redAshMatches
            ? s.lesson.ripe.stoneAsh(namesOf(theme, s.locale).red)
            : s.lesson.ripe.stone,
      },
      {
        // Card only. The timing fork belongs at DISCOVERY (Marc, Day 2: "the
        // early vs pop explanation should come before our first pop success")
        // — the manual states it under POP, which a player meeting their first
        // ripe tile has not read.
        at: 'card',
        say: (t, _theme, s) =>
          t.luckPerPop > 0 && t.colourBiasDraws > 0
            ? s.lesson.ripe.cardLean
            : s.lesson.ripe.cardPlain,
      },
    ],
  },
  /*
   * The two ways to spend a pocket, side by side (2026-08-30).
   *
   * Both wear the mark their BUTTON wears — Marc: *"make em icons, associate in
   * how to play and cards too"* — so a flame on the action bar and the flame at
   * the head of this section are the same shape saying the same thing, and the
   * receipt a burn leaves wears it a third time.
   *
   * SACRIFICE had no lesson at all until this: the button has been on the board
   * since Stage 3 and nothing in either language said what pressing it does.
   * Its sentences are written from the DIALS, so a world where burning pays
   * nothing says nothing.
   */
  {
    id: 'pop',
    icon: CONCEPT_ICON.pop,
    figure: 'pop',
    beats: [{ at: 'core', say: (_t, _theme, s) => s.lesson.pop.core }],
  },
  {
    id: 'sacrifice',
    icon: CONCEPT_ICON.sacrifice,
    beats: [
      // What the action IS holds under every dial. A lesson may never go
      // silent — `lessons.test.ts` runs every one of them against BARE_TUNING
      // and this one said nothing at all for one build.
      { at: 'core', say: (_t, _theme, s) => s.lesson.sacrifice.core },
      // What it PAYS can be turned off, and then the sentence is not spoken:
      // the same rule `redAshMatches` and `holdSlots` follow. A world where
      // burning pays nothing is not told that it pays relics.
      {
        at: 'core',
        say: (t, _theme, s) => (t.burnRelics > 0 ? s.lesson.sacrifice.pays : null),
      },
    ],
  },
  { id: 'pocket', beats: [{ at: 'core', say: (_t, _theme, s) => s.lesson.pocket.core }] },
  { id: 'worth', beats: [{ at: 'core', say: (_t, _theme, s) => s.lesson.worth.core }] },
  {
    id: 'cache',
    icon: LANDMARK_ICON.cache,
    beats: [
      {
        at: 'core',
        say: (t, _theme, s) =>
          t.cachePaysPerRing > 0
            ? s.lesson.cache.coreRing(t.cachePays, t.cachePaysPerRing)
            : s.lesson.cache.core(t.cachePays),
      },
    ],
  },
  {
    id: 'site',
    icon: LANDMARK_ICON.site,
    beats: [{ at: 'core', say: (t, _theme, s) => s.lesson.site.core(t.sitePays) }],
  },
  {
    id: 'shrine',
    icon: LANDMARK_ICON.shrine,
    beats: [{ at: 'core', say: (_t, _theme, s) => s.lesson.shrine.core }],
  },
  {
    id: 'territory',
    icon: LANDMARK_ICON.territory,
    beats: [
      {
        at: 'core',
        say: (t, _theme, s) =>
          s.lesson.territory.core(t.territoryRadius, t.territoryTiles, t.territoryTilesCap),
      },
    ],
  },
  /**
   * A hidden find, which is a destination like the other four (2026-08-30).
   *
   * It had no lesson: `LESSON_FOR_REWARD` pointed `find` at RELICS, on the
   * argument that what a find gives you is a perk and RELICS is where the game
   * explains what you carry out of a run. True of the reward and wrong about
   * the QUESTION: a player tapping a shimmer is asking what that mark is, and
   * the answer they got was a paragraph about the end-screen shop. The legend
   * printed the same mismatch as a row reading "◈ RELICS".
   */
  {
    id: 'find',
    icon: LANDMARK_ICON.find,
    beats: [{ at: 'core', say: (_t, _theme, s) => s.lesson.find.core }],
  },
  {
    id: 'stone',
    icon: CONCEPT_ICON.stone,
    beats: [
      {
        at: 'core',
        say: (t, theme, s) =>
          t.redAshMatches
            ? s.lesson.stone.coreAsh(namesOf(theme, s.locale).red)
            : s.lesson.stone.core,
      },
    ],
  },
  /**
   * The two rarities, and the sentence they share.
   *
   * "A placed rare tile wears a star" is true of both and belongs to neither,
   * so both carry it — a MAGIC card that did not say it would be teaching half
   * a rule. The manual's RARE TILES section is COMPOSED of these two lessons
   * rather than being one of them, so it prints each core once and the shared
   * sentence once; sections were never one-lesson-shaped, and this is the pair
   * that proves it.
   */
  {
    id: 'rare',
    ink: 'ink-magic',
    icon: TILE_ICON,
    figure: 'rare',
    beats: [
      { at: 'core', say: (_t, _theme, s) => s.lesson.rare.core },
      { say: (_t, _theme, s) => s.rareStar },
      { at: 'card', say: (_t, _theme, s) => s.rareCard },
    ],
  },
  {
    id: 'rareUnique',
    ink: 'ink-unique',
    icon: TILE_ICON,
    figure: 'rare',
    beats: [
      { at: 'core', say: (_t, _theme, s) => s.lesson.rareUnique.core },
      { say: (_t, _theme, s) => s.rareStar },
      { at: 'card', say: (_t, _theme, s) => s.rareCard },
    ],
  },
  {
    id: 'luck',
    icon: CONCEPT_ICON.luck,
    beats: [{ at: 'core', say: (_t, _theme, s) => s.lesson.luck.core }],
  },
  {
    id: 'relic',
    icon: CONCEPT_ICON.relic,
    beats: [{ at: 'core', say: (_t, _theme, s) => s.lesson.relic.core }],
  },
  {
    id: 'bounty',
    icon: LANDMARK_ICON.site,
    beats: [
      {
        at: 'core',
        say: (t, _theme, s) => s.lesson.bounty.core(t.questNeed, t.questRadius, t.questBonus),
      },
    ],
  },
  {
    id: 'stash',
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
  {
    id: 'sizeBonus',
    beats: [
      {
        at: 'core',
        say: (t, _theme, s) =>
          t.harvestSizeCap > 0
            ? s.lesson.sizeBonus.coreCapped(t.harvestSizeCap)
            : s.lesson.sizeBonus.core,
      },
    ],
  },
];

/** One lesson by id, or `undefined` where no lesson has been written yet. */
export function lessonOf(id: LessonId): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}

/**
 * Which lesson explains which destination.
 *
 * One registry, because two screens ask the same question: the manual's legend
 * lists the five places, and a tap on the board opens the card for whatever
 * was tapped (2026-08-29, Marc: "make sure we can click on the map for caches,
 * shrines, etc. and we get the card explaining what it is"). It lived as a
 * private table inside `Legend.tsx` while the board had no way to ask at all —
 * so the answer existed in one place and was needed in two, which is how the
 * two come to disagree about what a `find` is called.
 *
 * **A FIND has its own lesson since 2026-08-30.** It used to map to RELICS, on
 * the argument that what a find gives you is a perk and RELICS is where this
 * game explains the things you carry out of a run. That is true of the reward
 * and wrong about the question being asked: a legend row reading "◈ RELICS"
 * names the mark after its consequence, and a tap on a find opened a card
 * about the end-screen currency instead of about the thing under the thumb.
 */
export const LESSON_FOR_REWARD: Readonly<
  Record<'cache' | 'site' | 'shrine' | 'territory' | 'find', LessonId>
> = {
  cache: 'cache',
  site: 'site',
  shrine: 'shrine',
  territory: 'territory',
  find: 'find',
};
