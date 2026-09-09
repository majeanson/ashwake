import { expect, test, type Page } from '@playwright/test';
import { begin, clearCards, placeOneTile, tilesLeft, watchErrors } from './helpers';

/**
 * ONE CARD AT A TIME, AND NONE OVER THE CASCADE (2026-09-09).
 *
 * Marc, of his first pop: *"make sure no cards can pop while the first pop is
 * happening (i think i had luck explained and coudnt see)."*
 *
 * The window was one `App` made on purpose. A pop's receipt WAITS for the
 * cascade — Marc's own ask from 2026-08-29, so the accounting arrives after the
 * thing it accounts for — and for the whole of that wait `saidCard` is null,
 * which is the teaching card's own gate. So a lesson that came due on the same
 * dispatch opened over the animation and was then UNMOUNTED the instant the
 * receipt landed. Not covered: shown, and withdrawn before it could be read.
 * And popping tiles is exactly what raises LUCK.
 *
 * This walks an UNTAUGHT device, which is the only kind that could reproduce it
 * — `?taught=1`, which nearly every other spec uses, marks every lesson met and
 * would make this green against the bug.
 *
 * ## WHAT THESE TESTS DO AND DO NOT PROVE — read before trusting them
 *
 * **They do not discriminate.** Both pass with the `speaking === 0` gate taken
 * out, which was checked rather than assumed. A test that cannot fail against
 * the bug it names proves nothing about the fix, and saying so here is cheaper
 * than letting somebody find out later.
 *
 * **The window is nonetheless real, and was measured** on seed 7 through
 * `?ff=debug.overlay`: `luck` goes `0 → 10` at ~80ms after the pop, and the
 * receipt does not land until ~350ms. For those 270ms LUCK's moment is true and
 * `saidCard` is null, which is precisely the gap the gate now closes.
 *
 * **Why it does not fire on this seed**: `nextLesson` returns the FIRST
 * unmet-and-true lesson in `ORDER`, and `App` renders a card only when that one
 * is card-class. On seed 7 a toast-class lesson sits ahead of `luck`, so `luck`
 * is masked and never reaches the screen at all. Reproducing Marc's report
 * needs a device whose next unmet lesson IS card-class at the moment of the
 * pop, and there is no fixture that constructs one.
 *
 * So what is kept below are the two INVARIANTS, which hold regardless: nothing
 * opens over the cascade, and never two cards at once. They are regression
 * guards, not evidence.
 */

test.use({ viewport: { width: 390, height: 844 } });

/** Every card on screen right now, by id. */
const cardsUp = (page: Page): Promise<string[]> =>
  page
    .locator('[data-card]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-card') ?? '?'));

test('a lesson never opens over the pop it was raised by', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7');
  await begin(page);
  await clearCards(page);

  // Build until a pocket ripens. `placeOneTile` clears the teaching as it goes,
  // so what is left armed when POP is pressed is whatever the pop itself makes
  // true — which is the case under test.
  const pop = page.locator('[data-action="pop"]');
  for (let i = 0; i < 14; i++) {
    if ((await pop.count()) > 0) break;
    await placeOneTile(page);
  }
  await expect(pop, 'no pocket ever ripened').toHaveCount(1);
  await clearCards(page);

  const before = await tilesLeft(page);
  await pop.click();

  /*
   * Watch the whole cascade. The receipt is held for `cascadeMs`, so this
   * samples far faster than that and records everything that appears.
   */
  const seen: string[] = [];
  for (let i = 0; i < 60; i++) {
    for (const id of await cardsUp(page)) {
      if (seen.at(-1) !== id) seen.push(id);
    }
    if (seen.includes('said')) break;
    await page.waitForTimeout(50);
  }

  expect(await tilesLeft(page), 'the pop never happened').toBeGreaterThan(before);
  expect(seen, 'the pop never showed its receipt').toContain('said');

  /*
   * The assertion. Nothing may appear before the receipt — and a LESSON in
   * particular, because that is the one that gets taken away again.
   */
  const firstUp = seen[0];
  expect(firstUp, `a card opened over the cascade: ${seen.join(' → ')}`).toBe('said');
  expect(
    seen.filter((id) => id.startsWith('lesson-')),
    `a lesson opened before the pop's receipt: ${seen.join(' → ')}`,
  ).toEqual([]);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('never shows two cards at once', async ({ page }) => {
  // The general form of the same rule, and cheap to hold: the shell has one
  // card slot and a lesson waits behind whatever is in it.
  const errors = watchErrors(page);
  await page.goto('/?seed=7');
  await begin(page);

  for (let i = 0; i < 10; i++) {
    expect(
      (await cardsUp(page)).length,
      `two cards on screen at once: ${(await cardsUp(page)).join(' + ')}`,
    ).toBeLessThanOrEqual(1);
    if ((await page.locator('.card-scrim').count()) === 0) break;
    await page.locator('.card-scrim').locator('button').last().click({ force: true });
    await page.waitForTimeout(60);
  }

  expect(errors, errors.join('\n')).toEqual([]);
});
