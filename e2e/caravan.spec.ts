import { expect, test } from '@playwright/test';
import { begin, watchErrors } from './helpers';

/*
 * THE CARAVAN, on a real board (2026-09-29; `screens/Caravan.tsx`). The rule is
 * pinned in the core and the picker's wiring in `caravan.test.tsx`; what only a
 * browser can say is that the line is ON SCREEN from the first placement, under
 * the header — and since 2026-09-30, that it says where the caravan is and not
 * one number about what it wants.
 */
test('the caravan says where it is from the first placement, and nothing it wants', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1');
  await begin(page);
  const ask = page.locator('[data-hud="caravan"]');
  await expect(ask).toBeVisible();
  await expect(ask).toContainText(/caravan|caravane/i);
  await expect(ask).not.toContainText(/\d/);

  // Under the header, not over the board's own controls.
  const header = await page.locator('[data-hud="stats"]').boundingBox();
  const line = await ask.boundingBox();
  expect(line!.y).toBeGreaterThanOrEqual(header!.y + header!.height - 1);
  expect(errors).toEqual([]);
});

/*
 * ONE LINE (2026-09-29). It overflowed at 320 in both languages and at 360 in
 * French on its first build, when it carried a size and a countdown; the size
 * follows the phone now, and this holds it there for every line it can say.
 */
for (const width of [320, 360, 390])
  for (const locale of ['en-US', 'fr-CA'])
    test(`the caravan's line fits one line at ${width}px in ${locale}`, async ({ browser }) => {
      const ctx = await browser.newContext({ locale, viewport: { width, height: 740 } });
      const page = await ctx.newPage();
      await page.goto('/?seed=7&taught=1');
      await begin(page);
      const ask = page.locator('[data-hud="caravan"]');
      await expect(ask).toBeVisible();
      const fits = await ask.evaluate((e) => e.scrollWidth <= e.clientWidth + 1);
      expect(fits, `the line overflows at ${width}px in ${locale}`).toBe(true);
      /*
       * And EVERY line each language can show (review, 2026-09-29): seed 7
       * opens on one of them, so the others were never measured. Written into
       * the real element, in its real style — copied from `text/en.ts` and
       * `text/fr-CA.ts`, which a wording change must update.
       */
      const longest =
        locale === 'fr-CA'
          ? [
              'La caravane est en route.',
              'LA CARAVANE EST EN VILLE',
              'La caravane a quitté la ville.',
              'CARAVANE · 3 marchandises en attente',
            ]
          : [
              'The caravan is on its way.',
              'THE CARAVAN IS IN TOWN',
              'The caravan left town.',
              'CARAVAN · 3 wares waiting',
            ];
      for (const text of longest) {
        const fitsLong = await ask.evaluate((e, t) => {
          const was = e.textContent;
          e.textContent = t;
          const ok = e.scrollWidth <= e.clientWidth + 1;
          e.textContent = was;
          return ok;
        }, text);
        expect(fitsLong, `"${text}" overflows at ${width}px`).toBe(true);
      }
      await ctx.close();
    });
