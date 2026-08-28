import { describe, expect, it } from 'vitest';
import { BARE_TUNING, TUNING, type Tuning } from '@content/tuning';
import { GOALS } from '@content/goals';
import { disc, key, parse } from '@engine/hex';
import { newRun, reduce } from '@engine/reduce';
import { harvestValue, homeOf, legalPlacements, reachOf, ripeKeys } from '@engine/rules';
import type { GameState, HarvestChoice } from '@engine/state';
import { FEATURES } from '@meta/features';
import { TAGLINE } from '@meta/identity';
import { SHED_LADDER } from '@meta/shedLadder';
import { UNLOCKS } from '@meta/world';
import { dailyBadge, ordinal, recordDaily } from '@meta/daily';
import { DAYLIGHT } from '@theme/themes/daylight';
import { TORCHLIT } from '@theme/themes/torchlit';
import type { Theme } from '@theme/tokens';
import { FIGURES } from './figure';
import { LESSONS, LUCK_CORE, RARE_STAR } from './lessons';
import {
  LAST_GASP_RULE,
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
 * The second set of pins (2026-08-28), written BEFORE the prose moves into
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
 * These are English pins. When the French catalogue lands, the rule is the
 * same as for the lesson pins: **the English snapshot is never re-recorded
 * silently.** An unchanged English block after the move is the proof the move
 * was a move.
 */

const TUNINGS: readonly (readonly [string, Tuning])[] = [
  ['TUNING', TUNING],
  ['BARE_TUNING', BARE_TUNING],
];
const THEMES: readonly (readonly [string, Theme])[] = [
  ['torchlit', TORCHLIT],
  ['daylight', DAYLIGHT],
];

/** Place along the rules' own order until something is ripe (or the run ends). */
function untilRipe(state: GameState): GameState {
  let s = state;
  for (let i = 0; i < 400 && s.phase === 'placing' && ripeKeys(s.cells).length === 0; i++) {
    const spot = legalPlacements(s.cells)[0];
    if (spot === undefined) return s;
    s = reduce(s, { type: 'PLACE', hex: spot });
  }
  return s;
}

/** Place until the run ends, whatever ends it. */
function untilEnded(state: GameState): GameState {
  let s = state;
  for (let i = 0; i < 600 && s.phase === 'placing'; i++) {
    const spot = legalPlacements(s.cells)[0];
    if (spot === undefined) return s;
    s = reduce(s, { type: 'PLACE', hex: spot });
  }
  return s;
}

describe('the prose pins — every other word, exactly as it reads today', () => {
  it('pins the pocket note and every harvest receipt on a ripe board', () => {
    const out: Record<string, string> = {};
    for (const [tName, t] of TUNINGS) {
      const s = untilRipe(newRun(11, t));
      const ripe = ripeKeys(s.cells);
      if (ripe.length === 0) continue;
      const at = ripe[0]!;
      out[`pocket · ${tName}`] = pocketNote(s, at);
      const value = harvestValue(s, at);
      for (const choice of [
        'tiles',
        'points',
        'treasure',
        'burn',
      ] as const satisfies HarvestChoice[]) {
        out[`harvest · ${choice} · ${tName}`] = harvestNote(s, choice, value);
      }
    }
    expect(out).toMatchSnapshot();
  });

  it('pins every sentence in both epitaph pools, and the spent one', () => {
    const out = new Set<string>();
    const ended = untilEnded(newRun(3, TUNING));
    for (let placements = 0; placements < 64; placements++) {
      for (const death of ['broke', 'walled'] as const) {
        out.add(epitaphFor({ ...ended, phase: 'ended', death, placements }));
      }
    }
    out.add(epitaphFor({ ...ended, phase: 'ended', death: 'spent', placements: 9 }));
    // Every tile popped: the other branch of the spent sentence.
    const cells = Object.fromEntries(
      Object.entries(ended.cells).map(([k, c]) => [
        k,
        c.kind === 'tile' ? { kind: 'stone' as const } : c,
      ]),
    );
    out.add(epitaphFor({ ...ended, cells, phase: 'ended', death: 'spent', placements: 9 }));
    expect([...out].sort()).toMatchSnapshot();
  });

  it('pins the guide, hint, odds and what-still-glows lines', () => {
    const out: Record<string, string | null> = {};
    for (const [tName, t] of TUNINGS) {
      const fresh = newRun(5, t);
      const ripe = untilRipe(fresh);
      const low = { ...ripe, tiles: 1 };
      const ended = untilEnded(fresh);
      for (const [name, s] of [
        ['fresh', fresh],
        ['ripe', ripe],
        ['low', low],
        ['ended', ended],
      ] as const) {
        const hud = toHudView(s);
        out[`guide · ${name} · ${tName}`] = hud.guide;
        out[`hint · ${name} · ${tName}`] = hud.hint;
        out[`odds · ${name} · ${tName}`] = hud.odds;
        out[`glows · ${name} · ${tName}`] = hud.glowBeyondEdge;
      }
      const reach = reachOf(ended);
      out[`whatGlows · at edge · ${tName}`] = whatGlows(ended, reach);
    }
    expect(out).toMatchSnapshot();
  });

  it('pins the rarity lines', () => {
    expect([rarityLine('magic'), rarityLine('unique'), rarityLine(undefined)]).toMatchSnapshot();
  });

  it('pins the purse card over both tunings and both directions', () => {
    const out: Record<string, unknown> = {};
    for (const [tName, t] of TUNINGS) {
      for (const [themeName, theme] of THEMES) {
        out[`${tName} · ${themeName}`] = purseLesson(t, theme);
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
      const s = untilEnded(newRun(21, t));
      const home = homeOf(s);
      const around = disc(reachOf(s) + 3).map((h) => key(home.q + h.q, home.r + h.r));
      const memory = around.filter((_, i) => i % 7 === 0);
      for (const detour of [false, true]) {
        const ctx = {
          state: s,
          theme: TORCHLIT,
          detour,
          shrinesClaimed: 0,
          unlockLabel: (nth: number) => UNLOCKS[nth]?.label ?? null,
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
      captions: Object.fromEntries(Object.entries(FIGURES).map(([id, spec]) => [id, spec.caption])),
      names: LESSONS.map((l) => [l.id, l.name]),
      shared: { LUCK_CORE, RARE_STAR, LAST_GASP_RULE },
    }).toMatchSnapshot();
  });

  it('pins the small labels: goals, unlocks, the shed ladder, features, the tagline', () => {
    expect({
      goals: GOALS.map((g) => [g.id, g.label]),
      unlocks: UNLOCKS.map((u) => [u.id, u.label]),
      shed: SHED_LADDER.map((r) => [r.id, r.note]),
      features: FEATURES.map((f) => [f.id, f.label, f.note]),
      tagline: TAGLINE,
    }).toMatchSnapshot();
  });

  it('pins the daily badge and the ordinals', () => {
    const once = recordDaily({}, '2026-08-26', 900).book;
    const twice = recordDaily(once, '2026-08-26', 400).book;
    expect({
      badges: [
        dailyBadge({}, '2026-08-26'),
        dailyBadge(once, '2026-08-26'),
        dailyBadge(twice, '2026-08-26'),
        dailyBadge({}, '2026-08-20'),
      ],
      ordinals: Array.from({ length: 25 }, (_, i) => ordinal(i + 1)),
    }).toMatchSnapshot();
  });
});
