import { expect, test } from '@playwright/test';
import { begin, clearCards, placeOneTile, tilesLeft, watchErrors } from './helpers';

/**
 * THE FIRST MINUTE, AFTER TWO STRANGERS (2026-10-12).
 *
 * _"Je comprends tellement pas ce jeu"_, _"il y avait juste trop d'information
 * trop vite trop tôt"_, _"un undo ça serait clutch aussi"_. Three things came
 * of it and each is a thing a player touches, so each is asked of a real
 * browser: the card that says what the game is, the chips that offer the rest
 * without interrupting, and the button that takes a tile back.
 */

test.use({ viewport: { width: 390, height: 844 } });

test('a stranger is told the story, then what to do, then left alone', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  // Not `begin`: it dismisses every card, and the cards are the point.
  await page.locator('[data-door="begin"]').click();

  const card = page.locator('.card-scrim .card');
  await expect(card).toContainText(/THE STORY|L’HISTOIRE/);
  await card.locator('button').last().click({ force: true });

  // The second card is the game in two sentences.
  await expect(card).toContainText(/HOW IT WORKS|COMMENT ÇA MARCHE/);
  await expect(card).toContainText(/POP|RÉCOLTE/);
  await card.locator('button').last().click({ force: true });

  // And then nothing is stacked behind it: the board is theirs.
  await page.waitForTimeout(300);
  await expect(page.locator('.card-scrim')).toHaveCount(0);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a device that has played is never told what the game is again', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  await begin(page);
  await page.waitForTimeout(500);
  await expect(page.locator('.card-scrim')).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('UNDO takes the last tile back, and only appears when there is one', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  await begin(page);
  await clearCards(page);

  const undo = page.locator('[data-action="undo"]');
  await expect(undo, 'UNDO offered with nothing to take back').toHaveCount(0);

  const before = await tilesLeft(page);
  await placeOneTile(page);
  expect(await tilesLeft(page)).toBeLessThan(before);
  await expect(undo, 'no UNDO after a placement').toBeVisible();

  await undo.click();
  expect(await tilesLeft(page), 'UNDO did not give the tile back').toBe(before);
  await expect(undo).toHaveCount(0);

  // The keyboard's way: place, then U.
  await placeOneTile(page);
  await expect(undo).toBeVisible();
  await page.keyboard.press('u');
  expect(await tilesLeft(page)).toBe(before);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a territory or a shrine is a NEW chip, and its card opens when tapped', async ({ page }) => {
  const errors = watchErrors(page);
  // Seed 122 at depth 20 puts all four destinations on one board unclaimed
  // (`shell/tourTarget.test.ts` chose it by looking). The ledger is untaught.
  await page.goto('/?seed=122&place=20');
  await begin(page);
  await clearCards(page);

  const chips = page.locator('[data-new-chip]');
  await expect(chips.first(), 'no NEW chip on a board that shows a shrine').toBeVisible();
  const which = await chips.first().getAttribute('data-new-chip');

  await clearCards(page);
  await chips.first().click();
  await expect(page.locator('.card-scrim .card')).toBeVisible();
  await page.locator('.card-scrim button').last().click({ force: true });
  await page.waitForTimeout(300);

  await expect(
    page.locator(`[data-new-chip="${which}"]`),
    'the chip stayed after its card was read',
  ).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});
