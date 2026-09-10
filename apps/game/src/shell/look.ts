import { AUTO_THEME_ID, pickForScheme, resolveTheme } from '@theme/index';
import { rgba, type Theme, type ThemeId } from '@theme/tokens';

/**
 * WHAT THE BOARD LOOKS LIKE, DECIDED WITHOUT A SCREEN (`PASS.md` P2.5).
 *
 * The convention is `shell/signpost.ts`: **the pure decision leaves, the wiring
 * stays thin.** Three decisions lived inside `App`'s render and every one of
 * them is a function of its arguments — the dials off the query string, which
 * direction a device with no stored choice gets, and whether a vignette is
 * drawn at all. What stays in `App` is the part that cannot leave: the media
 * queries that SAMPLE the device, and the memos that decide when to ask again.
 *
 * That split is not cosmetic here. All three were untestable in place, and two
 * of them are look decisions with bug reports in their history — `?vignette=`
 * and `?ghost=` exist because a number that can only be argued with on a phone
 * needs a way to be argued with on a phone. A pure function is what lets the
 * NEXT change to one of them be checked before it reaches Marc's evening.
 */

/**
 * How the board looks unless a query string says otherwise.
 *
 * The tilt is Marc's, chosen from `docs/shots/`. The other four are WORKING
 * defaults rather than rulings (2026-08-29): the chrome is built around
 * whatever the board looks like, and building it over a board nobody has
 * chosen is the more expensive mistake. Every one still takes a number, so
 * `?light=0` is one keystroke away, and `DECISIONS.md` carries the question as
 * open until Marc has seen them on a phone.
 */
export const TILT = 35;
export const YAW = 0;
export const RELIEF = 0.35;
export const LIGHT = 1;
export const MATERIALS = 1;
export const ART = 1;

/**
 * A number off the query string, where zero is a real answer and `?x=` alone
 * or a word is not — so `?tilt=0` gives the map back rather than the default.
 *
 * **This docblock was orphaned in `App.tsx`** (found on the way out,
 * 2026-09-10): it sat directly above `economyAt`'s own docblock while `dial`
 * itself was declared thirty lines below, so a reader met the sentence
 * attached to the wrong function. Nothing was broken and nothing would ever
 * have said so — the kind of thing that only shows up when a region is picked
 * up and moved.
 *
 * **Exported, though this module is about the LOOK**, because two fixture flags
 * outside it read the query string the same way — `?taught=`, and `?place=`
 * and `?end=` in the boot ladder. What they share is not a look, it is the
 * RULE: zero is a real answer and a bare `?x=` or a word is not. A second
 * implementation of that would get `?end=0` wrong, which is a fixture silently
 * playing a whole run instead of none, so it is one function or it is a bug
 * waiting for somebody to write the obvious version.
 */
export function dial(params: URLSearchParams, name: string, fallback: number): number {
  const raw = params.get(name);
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

/** Every dial the query string can turn, resolved. */
export type Look = {
  readonly tilt: number;
  readonly yaw: number;
  readonly relief: number;
  readonly light: number;
  readonly materials: number;
  /** `?art=0` draws the procedural board even where a PNG exists. */
  readonly art: boolean;
  /** `?themes=1` puts a direction strip over the board — the workbench for the
   *  one look question that is not a number. */
  readonly directions: boolean;
  /**
   * `?vignette=` — the strength dial, added with the vignette itself
   * (2026-09-08) and for the reason every dial here exists: the number is a
   * LOOK decision and the only place it can be settled is a phone. Marc chose
   * 0.30 as the default from three options, sight unseen, and this is how he
   * disagrees with it without a rebuild.
   *
   * `NaN` means "use the direction's own", which is what `dial`'s fallback
   * gives when the parameter is absent — so a board with no `?vignette=` is
   * exactly the board the theme authors. `vignetteStyle` below is the only
   * reader and it treats any non-finite number that way.
   */
  readonly vignette: number;
  /**
   * `?ghost=` — how strongly a legal hex shows the colour you are holding.
   *
   * Same shape and same reason as `?vignette=`: a look change with a bug
   * report in its history wants a number that can be argued with on a phone,
   * and `?ghost=0` is the whole undo. `NaN` means the direction's own
   * `ghost.alpha`.
   */
  readonly ghost: number;
  /**
   * `?playtest=1` — the stranger console (Stage 6, 2026-09-08).
   *
   * A query flag rather than a route, and rather than a row anywhere:
   * `DECISIONS.md` D9 ruled out a router, and this is the `?ff=` class of
   * surface — an instrument with no place on a player's screen. It is also the
   * class where that matters most, because the one person who must never find
   * it is the stranger holding the phone.
   *
   * Off by default like every other dial here, so a shared `?seed=` link
   * cannot carry it.
   */
  readonly playtest: boolean;
};

/**
 * The dials, off a query string.
 *
 * Takes the search string rather than reading `location`, which is the whole
 * reason this is testable: `App` passes `location.search` once, at boot, and a
 * test passes whatever it wants to ask about.
 */
export function lookFrom(search: string): Look {
  const params = new URLSearchParams(search);
  return {
    tilt: dial(params, 'tilt', TILT),
    yaw: dial(params, 'yaw', YAW),
    relief: dial(params, 'relief', RELIEF),
    light: dial(params, 'light', LIGHT),
    materials: dial(params, 'materials', MATERIALS),
    art: dial(params, 'art', ART) > 0,
    directions: dial(params, 'themes', 0) > 0,
    vignette: dial(params, 'vignette', Number.NaN),
    ghost: dial(params, 'ghost', Number.NaN),
    playtest: dial(params, 'playtest', 0) > 0,
  };
}

/**
 * Which direction this device plays in.
 *
 * AUTO is the absence of a choice — what a fresh phone is set to — so the
 * device answers, through the two preferences it publishes. Both are FOLLOWED
 * rather than sampled once: all three used to be read at boot (and reduced
 * motion nowhere at all), which on a page that never reloads means a phone
 * crossing sunset keeps the direction it booted in. `useMediaQuery` carries
 * the `change` listener and this stays pure, because the shell is what samples.
 */
export const themeFor = (stored: ThemeId, wantsLight: boolean, wantsContrast: boolean): Theme =>
  stored === AUTO_THEME_ID
    ? resolveTheme(pickForScheme(wantsLight, wantsContrast))
    : resolveTheme(stored);

/**
 * The vignette as an inline style, or null where the direction wants none.
 *
 * A style rather than a stylesheet because both halves of it are the THEME's:
 * `daylight` authors `null` and must draw nothing at all, and the colour and
 * strength are numbers a direction owns. A CSS variable would put the "or
 * nothing" case in a stylesheet, which is the one place it cannot be expressed
 * without a second rule to turn the element off.
 *
 * `override` is `?vignette=` and it replaces the strength and nothing else —
 * the colour stays the direction's, because the dial exists to answer "how
 * much", which is the question Marc was asked. A strength of zero is `null`
 * rather than a transparent gradient: `?vignette=0` is meant to be the undo,
 * and an element that draws nothing is still an element.
 */
export function vignetteStyle(
  theme: Theme,
  override: number,
): { readonly background: string } | null {
  const authored = theme.board.vignette;
  if (authored === null) return null;
  const strength = Number.isFinite(override) ? override : authored.strength;
  if (strength <= 0) return null;
  return {
    // Clear through the middle, where the ground you have built is, and
    // reaching its full alpha only at the corners. `45%` is where the falloff
    // starts; inside that the board is untouched.
    background: `radial-gradient(ellipse at center, transparent 45%, ${rgba(
      authored.colour,
      strength,
    )} 100%)`,
  };
}
