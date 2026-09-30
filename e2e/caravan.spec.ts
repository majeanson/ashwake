import { expect, test } from '@playwright/test';
import { begin, watchErrors } from './helpers';

/*
 * THE CARAVAN, on a real board (2026-09-29; `screens/Caravan.tsx`). The rule is
 * pinned in the core and the picker's wiring in `caravan.test.tsx`; what only a
 * browser can say is that the ask is ON SCREEN from the first placement, under
 * the header, where a size to aim for has to be read before the pocket exists.
 */
test('the caravan says what it wants from the first placement', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1');
  await begin(page);
  const ask = page.locator('[data-hud="caravan"]');
  await expect(ask).toBeVisible();
  await expect(ask).toContainText(/CARAVAN|CARAVANE/);
  await expect(ask).toContainText(/\d/);

  // Under the header, not over the board's own controls.
  const header = await page.locator('[data-hud="stats"]').boundingBox();
  const line = await ask.boundingBox();
  expect(line!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
  expect(errors).toEqual([]);
});

/*
 * ONE LINE, AND ITS COUNTDOWN ON IT (2026-09-29). The ask ends with how long it
 * has left, so a line that overflows cuts the one number that says when to
 * hurry. It overflowed at 320 in both languages and at 360 in French on its
 * first build; the size follows the phone now, and this holds it there.
 */
for (const width of [320, 360, 390])
  for (const locale of ['en-US', 'fr-CA'])
    test(`the caravan's ask fits one line at ${width}px in ${locale}`, async ({ browser }) => {
      const ctx = await browser.newContext({ locale, viewport: { width, height: 740 } });
      const page = await ctx.newPage();
      await page.goto('/?seed=7&taught=1');
      await begin(page);
      const ask = page.locator('[data-hud="caravan"]');
      await expect(ask).toBeVisible();
      const fits = await ask.evaluate((e) => e.scrollWidth <= e.clientWidth + 1);
      expect(fits, `the ask overflows at ${width}px in ${locale}`).toBe(true);
      await ctx.close();
    });
