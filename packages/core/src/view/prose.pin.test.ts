import { describe, expect, it } from 'vitest';
import { BARE_TUNING, TUNING, type Tuning } from '@content/tuning';
import { GOALS } from '@content/goals';
import { disc, key, parse } from '@engine/hex';
import { newRun, reduce } from '@engine/reduce';
import { harvestValue, homeOf, legalPlacements, reachOf, ripeKeys } from '@engine/rules';
import type { GameState, HarvestChoice } from '@engine/state';
import { FEATURES, featureText } from '@meta/features';
import { SHED_LADDER, shedNote } from '@meta/shedLadder';
import { UNLOCKS, unlockLabel } from '@meta/world';
import { dailyBadge, recordDaily } from '@meta/daily';
import { DAYLIGHT } from '@theme/themes/daylight';
import { SETTLEMENT } from '@theme/themes/settlement';
import type { Theme } from '@theme/tokens';
import { STRINGS_EN } from '@text/en';
import { STRINGS_FR } from '@text/fr-CA';
import { ordinal } from '@text/format';
import type { Strings } from '@text/Strings';
import { FIGURES, figureCaption, type FigureId } from './figure';
import { LESSONS, lessonName } from './lessons';
import {
  describeHexOf,
  epitaphFor,
  harvestNote,
  pocketNote,
  purseLesson,
  rarityLine,
  toHudView,
  whatGlows,
} from './view';

/**
 * The second set of pins (2026-08-28), written BEFORE the prose moved into
 * `text/` — the same method `teaching.pin.test.ts` used before the lesson
 * registry moved a string. That file pinned what the registry was about to
 * touch; this one pins everything ELSE a player reads that the core produces:
 * the pocket and harvest receipts, the tap-a-hex descriptions, the epitaph
 * pools, the guide and hint lines, the purse card, the figure captions, and
 * the small labels in `meta/` and `content/`.
 *
 * In Ashwake 1 most of these were held by the manual snapshots in
 * `game.test.ts`, which did not come to this repo. Moving prose with no pin
 * under it is how a word changes without anybody deciding it should.
 *
 * The English blocks were recorded before the move and passed unchanged after
 * it — the proof the move was a move. The French blocks were recorded once
 * from the new catalogue and are Marc's review surface. **Neither is
 * re-recorded silently.**
 */

const LANGUAGES: readonly Strings[] = [STRINGS_EN, STRINGS_FR];

const TUNINGS: readonly (readonly [string, Tuning])[] = [
  ['TUNING', TUNING],
  ['BARE_TUNING', BARE_TUNING],
];
const THEMES: readonly (readonly [string, Theme])[] = [
  ['settlement', SETTLEMENT],
  ['daylight', DAYLIGHT],
];

/** Place along the rules' own order until something is ripe (or the run ends). */
function untilRipe(state: GameState): GameState {
  let run = state;
  for (let i = 0; i < 400 && run.phase === 'placing' && ripeKeys(run.cells).length === 0; i++) {
    const spot = legalPlacements(run.cells)[0];
    if (spot === undefined) return run;
    run = reduce(run, { type: 'PLACE', hex: spot });
  }
  return run;
}

/** Place until the run ends, whatever ends it. */
function untilEnded(state: GameState): GameState {
  let run = state;
  for (let i = 0; i < 600 && run.phase === 'placing'; i++) {
    const spot = legalPlacements(run.cells)[0];
    if (spot === undefined) return run;
    run = reduce(run, { type: 'PLACE', hex: spot });
  }
  return run;
}

describe.each(LANGUAGES.map((s) => [s.locale, s] as const))(
  'the prose pins — every other word, exactly as it reads today · %s',
  (_l, s) => {
    it('pins the pocket note and every harvest receipt on a ripe board', () => {
      const out: Record<string, string> = {};
      for (const [tName, t] of TUNINGS) {
        const run = untilRipe(newRun(11, t));
        const ripe = ripeKeys(run.cells);
        if (ripe.length === 0) continue;
        const at = ripe[0]!;
        out[`pocket · ${tName}`] = pocketNote(run, at, s);
        const value = harvestValue(run, at);
        const choices: readonly HarvestChoice[] = ['tiles', 'points', 'treasure', 'burn'];
        for (const choice of choices) {
          out[`harvest · ${choice} · ${tName}`] = harvestNote(run, choice, value, s);
        }
      }
      expect(out).toMatchSnapshot();
    });

    it('pins every sentence in both epitaph pools, and the spent one', () => {
      const out = new Set<string>();
      const ended = untilEnded(newRun(3, TUNING));
      for (let placements = 0; placements < 64; placements++) {
        for (const death of ['broke', 'walled'] as const) {
          out.add(epitaphFor({ ...ended, phase: 'ended', death, placements }, s));
        }
      }
      out.add(epitaphFor({ ...ended, phase: 'ended', death: 'spent', placements: 9 }, s));
      // Every tile popped: the other branch of the spent sentence.
      const cells = Object.fromEntries(
        Object.entries(ended.cells).map(([k, c]) => [
          k,
          c.kind === 'tile' ? { kind: 'stone' as const } : c,
        ]),
      );
      out.add(epitaphFor({ ...ended, cells, phase: 'ended', death: 'spent', placements: 9 }, s));
      expect([...out].sort()).toMatchSnapshot();
    });

    it('pins the guide, hint, odds and what-still-glows lines', () => {
      const out: Record<string, string | null> = {};
      for (const [tName, t] of TUNINGS) {
        const fresh = newRun(5, t);
        const ripe = untilRipe(fresh);
        const low = { ...ripe, tiles: 1 };
        const ended = untilEnded(fresh);
        for (const [name, run] of [
          ['fresh', fresh],
          ['ripe', ripe],
          ['low', low],
          ['ended', ended],
        ] as const) {
          const hud = toHudView(run, s);
          out[`guide · ${name} · ${tName}`] = hud.guide;
          out[`hint · ${name} · ${tName}`] = hud.hint;
          out[`odds · ${name} · ${tName}`] = hud.odds;
          out[`glows · ${name} · ${tName}`] = hud.glowBeyondEdge;
        }
        const reach = reachOf(ended);
        out[`whatGlows · at edge · ${tName}`] = whatGlows(ended, reach, s);
      }
      expect(out).toMatchSnapshot();
    });

    it('pins the rarity lines', () => {
      expect([
        rarityLine('magic', s),
        rarityLine('unique', s),
        rarityLine(undefined, s),
      ]).toMatchSnapshot();
    });

    it('pins the purse card over both tunings and both directions', () => {
      const out: Record<string, unknown> = {};
      for (const [tName, t] of TUNINGS) {
        for (const [themeName, theme] of THEMES) {
          out[`${tName} · ${themeName}`] = purseLesson(t, theme, s);
        }
      }
      expect(out).toMatchSnapshot();
    });

    /**
     * The tap-a-hex answers, over a played board and the dark around it: every
     * cell the run has, plus every hex within three of its reach — which is
     * where the beacons, the remembered ground and the plain dark all answer.
     */
    it('pins what tapping a hex says, on and off the board', () => {
      const out: Record<string, string> = {};
      for (const [tName, t] of TUNINGS) {
        const run = untilEnded(newRun(21, t));
        const home = homeOf(run);
        const around = disc(reachOf(run) + 3).map((h) => key(home.q + h.q, home.r + h.r));
        const memory = around.filter((_, i) => i % 7 === 0);
        for (const detour of [false, true]) {
          const ctx = {
            state: run,
            theme: SETTLEMENT,
            strings: s,
            detour,
            shrinesClaimed: 0,
            unlockLabel: (nth: number) => {
              const id = UNLOCKS[nth]?.id;
              return id === undefined ? null : unlockLabel(id, s);
            },
            memory,
            ...(detour ? {} : { crossingDowry: () => 40 }),
          };
          const seen = new Map<string, string>();
          for (const hex of around) {
            const said = describeHexOf(ctx, hex);
            // One example per distinct sentence, keyed by its first hex, so the
            // snapshot is a list of the sentences rather than a map of a world.
            if (!seen.has(said)) seen.set(said, hex);
          }
          for (const [said, hex] of seen) {
            const { q, r } = parse(hex);
            out[`${tName} · ${detour ? 'detour' : 'home'} · ${q},${r}`] = said;
          }
        }
      }
      expect(out).toMatchSnapshot();
    });

    it('pins the figure captions and the lesson names', () => {
      expect({
        captions: Object.fromEntries(
          (Object.keys(FIGURES) as FigureId[]).map((id) => [id, figureCaption(id, s)]),
        ),
        names: LESSONS.map((l) => [l.id, lessonName(l, s)]),
        shared: { LUCK_CORE: s.luckCore, RARE_STAR: s.rareStar, LAST_GASP_RULE: s.lastGaspRule },
      }).toMatchSnapshot();
    });

    /*
     * The tagline and the story were RE-RECORDED on 2026-08-29, deliberately
     * and once, and the tagline is gone entirely as of 2026-09-03 — folded
     * into the story's own opening line rather than kept as a second copy of
     * the same sentence (see `Strings.ts`'s `story` doc comment).
     *
     * `CLAUDE.md`: "The English snapshots are never re-recorded silently; the
     * French ones are Marc's review surface." This is the not-silent version.
     * Marc chose the settlement as the direction (`DECISIONS.md` D7, closed),
     * so the game's frame moved from "an expedition into a dark plane" to a
     * place somebody stayed in.
     *
     * The VERBS did not move — "place, ripen, pop, and push on" is the
     * glossary's (D4.3) and is what the player actually does — but the
     * instructional half is not kept as its own sentence any more: a teaching
     * card already covers those verbs, and the rule this passage holds to is
     * that it teaches none.
     */
    it('pins the small labels: goals, unlocks, the shed ladder, features, the story', () => {
      expect({
        goals: GOALS.map((g) => [g.id, s.goal[g.id]]),
        unlocks: UNLOCKS.map((u) => [u.id, unlockLabel(u.id, s)]),
        shed: SHED_LADDER.map((r) => [r.id, shedNote(r.id, s)]),
        features: FEATURES.map((f) => [
          f.id,
          featureText(f.id, s).label,
          featureText(f.id, s).note,
        ]),
        story: s.story,
      }).toMatchSnapshot();
    });

    it('pins the daily badge and the ordinals', () => {
      const once = recordDaily({}, '2026-08-26', 900).book;
      const twice = recordDaily(once, '2026-08-26', 400).book;
      expect({
        badges: [
          dailyBadge({}, '2026-08-26', s),
          dailyBadge(once, '2026-08-26', s),
          dailyBadge(twice, '2026-08-26', s),
          dailyBadge({}, '2026-08-20', s),
        ],
        ordinals: Array.from({ length: 25 }, (_, i) => ordinal(i + 1, s.locale)),
      }).toMatchSnapshot();
    });
  },
);
