import { describe, expect, it } from 'vitest';
import { BARE_TUNING, COLOURS, TUNING, type Tuning } from '@content/tuning';
import { newRun } from '@engine/reduce';
import { PERKS, UPGRADES, upgradeText } from '@meta/progress';
import { DAYLIGHT } from '@theme/themes/daylight';
import { TORCHLIT } from '@theme/themes/torchlit';
import type { Theme } from '@theme/tokens';
import { STRINGS_EN } from '@text/en';
import { STRINGS_FR } from '@text/fr-CA';
import type { Strings } from '@text/Strings';
import { LESSONS, lessonDefine, lessonTerms, type Lesson } from './lessons';
import { perkRows } from './tips';
import { colourLesson, powerOf, statNote, toHudView } from './view';

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
 *  belong to the theme, not the game. */
const THEMES: readonly (readonly [string, Theme])[] = [
  ['torchlit', TORCHLIT],
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

    it('pins every glossary entry’s terms, glyph and ink', () => {
      expect(
        termed(s).map((e) => ({
          id: e.id,
          terms: lessonTerms(e, s),
          glyph: e.glyph ?? null,
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

    /**
     * Two of the five parallel colour sources — the two that are pure and
     * therefore reachable from here. The other three (`COLOUR_HELP`,
     * `POWER_NAMES`, the manual's own detail lines) were private to Ashwake 1's
     * `game.ts` and are pinned by the manual snapshot there.
     */
    it('pins the colour lessons and powers, over both tunings and both directions', () => {
      const out: Record<string, string | null> = {};
      for (const [tName, t] of TUNINGS) {
        for (const colour of COLOURS) {
          // `powerOf` takes no theme — it names a dial, not a terrain.
          out[`power · ${colour} · ${tName}`] = powerOf(colour, t, s);
          for (const [themeName, theme] of THEMES) {
            out[`lesson · ${colour} · ${tName} · ${themeName}`] = colourLesson(colour, t, theme, s);
          }
        }
      }
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
