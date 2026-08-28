import { expect, test, type Page } from '@playwright/test';
import { assertLooksLikeAPicture, watchErrors } from './helpers';

/**
 * The real-browser smoke (Stage 2, 2026-08-28): nothing in the unit suite
 * renders a frame — there is no WebGL in vitest — so the whole class of
 * renderer crashes is invisible until a browser draws. This boots the
 * PRODUCTION build in headless Chromium, with WebGL actually rendering, walks
 * the first minute, and fails on any uncaught error.
 *
 * Portrait phone viewport, because that is the only screen that matters.
 */

test.use({ viewport: { width: 390, height: 844 } });

const tiles = async (page: Page): Promise<number> =>
  Number(await page.locator('[data-stat="tiles"] .stat-value').textContent());

/** Tap around the centre in widening rings until a placement lands. The
 *  opening board is one tile at the origin with six legal neighbours around
 *  it, so a ring at the hex pitch finds one. */
async function placeOneTile(page: Page): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (box === null) throw new Error('no canvas');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const before = await tiles(page);
  for (const radius of [40, 60, 80, 30, 100, 20, 120, 140]) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI / 6) * i;
      await page.mouse.click(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      if ((await tiles(page)) < before) return;
    }
  }
  throw new Error('placeOneTile: no legal hex found in the search rings');
}

test('boots, draws a board with WebGL, and takes a placement', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('[data-stat="tiles"] .stat-value')).not.toHaveText('');
  // Let the first frame and the font land.
  await page.waitForTimeout(600);

  const shot = await page.locator('canvas').screenshot();
  assertLooksLikeAPicture(shot, 'the opening board');

  const before = await tiles(page);
  await placeOneTile(page);
  expect(await tiles(page)).toBeLessThan(before);

  // The camera: zoom in, out, and back to the fit, with the board still live.
  await page.getByRole('button', { name: '+' }).click();
  await page.getByRole('button', { name: '−' }).click();
  await page.getByRole('button', { name: 'FIT' }).click();
  await page.waitForTimeout(400);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('speaks French to a French phone, English to an English one', async ({ browser }) => {
  for (const [locale, word] of [
    ['fr-CA', 'TUILES'],
    ['en-US', 'TILES'],
  ] as const) {
    const context = await browser.newContext({ locale, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/?seed=7');
    await expect(page.locator('[data-stat="tiles"]')).toContainText(word);
    await context.close();
  }
});

test('takes a placement with the board leaned and turned', async ({ page }) => {
  // The tap is a raycast now, not a hex-from-pixel inversion, so the angle is
  // exactly the thing that could quietly break it: at 45 degrees, turned 45
  // more, with the ground standing at different heights, a finger has to
  // still land on the hex under it.
  const errors = watchErrors(page);
  await page.goto('/?seed=7&place=12&tilt=45&yaw=45&relief=0.35');
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(600);
  const before = await tiles(page);
  await placeOneTile(page);
  expect(await tiles(page)).toBeLessThan(before);
  expect(errors, errors.join('\n')).toEqual([]);
});
