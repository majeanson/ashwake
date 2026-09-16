import { expect, test } from '@playwright/test';
import { begin, watchErrors } from './helpers';

/**
 * WHY SOMEBODY COMES BACK (2026-09-09).
 *
 * Ashwake has no backend by ruling (D13): no account, no push, no email, no
 * store listing. So the entire reason a second session happens is three
 * sentences on one screen — the home-screen icon, the streak, and the warning
 * that a world lives in one place — and every one of them was **computed and
 * unprinted** or unreachable before today:
 *
 *   - `dailyStreak` has existed since Stage 4 and was shown on the front door
 *     only, which a player reads BEFORE playing;
 *   - the install offer is a BUTTON that opens Chrome's dialog, and iOS never
 *     fires one, so on an iPhone no screen in the game mentioned the home
 *     screen at all;
 *   - BACK UP is three taps deep behind SETTINGS, and the only proactive
 *     storage warning fires inside an in-app browser.
 *
 * This spec is the wiring check for all three, which is the class of bug this
 * repository keeps finding: **a rendered control is not a wired one**, and a
 * sentence nothing prints is worse, because there is nothing to notice.
 */

test.use({ viewport: { width: 390, height: 844 } });

test('a daily’s ending says what tomorrow is for', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?daily=2026-08-26&taught=1&end=1');
  await begin(page);
  await expect(page.locator('[data-hud="end"]')).toBeVisible();

  const streak = page.locator('[data-hud="streak"]');
  await expect(streak, 'a daily ended with no reason to come back').toBeVisible();
  // Day one of a streak has nothing to protect yet, so the honest line is an
  // invitation rather than a tally of one.
  await expect(streak).toContainText('tomorrow');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a world’s ending does not, because a world has no tomorrow', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1&end=1');
  await begin(page);
  await expect(page.locator('[data-hud="end"]')).toBeVisible();
  // The daily is the thing with a date. A world is there whenever you are, so
  // a "new board tomorrow" line would be false on it.
  await expect(page.locator('[data-hud="streak"]')).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

/**
 * The iOS install note, from the one side a desktop browser can test: that the
 * screen prints what the shell hands it, and prints nothing otherwise.
 *
 * The SNIFF itself — which phones get the sentence — is
 * `shell/install.test.ts`, against real user-agent strings. Playwright's
 * Chromium is not an iPhone and pretending otherwise would be a test of a lie;
 * what only a browser can prove is that the two paths are exclusive and that
 * neither leaves the screen empty.
 */
test('the install invitation is one path or the other, never both', async ({ page }) => {
  const errors = watchErrors(page);
  // On the FRONT DOOR since 2026-09-16 (Marc: "right away"), not the ending.
  await page.goto('/?taught=1');
  await expect(page.locator('[data-door="begin"]')).toBeVisible();

  // Chromium here fires no `beforeinstallprompt` on localhost and is not iOS,
  // so BOTH are absent — which is the state that must not be a broken screen.
  const button = page.locator('[data-action="install"]');
  const note = page.locator('[data-hud="hand-install"]');
  expect(
    (await button.count()) + (await note.count()),
    'the same invitation arrived twice',
  ).toBeLessThan(2);
  // And the door is still whole without either.
  await expect(page.locator('[data-door="menu"]')).toBeVisible();

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a world worth keeping is told it can be lost, once', async ({ page }) => {
  const errors = watchErrors(page);
  /*
   * `?runs=300` seeds world 1 three hundred runs deep, which is well past the
   * threshold — the note is about a place somebody has been building, and one
   * run is somebody trying the game.
   */
  await page.goto('/?runs=300&taught=1&end=1');
  await begin(page);
  await expect(page.locator('[data-hud="end"]')).toBeVisible();

  const note = page.locator('[data-hud="back-up"]');
  await expect(
    note,
    'a three-hundred-run world was never told it lives in one place',
  ).toBeVisible();
  // It names the door, because a warning with no verb is a warning that costs
  // a player something and gives them nothing.
  await expect(note).toContainText('BACK UP');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a fresh device is not warned about a world it has not built', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1&end=1');
  await begin(page);
  await expect(page.locator('[data-hud="end"]')).toBeVisible();
  // One run is somebody trying the game, and a warning that arrives before
  // there is anything to warn about is noise on the screen that decides
  // whether they press NEW RUN at all.
  await expect(page.locator('[data-hud="back-up"]')).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('a daily is not asked to protect a world it does not have', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?daily=2026-08-26&runs=300&taught=1&end=1');
  await begin(page);
  await expect(page.locator('[data-hud="end"]')).toBeVisible();
  // The device HAS a world worth keeping; this run is not in it, and the
  // ending of a daily is not the moment to talk about keeping one.
  await expect(page.locator('[data-hud="back-up"]')).toHaveCount(0);
  // The streak is what a daily's ending says instead.
  await expect(page.locator('[data-hud="streak"]')).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});
