import { expect, test } from '@playwright/test';
import { begin, clearCards, openMore, placeOneTile, tilesLeft, watchErrors } from './helpers';

/**
 * THE FIRST MINUTE, AFTER TWO STRANGERS (2026-10-12).
 *
 * _"Je comprends tellement pas ce jeu"_, _"il y avait juste trop d'information
 * trop vite trop tôt"_, _"un undo ça serait clutch aussi"_. Three things came
 * of it and each is a thing a player touches, so each is asked of a real
 * browser: the card that says what the game is, the chips that offer the rest
 * without interrupting (unit-tested: `NewChips.test.tsx` and `shell/teaching.test.ts`,
 * because a chip's moment depends on a deal no browser test can hold still), and the button that takes a tile back.
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
  // Always in the cluster while a run is played, dimmed when it has nothing to do.
  await expect(undo, 'UNDO missing from the cluster').toBeVisible();
  await expect(undo, 'UNDO live with nothing to take back').toBeDisabled();

  const before = await tilesLeft(page);
  await placeOneTile(page);
  expect(await tilesLeft(page)).toBeLessThan(before);
  await expect(undo, 'no UNDO after a placement').toBeEnabled();

  await undo.click();
  expect(await tilesLeft(page), 'UNDO did not give the tile back').toBe(before);
  await expect(undo).toBeDisabled();

  // The keyboard's way: place, then U.
  await placeOneTile(page);
  await expect(undo).toBeEnabled();
  await page.keyboard.press('u');
  expect(await tilesLeft(page)).toBe(before);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('the tutorial can be replayed from SETTINGS, from the story', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  await begin(page);
  await clearCards(page);
  await placeOneTile(page);
  const before = await tilesLeft(page);

  await openMore(page);
  await page.locator('[data-go="settings"]').click();
  await page
    .locator('[data-panel="settings"]')
    .getByRole('button', { name: /REPLAY THE TUTORIAL|REFAIRE LE TUTORIEL/ })
    .click();
  // Armed: it says what it will do, and a second press does it.
  const armed = page.locator('[data-panel="settings"] button.armed');
  await expect(armed).toContainText(/TUTORIAL WORLD|MONDE TUTORIEL/);
  await armed.click();

  // A new world, MENU closed behind it (it used to stay open over a run in one
  // of the player's own worlds), and the lessons start over from the story.
  await expect(page.locator('.card-scrim .card')).toContainText(/THE STORY|L’HISTOIRE/);
  await expect(page.locator('[data-panel]'), 'a panel stayed open over the tutorial').toHaveCount(
    0,
  );
  await page.locator('.card-scrim button').last().click({ force: true });
  await expect(page.locator('.card-scrim .card')).toContainText(/HOW IT WORKS|COMMENT ÇA MARCHE/);
  await page.locator('.card-scrim button').last().click({ force: true });
  await clearCards(page);
  expect(await tilesLeft(page), 'the replay did not start a fresh run').toBeGreaterThan(before);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('the tutorial is also one tap from MENU, for somebody who is lost', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  await begin(page);
  await clearCards(page);

  await openMore(page);
  await page.getByRole('button', { name: /REPLAY THE TUTORIAL|REFAIRE LE TUTORIEL/ }).click();
  const armed = page.locator('[data-panel="more"] button.armed');
  await expect(armed).toContainText(/TUTORIAL WORLD|MONDE TUTORIEL/);
  await armed.click();

  await expect(page.locator('.card-scrim .card')).toContainText(/THE STORY|L’HISTOIRE/);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the first run is walked: one coach line per step, and nothing else in the way', async ({
  page,
}) => {
  /*
   * 2026-10-12, Marc: _"take the user by the hand and walk them through their
   * actions and why they do it more thoroughly. Make sure no other info is in
   * the way (like NEW GROUND)"_. Until the first pop lands the strip says the
   * coach's line for the step and nothing else, and no NEW chip is offered.
   * What the coach says is unit-tested; this asks a real browser that it is
   * heard, and that building does not bring the clutter back.
   */
  const errors = watchErrors(page);
  await page.goto('/');
  await begin(page);

  const toast = page.locator('.toast');
  await expect(toast).toContainText(
    /The tiles under the board are your hand|Les tuiles sous le plateau forment ta main/,
  );

  // The walk changes its words as the player gets further in.
  const heard = new Set<string>();
  for (let i = 0; i < 6; i++) {
    await placeOneTile(page);
    heard.add((await toast.textContent()) ?? '');
    await expect(page.locator('.new-chips')).toHaveCount(0);
    await expect(toast).not.toContainText(/NEW GROUND|NOUVEAU TERRAIN|UNIQUE/);
  }
  // Past the first line: the colours step was heard too, not only the opening.
  expect(
    [...heard].some((text) => /WORTH|VALEUR/.test(text)),
    [...heard].join(' | '),
  ).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('HOW TO PLAY has a COLOURS tab: each ground, when to take it, what to watch for', async ({
  page,
}) => {
  /*
   * 2026-10-12, Marc: _"add more strategy in how to play towards colours … each
   * colour could have their own explanation + general strategy"_. The tab is
   * one of the manual's sections that grow in, so a stranger who has not met
   * THE FOUR GROUNDS does not see it, and a device that has does.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  await begin(page);
  await openMore(page);
  await page.locator('[data-panel="more"] [data-go="manual"]').click();
  await page.locator('[data-tab="colours"]').click();

  const manual = page.locator('[data-panel="manual"]');
  await expect(manual).toContainText(/CHOOSING A GROUND|CHOISIR UN SOL/);
  await expect(manual.locator('[data-ground]')).toHaveCount(4);
  for (const colour of ['green', 'yellow', 'red', 'blue']) {
    const block = manual.locator(`[data-ground="${colour}"]`);
    await expect(block).toContainText(/PICK IT WHEN|À CHOISIR QUAND/);
    await expect(block).toContainText(/WATCH FOR|ATTENTION À/);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the COLOURS tab waits for a stranger to meet the four grounds', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await begin(page);
  await openMore(page);
  await page.locator('[data-panel="more"] [data-go="manual"]').click();
  await expect(page.locator('[data-tab="start"]')).toBeVisible();
  await expect(page.locator('[data-tab="colours"]')).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});
