import { expect, test } from '@playwright/test';
import { begin, clearCards, placeOneTile, watchErrors } from './helpers';

/**
 * THE STRANGER CONSOLE, walked (Stage 6, 2026-09-08).
 *
 * `shell/playtest.test.ts` proves the sheet's arithmetic. What only a browser
 * can say is the part the unit tests cannot reach and the part that actually
 * fails on the night: that the facts record themselves off a REAL placement in
 * a REAL run, that the console is invisible without its flag, and that COPY
 * SHEET puts the sheet on the clipboard.
 *
 * It is tested at all because of what it costs to be wrong. Session C happens
 * once, beside a person who will not come back, and an instrument nobody
 * rehearsed is an instrument that is discovered to be broken at the only
 * moment it matters.
 */

test.use({ viewport: { width: 390, height: 844 } });

test('the console does not exist without its flag', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1&place=6');
  await begin(page);

  // The one person who must never find this is the stranger holding the phone.
  await expect(page.locator('[data-playtest="open"]')).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the four facts record themselves off a real run', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?playtest=1&seed=7&taught=1');
  await begin(page);

  const open = page.locator('[data-playtest="open"]');
  await expect(open, 'the console had no door under ?playtest=1').toBeVisible();

  /*
   * A REAL TAP, not `?place=n`.
   *
   * The fixed opening walks the reducer — `shell/walk.ts` dispatches straight
   * at the session — so it never travels the `act` seam a finger does, and the
   * sheet hangs off `act`. Testing it with the fixture would have proved
   * nothing about a stranger, which is the only thing this instrument is for.
   */
  await placeOneTile(page);
  await open.click();

  // PLACED answers itself, with a time on it. The other three have not
  // happened, and are absent rather than false.
  const placed = page.locator('[data-fact="placed"]');
  await expect(placed).toHaveAttribute('data-met', 'true');
  await expect(placed).toContainText(/\d+:\d\d/);
  await expect(page.locator('[data-fact="finished"]')).toHaveAttribute('data-met', 'false');
  await expect(page.locator('[data-fact="again"]')).toHaveAttribute('data-met', 'false');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a quote is written down, timed, and can be taken back', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?playtest=1&seed=7&taught=1&place=6');
  await begin(page);
  await clearCards(page);
  await page.locator('[data-playtest="open"]').click();

  const entry = page.locator('[data-playtest="entry"]');
  await entry.fill('what are the numbers for?');
  // ENTER lands the line, because the second thing somebody says arrives while
  // you are still writing the first.
  await entry.press('Enter');

  const notes = page.locator('.playtest-notes li');
  await expect(notes).toHaveCount(1);
  await expect(notes.first()).toContainText('what are the numbers for?');
  await expect(notes.first()).toContainText('ASKED');
  await expect(entry, 'the box kept the line after it was added').toHaveValue('');

  // The three lists are one control away from each other, always in the same
  // place: Marc is watching a person, not this screen.
  await page.locator('[data-kind="hesitated"]').click();
  await entry.fill('stared at the hand for a while');
  await page.locator('[data-playtest="add"]').click();
  await expect(notes).toHaveCount(2);

  // And the mis-tap comes back out.
  await notes.first().locator('[data-playtest="drop"]').click();
  await expect(notes).toHaveCount(1);
  await expect(notes.first()).toContainText('stared at the hand');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('COPY SHEET puts the whole sheet on the clipboard', async ({ page, browserName }) => {
  // Clipboard permissions are a Chromium-only fixture in Playwright — the same
  // limit `menus.spec.ts` records for the run hand-off.
  test.skip(browserName !== 'chromium', 'clipboard permissions are a Chromium-only fixture');
  const errors = watchErrors(page);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?playtest=1&seed=7&taught=1&place=6');
  await begin(page);
  await clearCards(page);
  await page.locator('[data-playtest="open"]').click();

  const entry = page.locator('[data-playtest="entry"]');
  await entry.fill('is it over?');
  await entry.press('Enter');

  await page.locator('[data-playtest="copy"]').click();
  await expect(page.locator('[data-playtest="copy"]')).toHaveText('COPIED');

  const sheet = await page.evaluate(() => navigator.clipboard.readText());
  // The same shape as PLAYTEST.md's own block, so the person reading this in a
  // week is not translating between two layouts.
  expect(sheet).toContain('SESSION C, THE STRANGER TEST');
  expect(sheet).toContain('1. PLACED A TILE UNAIDED');
  expect(sheet).toContain('← THE GATE');
  expect(sheet).toContain('is it over?');
  expect(sheet, 'the sheet did not name the direction it was played in').toMatch(
    /SKIN IT OPENED IN\s+\w+/,
  );

  expect(errors, errors.join('\n')).toEqual([]);
});
