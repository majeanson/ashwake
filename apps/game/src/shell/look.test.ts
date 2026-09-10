import { describe, expect, it } from 'vitest';
import { AUTO_THEME_ID, THEMES } from '@theme/index';
import {
  ART,
  dial,
  LIGHT,
  lookFrom,
  MATERIALS,
  RELIEF,
  TILT,
  themeFor,
  vignetteStyle,
} from './look';

/**
 * THE LOOK'S THREE DECISIONS, NOW THAT THEY CAN BE ASKED (`PASS.md` P2.5).
 *
 * All three lived inside `App`'s render and none of them had a test, because
 * there was no way to call one. That is the whole return on the extraction: the
 * dials and the vignette are LOOK decisions with bug reports in their history,
 * and the next change to either can be checked before it reaches a phone.
 */

describe('the dials, off a query string', () => {
  it('gives the authored defaults for a bare URL', () => {
    const look = lookFrom('');
    expect(look.tilt).toBe(TILT);
    expect(look.relief).toBe(RELIEF);
    expect(look.light).toBe(LIGHT);
    expect(look.materials).toBe(MATERIALS);
    expect(look.art).toBe(ART > 0);
  });

  /*
   * ZERO IS A REAL ANSWER, which is the rule `dial` exists for and the reason
   * it is shared with the fixture flags. `?tilt=0` is how the board goes back
   * to being a map, and a `Number(raw) || fallback` would have handed back 35.
   */
  it('takes zero as an answer, not as an absence', () => {
    expect(lookFrom('?tilt=0').tilt).toBe(0);
    expect(lookFrom('?light=0').light).toBe(0);
    expect(lookFrom('?art=0').art).toBe(false);
    expect(lookFrom('?relief=0').relief).toBe(0);
  });

  it('ignores a bare parameter and a word', () => {
    expect(lookFrom('?tilt=').tilt).toBe(TILT);
    expect(lookFrom('?tilt=%20').tilt).toBe(TILT);
    expect(lookFrom('?tilt=flat').tilt).toBe(TILT);
    // `Infinity` parses as a finite-looking number to `Number` but is not
    // finite, and a camera tilted infinitely is a black screen.
    expect(lookFrom('?tilt=Infinity').tilt).toBe(TILT);
  });

  /*
   * The three flags are OFF unless a positive number says so, which is what
   * keeps a shared `?seed=` link from carrying the stranger console — the one
   * dial in the list with a person on the other side of it.
   */
  it('leaves every flag off by default, playtest included', () => {
    const bare = lookFrom('?seed=7');
    expect(bare.playtest).toBe(false);
    expect(bare.directions).toBe(false);
    expect(lookFrom('?playtest=1').playtest).toBe(true);
    expect(lookFrom('?playtest=0').playtest).toBe(false);
    expect(lookFrom('?playtest=yes').playtest).toBe(false);
  });

  /*
   * `NaN` is the MODE for the two theme-owned dials: absent means "use the
   * direction's own", which is different from zero, and zero is the undo.
   * `vignetteStyle` below is where that distinction is spent.
   */
  it('leaves the theme-owned dials non-finite when absent', () => {
    const bare = lookFrom('');
    expect(Number.isFinite(bare.vignette)).toBe(false);
    expect(Number.isFinite(bare.ghost)).toBe(false);
    expect(lookFrom('?vignette=0').vignette).toBe(0);
    expect(lookFrom('?ghost=0.5').ghost).toBe(0.5);
  });

  it('reads a number off a URL with other parameters in it', () => {
    expect(dial(new URLSearchParams('?seed=7&tilt=45&end=1'), 'tilt', TILT)).toBe(45);
    expect(dial(new URLSearchParams('?seed=7'), 'tilt', TILT)).toBe(TILT);
  });
});

describe('which direction a device plays in', () => {
  it('honours a stored choice over the device', () => {
    for (const theme of THEMES) {
      expect(themeFor(theme.id, true, false).id).toBe(theme.id);
      expect(themeFor(theme.id, false, true).id).toBe(theme.id);
    }
  });

  /*
   * AUTO is the absence of a choice, so the device decides — and it must
   * decide DIFFERENTLY for a phone asking for light than for one asking for
   * dark, or following the preference is not following it. `pickForScheme`
   * owns which; this owns that AUTO asks.
   */
  it('asks the device when nothing is stored, and the answer differs', () => {
    const light = themeFor(AUTO_THEME_ID, true, false);
    const dark = themeFor(AUTO_THEME_ID, false, false);
    expect(light.id).not.toBe(AUTO_THEME_ID);
    expect(light.id).not.toBe(dark.id);
  });

  it('answers a contrast preference too', () => {
    const plain = themeFor(AUTO_THEME_ID, false, false);
    const more = themeFor(AUTO_THEME_ID, false, true);
    expect(more.id).not.toBe(plain.id);
  });
});

describe('the vignette', () => {
  const authored = THEMES.filter((t) => t.board.vignette !== null);
  const none = THEMES.filter((t) => t.board.vignette === null);

  it('draws nothing at all for a direction that authors none', () => {
    // `daylight` is why this returns null rather than a transparent gradient:
    // an element that draws nothing is still an element.
    expect(none.length, 'no direction authors a null vignette any more').toBeGreaterThan(0);
    for (const theme of none) expect(vignetteStyle(theme, Number.NaN)).toBeNull();
  });

  it('uses the direction’s own strength when the dial is absent', () => {
    expect(authored.length, 'no direction authors a vignette any more').toBeGreaterThan(0);
    for (const theme of authored) {
      const style = vignetteStyle(theme, Number.NaN);
      expect(style, theme.id).not.toBeNull();
      // The authored alpha, spelled into the gradient.
      const alpha = theme.board.vignette?.strength ?? 0;
      expect(style?.background, theme.id).toContain(String(alpha));
    }
  });

  it('lets `?vignette=0` be the whole undo', () => {
    for (const theme of authored) expect(vignetteStyle(theme, 0), theme.id).toBeNull();
    for (const theme of authored) expect(vignetteStyle(theme, -1), theme.id).toBeNull();
  });

  /*
   * The dial replaces the STRENGTH and nothing else. The colour stays the
   * direction's, because the question Marc was asked was "how much".
   */
  it('overrides the strength and keeps the direction’s colour', () => {
    for (const theme of authored) {
      const own = vignetteStyle(theme, Number.NaN)?.background ?? '';
      const dialled = vignetteStyle(theme, 0.9)?.background ?? '';
      expect(dialled, theme.id).toContain('0.9');
      // Same gradient, same falloff, same three colour channels — only the
      // alpha moved. Comparing the leading `rgba(r,g,b` is what says so, and
      // `tokens#rgba` writes it with no spaces.
      const channels = /rgba\((\d+,\d+,\d+),/.exec(own)?.[1];
      expect(channels, theme.id).toBeDefined();
      expect(dialled, theme.id).toContain(String(channels));
    }
  });
});
