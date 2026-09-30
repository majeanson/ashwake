import { expect, test, type Page } from '@playwright/test';
import { begin, clearCards, watchErrors } from './helpers';
import { STRINGS_EN } from '../packages/core/src/text/en';
import { STRINGS_FR } from '../packages/core/src/text/fr-CA';

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
  // Its one mark, the storefront its card and manual section wear too.
  await expect(ask.locator('svg')).toHaveCount(1);

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
              'CARAVANE · EN ROUTE',
              'CARAVANE · EN VILLE',
              'CARAVANE · PARTIE',
              'CARAVANE · 3 MARCHANDISES EN ATTENTE',
            ]
          : [
              'CARAVAN · ON ITS WAY',
              'CARAVAN · IN TOWN',
              'CARAVAN · LEFT TOWN',
              'CARAVAN · 3 WARES WAITING',
            ];
      for (const text of longest) {
        // The mark stays in: it takes the line's room too (2026-09-30).
        const fitsLong = await ask.evaluate((e, t) => {
          const was = e.textContent;
          const mark = e.querySelector('svg');
          e.textContent = t;
          if (mark !== null) e.prepend(mark, ' ');
          const ok = e.scrollWidth <= e.clientWidth + 1;
          e.textContent = was;
          if (mark !== null) e.prepend(mark);
          return ok;
        }, text);
        expect(fitsLong, `"${text}" overflows at ${width}px`).toBe(true);
      }
      await ctx.close();
    });

/*
 * THE WHOLE LOOP, in a real browser (2026-09-30). The line, the rule and the
 * picker's wiring were each tested on their own; nothing walked a player from
 * IN TOWN through a pop, the picker and a ware to a run that is different
 * afterwards, and a mechanic wired in every part but one is exactly the kind
 * this repository has shipped inert before (`CLAUDE.md`).
 *
 * The seeds were found by walking the same session the page walks: at seed 9,
 * fourteen placements in, the caravan is in town and POP's pocket is the size
 * it wants, and its first offer includes ONE MORE CARD, whose effect the hand
 * shows at once. At seed 8, thirteen in, it is in town and POP's pocket of
 * three is the size it does not want.
 */
const TOOK = [STRINGS_EN.caravan.answered(1), STRINGS_FR.caravan.answered(1)];
const PASSED = [STRINGS_EN.caravan.passed, STRINGS_FR.caravan.passed];
/** Everything the toast and any card say right now, as one string. */
const said = async (page: Page): Promise<string> =>
  (await page.locator('.toast, .card-scrim').allInnerTexts()).join('\n');
const saysOneOf = (text: string, any: readonly string[]): boolean =>
  any.some((s) => text.includes(s));
const handCols = (page: Page) =>
  page
    .locator('[data-hud="hand"]')
    .evaluate((e) => Number(getComputedStyle(e).getPropertyValue('--hand-cols')));

test('a pop in town it takes buys a ware, and the ware is in the run', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=9&place=14&taught=1');
  await begin(page);
  await clearCards(page);
  const line = page.locator('[data-hud="caravan"]');
  await expect(line).toHaveAttribute('data-caravan', 'town');
  const before = await handCols(page);

  await page.locator('[data-action="pop"]').click();
  await expect.poll(async () => saysOneOf(await said(page), TOOK)).toBe(true);
  await clearCards(page);

  const picker = page.locator('[data-hud="caravan-picker"]');
  await expect(picker).toBeVisible();
  await expect(picker.locator('[data-ware]')).toHaveCount(3);
  await picker.locator('[data-ware="hand"]').click();

  await expect(picker).toBeHidden();
  await expect(line).toHaveAttribute('data-caravan', 'left');
  // The ware is in the run: one more card's column, straight away.
  await expect.poll(() => handCols(page)).toBeGreaterThan(before);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('a pop in town it does not want says so, and opens nothing', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=8&place=13&taught=1');
  await begin(page);
  await clearCards(page);
  const line = page.locator('[data-hud="caravan"]');
  await expect(line).toHaveAttribute('data-caravan', 'town');

  await page.locator('[data-action="pop"]').click();
  await expect.poll(async () => saysOneOf(await said(page), PASSED)).toBe(true);
  await clearCards(page);
  await expect(page.locator('[data-hud="caravan-picker"]')).toHaveCount(0);
  // Still in town: a miss is a clue, not a visit spent.
  await expect(line).toHaveAttribute('data-caravan', 'town');
  expect(errors, errors.join('\n')).toEqual([]);
});
