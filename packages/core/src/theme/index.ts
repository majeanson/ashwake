import { DAYLIGHT } from './themes/daylight';
import { SETTLEMENT } from './themes/settlement';
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
 *
 * **Four again (2026-08-25), and for a different reason.** `torchlit-bright` and
 * `daylight` were not candidates and Gate E was not re-opened: they were the
 * same game at two other contrast levels, added because Marc could not read the
 * board on his phone.
 *
 * **Two again, and official (2026-09-03, D12).** Gate E chose `settlement` on
 * 2026-08-29 (D7); what stayed open was whether `torchlit`, its bright twin and
 * `placeholder` still earned a place in the bundle once a winner existed. They
 * did not: a losing direction sitting in the bundle forever is the exact
 * maintenance tax `cold-survey` and `rot-bloom` were deleted to avoid, and
 * `placeholder`'s job — `resolveTheme`'s fallback and the greyscale test's
 * control — needs no shipped theme at all, only a `Theme` value in scope (see
 * `themeOrDefault` below). The gap D7 wrote down and left open — *"the honest
 * fix is a bright settlement that passes the same budgets, not a line in
 * `pickForScheme`"* — is what `daylight` is now: settlement's own names and
 * rules, reskinned onto the palette that already passed `contrast.test.ts` at
 * the light end. `torchlit` and `torchlit-bright` are not archived — `git log`
 * is the archive — and reversing this decision means resurrecting a direction
 * from history first, same as the two names before them.
 */
export const THEMES: readonly Theme[] = [SETTLEMENT, DAYLIGHT];

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
 * There is one light direction rather than two, and — since D12 — exactly one
 * dark one to fall back to as well: `daylight`'s ink is already near-black on
 * vellum, 16.7:1, the highest contrast of any direction here, so a "high
 * contrast light" would have nothing left to raise, and a "high contrast dark"
 * has nowhere to be but the light one now that it IS a bright settlement
 * rather than an unrelated fiction.
 *
 * **The gap D7 wrote down is closed (2026-09-03, D12).** Until today the two
 * answers this function gave for a stated PREFERENCE did not follow the
 * default to `settlement`: contrast got `torchlit-bright` and light got
 * `daylight`, both of which were the plane, with the plane's ground names. A
 * player who needed contrast was the one player who did not get the fiction
 * the front door just told them — exactly the population this fork exists to
 * serve. `daylight` is settlement's own names and rules now, so both branches
 * answer the same way: the readable board and the right fiction, together.
 */
export function pickForScheme(prefersLight: boolean, prefersContrast: boolean): ThemeId {
  return prefersLight || prefersContrast ? 'daylight' : DEFAULT_THEME_ID;
}

/**
 * **SETTLEMENT is the direction (2026-08-29, D7; closed 2026-09-03, D12).**
 * Marc, on seeing it drawn in its own figures: *"i want to go this way since
 * its a strong theme and i feael like names of eahc color reveal what they do
 * too."*
 *
 * That second clause is the argument, and it is a mechanical one rather than a
 * taste one. FARM · MARKET · QUARRY · ROADS each name what their ground DOES —
 * fields cluster, a market pays for difference, a quarry eats stone, a road
 * pays for distance — where torchlit's MOSS and EMBER named what their ground
 * was made of and left the rule to be taught separately. A direction whose
 * names carry half the teaching is worth more than a direction that only sets
 * a mood, and the game has spent its whole life trying to teach four powers in
 * the first minute.
 *
 * `torchlit`, `torchlit-bright` and `placeholder` were carried for eleven
 * sessions as the direction Gate E might still choose, then for five more as a
 * fallback and an accessible dark option once it had. D12 closed the gate for
 * good: they are deleted, not archived — `git log` is the archive — and
 * `daylight` inherits both the fallback and the light-preference job, reskinned
 * onto settlement rather than left as a second, unrelated fiction. The game's
 * own story still says what torchlit used to draw: somebody stayed here, the
 * plane took it back, and you go out into it with a light — that fiction did
 * not need a second shipped palette to be told.
 *
 * `auto` is what a fresh phone stores, and `pickForScheme` sends it here only
 * when the OS is asking for neither light nor more contrast.
 *
 * Reversing this default is this one constant and the two launch surfaces that
 * follow it (`index.html`'s `theme-color`, the manifest's `background_color`,
 * and `scripts/social.ts`'s share card, all of which name a direction by hand
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
  // The registry is never empty — SETTLEMENT is a static import — but the type
  // system cannot know that, and a non-null assertion here would be the one place
  // this file lies about what it knows.
  return BY_ID.get(DEFAULT_THEME_ID) ?? SETTLEMENT;
}

/**
 * `?theme=daylight`.
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
