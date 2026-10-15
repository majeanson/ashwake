import { describe, expect, it } from 'vitest';
import { BARE_TUNING, COLOURS, TUNING, type Tuning } from '@content/tuning';
import { newRun } from '@engine/reduce';
import { PERKS, UPGRADES, upgradeText } from '@meta/progress';
import { SETTLEMENT } from '@theme/themes/settlement';
import { DAYLIGHT } from '@theme/themes/daylight';
import type { Theme } from '@theme/tokens';
import { STRINGS_EN } from '@text/en';
import { STRINGS_FR } from '@text/fr-CA';
import type { Strings } from '@text/Strings';
import {
  LESSONS,
  lessonCardDefine,
  lessonDefine,
  lessonDetail,
  lessonTerms,
  type Lesson,
} from './lessons';
import { perkRows } from './tips';
import { colourLesson, statNote, toHudView } from './view';

/**
 * The pins, written BEFORE the lesson registry moved a single string.
 *
 * `LOG.md` Session 46 records the method Marc's standing refactor order comes
 * with, and it is why that pipeline never broke anything: "pin tests asserting
 * today's EXACT strings were written and green BEFORE any code moved." This is
 * that step for the teaching layer — the one refactor here where the thing
 * being moved is PROSE, and prose has no typechecker.
 *
 * **Why snapshots, when this project has never used one.** Every other pin in
 * the repo is an inline `toBe('…')`, which is right for twelve strings and
 * wrong for this: the manual alone is ~500 lines of tuned copy, and inlining it
 * would make a 500-line assertion nobody reads and everybody rubber-stamps. A
 * snapshot is the same exact-string pin with the diff put where a human will
 * actually look at it. What makes it honest is procedural: **a changed snapshot
 * is never re-recorded silently — every intended change is listed in the commit
 * that makes it, and an unintended one is a bug.**
 *
 * **Two languages since 2026-08-28.** The English blocks are the ones first
 * recorded, and they passed UNCHANGED when the prose moved into `text/` —
 * which is how "the English did not move" was proved. The French blocks were
 * recorded once from the new catalogue and are Marc's review surface; a change
 * to them is a copy decision, listed in its commit like any other.
 */

const LANGUAGES: readonly Strings[] = [STRINGS_EN, STRINGS_FR];

/** The lessons with a tappable word — what the derived `GLOSSARY` used to be,
 *  restated here so these pins keep the exact keys they were first recorded
 *  under and the rename cannot masquerade as a prose change. */
const termed = (s: Strings): readonly Lesson[] =>
  LESSONS.filter((l) => lessonTerms(l, s).length > 0);

/** Both ends of the economy, so a pin catches a definition that silently
 *  stopped reading its dials. `BARE_TUNING` zeroes most systems, which is the
 *  branch half these strings have and nothing else exercises. */
const TUNINGS: readonly (readonly [string, Tuning])[] = [
  ['TUNING', TUNING],
  ['BARE_TUNING', BARE_TUNING],
];

/** Two directions, because a definition may name a terrain and the four names
 *  belong to the theme, not the game.
 *
 *  Both entries now show the same shape (D12, 2026-09-03): `daylight` was
 *  reskinned onto settlement's own names, so there is no shipped direction
 *  left whose power words differ from its ground names — the split pattern
 *  `torchlit` used to demonstrate is retired with it. Two entries stay rather
 *  than one so a regression that made them diverge again would still show up
 *  here as a snapshot diff. */
const THEMES: readonly (readonly [string, Theme])[] = [
  ['settlement', SETTLEMENT],
  ['daylight', DAYLIGHT],
];

/** The ids `statNote` switches on. Built by the stat row rather than carried
 *  on `HudView`, so the list is restated here — if a stat is ever added, this
 *  pin says nothing about it until it is added here too. */
const STAT_IDS = ['tiles', 'points', 'luck', 'map', 'cost', 'left'] as const;

describe.each(LANGUAGES.map((s) => [s.locale, s] as const))(
  'the teaching pins — every word, exactly as it reads today · %s',
  (_l, s) => {
    it('pins every glossary definition, over both tunings and both directions', () => {
      const out: Record<string, string> = {};
      for (const [tName, t] of TUNINGS) {
        for (const [themeName, theme] of THEMES) {
          for (const entry of termed(s)) {
            out[`${entry.id} · ${tName} · ${themeName}`] = lessonDefine(entry, t, theme, s);
          }
        }
      }
      expect(out).toMatchSnapshot();
    });

    it('pins every glossary entry’s terms, mark and ink', () => {
      expect(
        termed(s).map((e) => ({
          id: e.id,
          terms: lessonTerms(e, s),
          icon: e.icon ?? null,
          ink: e.ink ?? null,
        })),
      ).toMatchSnapshot();
    });

    /**
     * The perk cards, which the shop shelf and the find card both render.
     * `perkRows` is one of the two builders that already feed two hosts, so it
     * is the shape the registry is copying rather than inventing.
     */
    it('pins every perk’s rows, as both its hosts draw them', () => {
      expect(PERKS.map((perk) => ({ id: perk.id, rows: perkRows(perk.id, s) }))).toMatchSnapshot();
    });

    it('pins every shop upgrade’s name and note', () => {
      expect(
        UPGRADES.map((u) => ({
          id: u.id,
          name: upgradeText(u.id, s).name,
          note: upgradeText(u.id, s).note,
        })),
      ).toMatchSnapshot();
    });

    /*
     * Two of the five parallel colour sources — the two that are pure and
     * therefore reachable from here. The other three (`COLOUR_HELP`,
     * `POWER_NAMES`, the manual's own detail lines) were private to Ashwake 1's
     * `game.ts` and are pinned by the manual snapshot there.
     *
     * RE-RECORDED 2026-08-29, deliberately, and the comment that used to sit
     * on the line below is why it had to be.
     *
     * It read: *"`powerOf` takes no theme — it names a dial, not a terrain."*
     * True of the dial and false of the sentence. Two of the four clauses
     * named a ground in words no direction shows — "beside red", "per green
     * neighbour" — and the word in front came from one shared set containing
     * torchlit's own ASH and TIDE. Invisible while torchlit was the default;
     * nonsense the moment settlement became it, because the card said QUARRY
     * and the tip under it said "· ash: … beside red …".
     *
     * So the power line is per direction now and this pin loops directions for
     * it, which is what makes the difference between two fictions VISIBLE in a
     * file Marc reads rather than a thing you have to run the game to see.
     */
    it('pins the colour lessons and THE FOUR GROUNDS, over both tunings and both directions', () => {
      const out: Record<string, string | null> = {};
      for (const [tName, t] of TUNINGS) {
        for (const colour of COLOURS) {
          for (const [themeName, theme] of THEMES) {
            out[`lesson · ${colour} · ${tName} · ${themeName}`] = colourLesson(colour, t, theme, s);
          }
        }
      }
      // THE FOUR GROUNDS (2026-10-13): the one lesson that now holds every
      // ground sentence. Its rows are the rule plus the manual's two lines
      // under each; its DETAILS are the advice that holds for every ground.
      // The `power · …` keys this replaced were `powerOf`, deleted with it.
      const grounds = LESSONS.find((l) => l.id === 'grounds');
      if (grounds === undefined) throw new Error('THE FOUR GROUNDS is gone');
      for (const [tName, t] of TUNINGS) {
        for (const [themeName, theme] of THEMES) {
          for (const row of grounds.rows?.(t, theme, s) ?? []) {
            out[`grounds · ${row.colour} · ${tName} · ${themeName}`] = [
              row.text,
              ...(row.lines ?? []).map((line) => `${line.head} ${line.text}`),
            ].join(' | ');
          }
          out[`grounds · detail · ${tName} · ${themeName}`] = lessonDetail(
            grounds,
            t,
            theme,
            s,
          ).join(' | ');
        }
      }
      expect(out).toMatchSnapshot();
    });

    /**
     * THE MAP (2026-10-13): the one lesson that now holds the fog, its
     * destinations and the lens. Its `core` and first-contact card are pinned
     * as sentences; each row as the name, the words that open it, its sentence
     * and the manual-depth lines under it. These replace the glossary keys of
     * the eight lessons it absorbed (cache, site, shrine, territory, find,
     * bounty, field, lens).
     */
    it('pins THE MAP: its core, its card, and each row with its words and lines', () => {
      const map = LESSONS.find((l) => l.id === 'map');
      if (map === undefined) throw new Error('THE MAP is gone');
      const out: Record<string, string | readonly string[]> = {};
      out['name'] = s.lesson.map.name;
      out['terms'] = map.rowHeads?.(s).map((h) => `${h.key}: ${h.terms.join(', ')}`) ?? [];
      for (const [tName, t] of TUNINGS) {
        for (const [themeName, theme] of THEMES) {
          out[`map · ${tName} · ${themeName}`] = lessonDefine(map, t, theme, s);
          out[`card · ${tName} · ${themeName}`] = lessonCardDefine(map, t, theme, s);
          for (const row of map.rows?.(t, theme, s) ?? []) {
            out[`row · ${row.key} · ${tName} · ${themeName}`] = [
              row.name ?? '',
              row.text,
              ...(row.lines ?? []).map((line) => line.text),
            ].join(' | ');
          }
        }
      }
      // A territory on a board with no ledger says its other sentence.
      out['territory · no ledger'] =
        map
          .rows?.({ ...TUNING, territoryPays: TUNING.cachePays }, SETTLEMENT, s)
          .find((r) => r.key === 'territory')?.text ?? '';
      expect(out).toMatchSnapshot();
    });

    /**
     * MAGIC, LUCK and THE RUN'S END (2026-10-13): three concepts folded from
     * rare + rareUnique, luck + the purse's card, and costRise + relic (+ the
     * last gasp and the shop sentence). Each is pinned as its words, its first-
     * contact card and every row with the words that open it. The purse's card
     * (`purseLesson`) is LUCK's card and rows now, so its pin lives here.
     */
    it('pins MAGIC, LUCK and THE RUN’S END: names, terms, lessons, cards and rows', () => {
      const out: Record<string, string | readonly string[]> = {};
      for (const id of ['magic', 'luck', 'end'] as const) {
        const lesson = LESSONS.find((l) => l.id === id);
        if (lesson === undefined) throw new Error(`${id} is gone`);
        out[`${id} · name`] = s.lesson[id].name;
        out[`${id} · terms`] = [
          ...lessonTerms(lesson, s),
          ...(lesson.rowHeads?.(s).map((h) => `${h.key}: ${h.terms.join(', ')}`) ?? []),
        ];
        for (const [tName, t] of TUNINGS) {
          for (const [themeName, theme] of THEMES) {
            const at = `${tName} · ${themeName}`;
            out[`${id} · lesson · ${at}`] = lessonDefine(lesson, t, theme, s);
            out[`${id} · card · ${at}`] = lessonCardDefine(lesson, t, theme, s);
            out[`${id} · detail · ${at}`] = lessonDetail(lesson, t, theme, s).join(' | ');
            for (const row of lesson.rows?.(t, theme, s) ?? []) {
              out[`${id} · row · ${row.key} · ${row.colour ?? '-'} · ${at}`] = [
                row.name ?? '',
                row.text,
              ].join(' | ');
            }
          }
        }
      }
      expect(out).toMatchSnapshot();
    });

    /**
     * POP, THE EXPEDITION and CARAVAN (2026-10-13): seven lessons became POP
     * (RIPE, POCKET, WORTH, POP, SIZE BONUS, STONE, REACH), the manual's
     * hand-written opening and the Legend's last four rows became THE
     * EXPEDITION, and CARAVAN gained its tappable word. Each is pinned as its
     * words, its first-contact card, its figure and every row with the marks it
     * draws and the words that open it. The first-pop receipt's one reworded
     * French sentence is here too.
     */
    it('pins POP, THE EXPEDITION and CARAVAN: names, terms, lessons, cards, figures and rows', () => {
      const out: Record<string, string | readonly string[]> = {};
      for (const id of ['expedition', 'ripe', 'pop', 'caravan'] as const) {
        const lesson = LESSONS.find((l) => l.id === id);
        if (lesson === undefined) throw new Error(`${id} is gone`);
        out[`${id} · name`] = s.lesson[id].name;
        out[`${id} · terms`] = [
          ...lessonTerms(lesson, s),
          ...(lesson.rowHeads?.(s).map((h) => `${h.key}: ${h.name}: ${h.terms.join(', ')}`) ?? []),
        ];
        out[`${id} · figures`] = [lesson.figure ?? '-', lesson.manualFigure ?? '-'];
        for (const [tName, t] of TUNINGS) {
          for (const [themeName, theme] of THEMES) {
            const at = `${tName} · ${themeName}`;
            out[`${id} · lesson · ${at}`] = lessonDefine(lesson, t, theme, s);
            out[`${id} · card · ${at}`] = lessonCardDefine(lesson, t, theme, s);
            for (const row of lesson.rows?.(t, theme, s) ?? []) {
              out[`${id} · row · ${row.key} · ${at}`] = [
                row.name ?? '',
                row.text,
                row.ring ?? row.ground ?? row.icon ?? '',
              ].join(' | ');
            }
          }
        }
      }
      out['firstPop'] = s.view.harvest.firstPop;
      expect(out).toMatchSnapshot();
    });

    /**
     * The stat notes — the tap-a-number lesson — read off a real opening board
     * so the live clauses (the cost curve's current price, the luck conversion
     * rate) are in the pinned string rather than a placeholder.
     */
    it('pins every stat note on an opening board', () => {
      const out: Record<string, string> = {};
      for (const [tName, t] of TUNINGS) {
        const hud = toHudView(newRun(7, t), s);
        for (const id of STAT_IDS) out[`${id} · ${tName}`] = statNote(id, hud, t, s);
      }
      expect(out).toMatchSnapshot();
    });
  },
);
