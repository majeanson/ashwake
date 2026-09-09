import { expect, test, type Page } from '@playwright/test';
import { begin, clearCards, placeOneTile, watchErrors } from './helpers';

/**
 * THE BOARD DOES NOT RESIZE UNDER THE PLAYER (2026-09-08).
 *
 * The third instance of one disease, and the one that survived longest: the
 * action bar grew the first time a pocket ripened — `.controls` 85px to 145px
 * — and `.board-host` is `flex: 1`, so the WebGL canvas's backing store was
 * reallocated under it. A reallocated buffer is a CLEARED one, which is where
 * Marc's *"the whole screen flashes"* came from. Session 56 stopped the flash
 * by repainting in the same task; this stops the resize.
 *
 * `ui.css` records the other two — the stat row ("the board resizes because
 * the score went from 99 to 100") and the purse drawer — and both were fixed
 * the same way, by stopping the resize rather than absorbing it. Neither had a
 * test, which is why all three happened.
 *
 * Measured on the HOST rather than on the canvas's backing store: the host is
 * what the layout decides, and the backing store is downstream of it through
 * a device-pixel-ratio the test does not control.
 */

test.use({ viewport: { width: 390, height: 844 } });

const hostHeight = async (page: Page): Promise<number> =>
  (await page.locator('.board-host').boundingBox())?.height ?? -1;

test('the board keeps its height from the first frame of a run to a ripe pocket', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1');
  await begin(page);
  await clearCards(page);

  // The opening: nothing has ripened, so the action bar has no buttons in it.
  const opening = await hostHeight(page);
  expect(opening, 'no board host to measure').toBeGreaterThan(100);

  // Place until a pocket ripens and POP appears — the exact moment the bar
  // used to grow.
  for (let i = 0; i < 12; i++) {
    if ((await page.locator('[data-action="pop"]').count()) > 0) break;
    await placeOneTile(page);
  }
  await expect(page.locator('[data-action="pop"]'), 'no pocket ever ripened').toHaveCount(1);
  await clearCards(page);

  expect(
    await hostHeight(page),
    'the board resized when POP appeared — the reserved row is not holding',
  ).toBe(opening);

  expect(errors, errors.join('\n')).toEqual([]);
});
