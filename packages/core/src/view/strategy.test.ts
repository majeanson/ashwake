import { describe, expect, it } from 'vitest';
import { BARE_TUNING, COLOURS, TUNING, type Tuning } from '@content/tuning';
import { DAYLIGHT } from '@theme/themes/daylight';
import { SETTLEMENT } from '@theme/themes/settlement';
import type { Theme } from '@theme/tokens';
import { STRINGS_EN } from '@text/en';
import { STRINGS_FR } from '@text/fr-CA';
import type { Strings } from '@text/Strings';
import { groundGuide } from './strategy';
import { colourLesson } from './view';

/**
 * CHOOSING A GROUND (2026-10-12): the manual's COLOURS tab. Invariants, run in
 * both languages and both directions like the lesson registry's own.
 */

const LANGUAGES: readonly Strings[] = [STRINGS_EN, STRINGS_FR];
const THEMES: readonly Theme[] = [SETTLEMENT, DAYLIGHT];
const END = /[.!?]$/;

describe('the colours tab', () => {
  for (const s of LANGUAGES) {
    for (const theme of THEMES) {
      const where = `${s.locale} · ${theme.id}`;

      it(`gives every ground a rule, a reason to take it and a warning (${where})`, () => {
        const guide = groundGuide(TUNING, theme, s);
        expect(guide.grounds.map((g) => g.colour)).toEqual([...COLOURS]);
        for (const g of guide.grounds) {
          for (const text of [g.rule, g.pick, g.watch]) {
            expect(text.length, `${g.colour}`).toBeGreaterThan(20);
            expect(text, `${g.colour}: ${text}`).toMatch(END);
          }
        }
        for (const line of guide.general) expect(line).toMatch(END);
      });

      it(`says each ground\x27s rule in the card\x27s own words (${where})`, () => {
        for (const g of groundGuide(TUNING, theme, s).grounds) {
          expect(g.rule).toBe(colourLesson(g.colour, TUNING, theme, s));
        }
      });

      it(`teaches nothing about a ground whose power is off (${where})`, () => {
        const guide = groundGuide(BARE_TUNING, theme, s);
        expect(guide.grounds).toEqual([]);
        // The general advice still speaks: it is not about one power.
        expect(guide.general.length).toBeGreaterThan(0);
      });
    }
  }

  it('quotes the live tuning, not a copy of it', () => {
    const tweaked: Tuning = { ...TUNING, greenCrowdBonus: 1, blueTideEvery: 9, blueTideCap: 2 };
    const text = (t: Tuning) => groundGuide(t, SETTLEMENT, STRINGS_EN).grounds;
    const green = (t: Tuning) => text(t).find((g) => g.colour === 'green')!.pick;
    // A full green ring: six matches, five crowd bonuses on top.
    expect(green(TUNING)).toContain('9.5');
    expect(green(tweaked)).toContain('11');
    const blue = (t: Tuning) => text(t).find((g) => g.colour === 'blue')!;
    expect(blue(TUNING).pick).toContain('6 hexes');
    expect(blue(tweaked).pick).toContain('9 hexes');
    expect(blue(tweaked).pick).toContain('up to +2');
  });

  it('does not quote a full-ring figure for yellow where it counts distinct colours', () => {
    const distinct: Tuning = { ...TUNING, yellowCompanyAll: false };
    const yellow = (t: Tuning) =>
      groundGuide(t, SETTLEMENT, STRINGS_EN).grounds.find((g) => g.colour === 'yellow')!.pick;
    expect(yellow(TUNING)).toContain('worth 6');
    expect(yellow(distinct)).not.toMatch(/worth \d/);
  });
});
