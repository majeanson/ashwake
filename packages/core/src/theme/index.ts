import { DAYLIGHT } from './themes/daylight';
import { SETTLEMENT } from './themes/settlement';
import { PLACEHOLDER } from './themes/placeholder';
import { TORCHLIT } from './themes/torchlit';
import { TORCHLIT_BRIGHT } from './themes/torchlit-bright';
import type { Theme, ThemeId } from './tokens';

/**
 * The registry.
 *
 * Adding a direction is one file and one line here. Nothing else in the codebase
 * names a theme — the renderer takes one as an argument, the chrome reads its
 * tokens through CSS variables, and `main.ts` resolves the id at the edge exactly
 * the way it already resolves feature flags and the seed.
 *
 * **Two directions, not four (2026-08-19, `WORKPLAN.md` Stage 1).** `cold-survey`
 * and `rot-bloom` were the two directions Gate E did not choose — carried since
 * 2026-08-15 so the choice could be re-argued by looking rather than by memory,
 * which it was, repeatedly, and the answer never moved. They are deleted, not
 * archived: `git log` is the archive, and a losing direction sitting in the
 * bundle forever is a maintenance tax on a decision that is not coming back.
 * `PLACEHOLDER` stays — it is `resolveTheme`'s own fallback and the greyscale
 * test's control, not a direction competing to be chosen.
 *
 * **Four again (2026-08-25), and for a different reason.** `torchlit-bright` and
 * `daylight` are not candidates and Gate E is not re-opened: they are the same
 * game at two other contrast levels, added because Marc could not read the board
 * on his phone. A losing direction in the bundle is a maintenance tax; an
 * ACCESSIBLE one is the product working for someone it did not work for. The
 * difference is that these two answer to `pickForScheme` and to
 * `contrast.test.ts`, and a candidate direction answers to taste.
 */
export const THEMES: readonly Theme[] = [
  PLACEHOLDER,
  TORCHLIT,
  TORCHLIT_BRIGHT,
  DAYLIGHT,
  SETTLEMENT,
];

/**
 * `auto` — let the device answer (2026-08-25).
 *
 * Not a theme and deliberately not in `THEMES`: it is the ABSENCE of a choice,
 * and it is what a phone that has never opened the settings panel is set to. The
 * stored value is a `ThemeId` like any other, so `resolveTheme` still falls back
 * for it the way it falls back for a typo; `main.ts` checks for it first and
 * calls `pickForScheme` instead.
 */
export const AUTO_THEME_ID = 'auto';

/**
 * Which direction a device that has not chosen one should open in.
 *
 * Pure, and takes the two media queries as booleans rather than reading them,
 * for the reason this whole folder is built on: it is testable without a
 * browser. `main.ts` samples `matchMedia` at the edge and hands the answers in.
 *
 * There is one light direction rather than two. `daylight`'s ink is already
 * near-black on vellum — 16.7:1, the highest contrast of any direction here —
 * so a "high contrast light" would have nothing left to raise. The dark side
 * needs both because torchlit's whole argument is atmosphere, and atmosphere is
 * exactly what a player asking for more contrast is asking to be spared.
 *
 * **A gap this opens, written down rather than papered over (2026-08-29).**
 * The default moved to `settlement`, and the two answers this function gives
 * for a stated PREFERENCE did not: a device asking for more contrast still
 * gets `torchlit-bright`, and a device asking for light still gets `daylight`
 * — both of which are the plane, with the plane's ground names. So the player
 * who needs contrast is the one player who does not get the fiction the front
 * door just told them, and that is exactly the population this fork exists to
 * serve. The honest fix is a bright settlement, which is a palette that has to
 * pass the same budgets rather than a line here; until it exists this stays,
 * because a readable board in the wrong fiction beats an unreadable one in the
 * right one.
 */
export function pickForScheme(prefersLight: boolean, prefersContrast: boolean): ThemeId {
  if (prefersLight) return 'daylight';
  return prefersContrast ? 'torchlit-bright' : DEFAULT_THEME_ID;
}

/**
 * **Torchlit is the direction, chosen 2026-08-15 when Gate E opened.**
 *
 * For eleven sessions this line read `placeholder`, because Gate E is "no art
 * direction until A–D pass" and shipping one early would have been deciding
 * it. A, C and D are signed; B is structurally fixed and waiting only on a
 * human's logged pops (LOG.md, Session 11). The gate opened; this is the
 * decision it was holding.
 *
 * Torchlit wins on fit rather than taste, and the fit is not a coincidence —
 * the game grew toward it. Its own note says "the map is endless because the
 * darkness is", and the map became endless. Its light-pool was written to do
 * the fog-of-war job, and fog memory now needs exactly that: known ground
 * lit, remembered ground dim, destinations glowing through the dark. Its
 * register is the one the rarity system already speaks in — magic and unique
 * are Diablo's words, and Diablo is what the direction is named after.
 *
 * Reversible in principle, not in a tap any more (2026-08-20, the fresh-eyes
 * review, correcting this paragraph's own claim): the two losing directions
 * were deleted 2026-08-19 — see `THEMES` above — so `?theme=` switches only
 * between torchlit and the placeholder now, and reversing the DECISION would
 * mean resurrecting a direction from git history first. A default is still a
 * decision, not a cage; the cage just has fewer doors than this line used to
 * say.
 *
 * Still the default on 2026-08-25, when two more directions arrived — but it is
 * now the default only for a device that has not said otherwise. `auto` is what
 * a fresh phone stores, and `pickForScheme` sends it here only when the OS is
 * asking for neither light nor more contrast.
 *
 * ---
 *
 * **SETTLEMENT is the direction, chosen 2026-08-29 (D7 closed).** Marc, on
 * seeing it drawn in its own figures: *"i want to go this way since its a
 * strong theme and i feael like names of eahc color reveal what they do too."*
 *
 * That second clause is the argument, and it is a mechanical one rather than a
 * taste one. FARM · MARKET · QUARRY · ROADS each name what their ground DOES —
 * fields cluster, a market pays for difference, a quarry eats stone, a road
 * pays for distance — where MOSS and EMBER name what their ground is made of
 * and leave the rule to be taught separately. A direction whose names carry
 * half the teaching is worth more than a direction that only sets a mood, and
 * the game has spent its whole life trying to teach four powers in the first
 * minute.
 *
 * Torchlit is not deleted and is not demoted from anything it was good at: it
 * is one tap away in SETTINGS, it is still what the plane looks like at night,
 * and the game's own story now says so out loud (`text/*.ts#story`) — somebody
 * stayed here, the plain took it back, and you go out into it with a light.
 * The fiction did not have to choose; the DOOR did.
 *
 * Reversing this is this one constant and the two launch surfaces that follow
 * it (`index.html`'s `theme-color`, the manifest's `background_color`, and
 * `scripts/social.ts`'s share card, all of which name a direction by hand
 * because they run before any of this does).
 */
export const DEFAULT_THEME_ID: ThemeId = 'settlement';

const BY_ID = new Map(THEMES.map((t) => [t.id, t]));

/*  removed 2026-08-21 — unused; callers map THEMES themselves. */

/**
 * Unknown ids fall back rather than throw: a stale bookmark, a typo on a phone
 * keyboard, or a direction deleted since the link was shared should all still
 * load a playable game.
 */
export function resolveTheme(id: string | null | undefined): Theme {
  if (typeof id !== 'string') return themeOrDefault(DEFAULT_THEME_ID);
  return themeOrDefault(id);
}

function themeOrDefault(id: string): Theme {
  const found = BY_ID.get(id);
  if (found !== undefined) return found;
  // The registry is never empty — PLACEHOLDER is a static import — but the type
  // system cannot know that, and a non-null assertion here would be the one place
  // this file lies about what it knows.
  return BY_ID.get(DEFAULT_THEME_ID) ?? PLACEHOLDER;
}

/**
 * `?theme=torchlit`.
 *
 * Same reasoning as `?ff=` and `?seed=`: testing happens on the deployed site
 * from a phone, where the address bar is the only console there is. Switching art
 * direction has to be something you can do standing up, outdoors, without a
 * laptop — that is the whole test the gate is waiting on.
 */
export function parseThemeId(search: string): ThemeId | null {
  const raw = new URLSearchParams(search).get('theme');
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
}

export * from './assets';
export * from './css';
export * from './tokens';
