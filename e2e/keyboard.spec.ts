import { expect, test, type Page } from '@playwright/test';
import { begin, clearCards, watchErrors } from './helpers';

/**
 * The board answers a keyboard (2026-08-29).
 *
 * Marc: *"do a pass for keyboard + desktop play (all cam movement, etc.) and
 * easy tile placements."* `INTERACTIONS.md` had listed the missing half of it
 * since the file was written, inherited from Ashwake 1, which shipped without
 * a keyboard path to the board and said so in as many words.
 *
 * A desktop viewport, because this is the screen the keys are for — the only
 * spec in this suite that is not a portrait phone, and it says why.
 *
 * The angle is read off `data-lean`, which is on the board's wrapper for
 * exactly this: the camera's only other witness is the canvas, and the canvas
 * is never still — embers and beacons animate, so two screenshots of an
 * unchanged board differ anyway.
 */

test.use({ viewport: { width: 1280, height: 800 } });

const tiles = async (page: Page): Promise<number> =>
  Number(await page.locator('[data-stat="tiles"] .stat-value').textContent());

const lean = async (page: Page): Promise<string> =>
  (await page.locator('[data-lean]').getAttribute('data-lean')) ?? '';

/** Open on a board that has stopped teaching and stopped moving. */
async function openBoard(page: Page): Promise<void> {
  await page.goto('/?seed=7&taught=1');
  await expect(page.locator('canvas')).toBeVisible();
  await begin(page);
  // The camera eases into its fit, and the marker's own nudge rides the same
  // camera — same 600ms the tap tests wait, same reason.
  await page.waitForTimeout(600);
}

test('places a tile with the arrows and Enter, having never been clicked', async ({ page }) => {
  const errors = watchErrors(page);
  await openBoard(page);
  const before = await tiles(page);

  // The first press only SUMMONS the marker, at home. A key whose first act
  // was to spend a tile on a hex nobody had looked at would be the one gesture
  // on this board that cannot be undone, fired blind.
  await page.keyboard.press('Enter');
  await clearCards(page);
  expect(await tiles(page), 'the first press spent a tile').toBe(before);

  // Now it is on the board: one step east onto a legal neighbour, and act.
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await clearCards(page);
  expect(await tiles(page), 'the arrows never placed anything').toBeLessThan(before);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('says what the marker lands on without acting on it', async ({ page }) => {
  const errors = watchErrors(page);
  await openBoard(page);
  const before = await tiles(page);

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  // Looking is not tapping: the toast describes the ground and the hand is
  // untouched. This is the half a screen reader lives on — the toast is the
  // live region, so walking the board reads it aloud.
  const said = ((await page.locator('.toast').textContent()) ?? '').trim();
  expect(said.length, 'the marker moved silently').toBeGreaterThan(0);
  expect(await tiles(page)).toBe(before);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('turns and leans the board, which a mouse alone never could', async ({ page }) => {
  const errors = watchErrors(page);
  await openBoard(page);
  const opened = await lean(page);

  await page.keyboard.press('r');
  await page.keyboard.press('r');
  const leaned = await lean(page);
  expect(leaned, 'R never leaned the camera').not.toBe(opened);

  await page.keyboard.press('q');
  expect(await lean(page), 'Q never turned the board').not.toBe(leaned);

  // The dedicated navigation keys are the same two channels, for a keyboard
  // whose layout does not have Q where a US one does.
  const turned = await lean(page);
  await page.keyboard.press('PageDown');
  expect(await lean(page), 'PageDown never leaned the camera').not.toBe(turned);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('picks up a card by its number', async ({ page }) => {
  const errors = watchErrors(page);
  await openBoard(page);

  const cards = page.locator('[data-hud="hand"] .tile[data-colour]');
  await expect(cards.first()).toBeVisible();
  // The second card, which is never the one already selected.
  await page.keyboard.press('2');
  await expect(cards.nth(1)).toHaveAttribute('aria-pressed', 'true');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('leaves a focused control its own Enter, and takes the rest', async ({ page }) => {
  const errors = watchErrors(page);
  await openBoard(page);

  const purse = page.locator('[data-action="purse"]');
  await purse.focus();
  // The keys still reach the board past a focused button — a player who just
  // pressed POP must not have to click the board again before an arrow works.
  const before = await lean(page);
  await page.keyboard.press('r');
  expect(await lean(page), 'a focused button swallowed the camera keys').not.toBe(before);

  // Enter, though, is the button's: it belongs to whatever has focus.
  await page.keyboard.press('Enter');
  await expect(purse).toHaveAttribute('aria-expanded', 'true');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('goes quiet while a panel is open, exactly as the board does', async ({ page }) => {
  const errors = watchErrors(page);
  await openBoard(page);

  const before = await lean(page);
  // The board's one door is MENU, and the manual is MORE's first line.
  await page.locator('.camera .menu').click();
  await page.locator('[data-panel="more"] [data-go="manual"]').click();
  await page.locator('[data-panel="manual"]').waitFor({ state: 'visible' });
  await page.keyboard.press('r');
  await page.keyboard.press('ArrowDown');
  // The guard is the same condition that makes the board host `inert`. Two
  // mechanisms, one idea, and they must not disagree about whether the board
  // is reachable.
  expect(await lean(page), 'the board took keys through an open panel').toBe(before);

  // Escape closes the TOP of the stack, one at a time — the manual, then the
  // MORE it opened from. The board only takes keys back once nothing is over it.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-panel="manual"]')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-panel]')).toHaveCount(0);
  await page.keyboard.press('r');
  expect(await lean(page), 'the keys never came back').not.toBe(before);

  expect(errors, errors.join('\n')).toEqual([]);
});
