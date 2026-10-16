import { expect, test, type Page } from '@playwright/test';
import { begin, clearCards, openMore, placeOneTile, tilesLeft, watchErrors } from './helpers';

/**
 * Dismiss the card on screen, then give the NEXT one time to arrive. A card
 * that has a trip (RIPE's flies to the pocket) holds the one behind it until
 * the camera lands, and a tap on the board in that window raises the refusal's
 * toast, which holds it back again. Returns whether another card came.
 */
async function dismissOne(page: Page): Promise<boolean> {
  await page.locator('.card-scrim button').last().click({ force: true });
  await page.waitForTimeout(100);
  try {
    await page.locator('[data-card]').first().waitFor({ timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Place until the walk raises the card `id`, dismissing the cards in front of
 * it ONE at a time (2026-10-14: RIPE's card and POP's now come back to back, and
 * `clearCards` would clear both). Returns the card's locator.
 */
async function walkToCard(page: Page, id: string) {
  const card = page.locator(`[data-card="${id}"]`);
  let refused = false;
  for (let i = 0; i < 40 && (await card.count()) === 0; i++) {
    if ((await page.locator('[data-card]').count()) > 0) {
      await dismissOne(page);
      continue;
    }
    // The refusal's own toast holds the next card back until it has gone, so
    // once refused, WAIT for the card rather than tapping again.
    if (refused) {
      await page.waitForTimeout(400);
      continue;
    }
    try {
      await placeOneTile(page, { keepCards: true });
    } catch {
      // A ripe pocket refuses the next placement; the card may still be coming.
      refused = true;
    }
    await page.waitForTimeout(150);
  }
  return card;
}

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
  // Polled, not read: a keypress is handled a frame later (WebKit failed once in a
  // full run on a read taken straight after it, and passed six repeats alone).
  await expect
    .poll(() => tilesLeft(page), { message: 'U did not give the tile back' })
    .toBe(before);

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

test('HOW TO PLAY has a COLOURS tab: THE FOUR GROUNDS, each with when to take it and what to watch for', async ({
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
  await page.locator('[data-tab="grounds"]').click();

  const manual = page.locator('[data-panel="manual"]');
  // One source (2026-10-13): the tab is THE FOUR GROUNDS lesson, not a block of
  // its own, so it wears the lesson's name and the shared advice is its DETAILS.
  await expect(manual).toContainText(/THE FOUR GROUNDS|LES QUATRE SOLS/);
  await expect(manual.locator('[data-ground]')).toHaveCount(4);
  for (const colour of ['green', 'yellow', 'red', 'blue']) {
    const block = manual.locator(`[data-ground="${colour}"]`);
    await expect(block).toContainText(/PICK IT WHEN|À CHOISIR QUAND/);
    await expect(block).toContainText(/WATCH FOR|ATTENTION À/);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('HOW TO PLAY is complete on a fresh device: every tab opens on a section', async ({
  page,
}) => {
  // 2026-10-15, Marc: _"how to play should be complete all the time"_. The book
  // used to grow in as concepts were met, and MONDE was a blank page.
  const errors = watchErrors(page);
  await page.goto('/');
  await begin(page);
  await openMore(page);
  await page.locator('[data-panel="more"] [data-go="manual"]').click();
  const manual = page.locator('[data-panel="manual"]');
  for (const tab of ['start', 'grounds', 'world', 'hand']) {
    await page.locator(`[data-tab="${tab}"]`).click();
    await expect(manual.locator('section.lesson').first(), tab).toBeVisible();
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('HOW TO PLAY opens on the game in two sentences, and its tabs run most important first', async ({
  page,
}) => {
  /*
   * 2026-10-12, Marc: _"revise how to play content and where its positioned
   * … most important to least … our 2 sentences of game summarized added first
   * tab first paragraph"_.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  await begin(page);
  await openMore(page);
  await page.locator('[data-panel="more"] [data-go="manual"]').click();

  const manual = page.locator('[data-panel="manual"]');
  const tabs = await manual
    .locator('[data-tab]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-tab')));
  expect(tabs).toEqual(['start', 'grounds', 'world', 'hand']);

  // The first paragraph of the first tab is the summary, the one the second
  // opening card says.
  await expect(manual.locator('section.lesson').first().locator('p').first()).toContainText(
    /Place tiles until they’re surrounded|Pose des tuiles jusqu’à ce qu’elles soient entourées/,
  );
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the START tab is THE EXPEDITION, RIPE, POP and THE RUN’S END, with the marks beside the rules that use them', async ({
  page,
}) => {
  /*
   * 2026-10-13. The hand-written expedition block, the seven pop-family
   * sections and the Legend's last four rows became three lessons. The Legend
   * is gone: a wall and the legal edge are rows of THE EXPEDITION, stone and
   * the ripe edge are rows of POP, and each mark is drawn the board's way.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  await begin(page);
  await openMore(page);
  await page.locator('[data-panel="more"] [data-go="manual"]').click();

  const manual = page.locator('[data-panel="manual"]');
  await expect(page.locator('.legend'), 'the Legend came back').toHaveCount(0);
  const heads = await manual
    .locator('section.lesson > h2')
    .evaluateAll((els) => els.map((el) => (el.textContent ?? '').trim()));
  expect(heads.slice(0, 4)).toEqual([
    expect.stringMatching(/^THE EXPEDITION$|^L’EXPÉDITION$/),
    expect.stringMatching(/^RIPE$|^MÛR$/),
    expect.stringMatching(/^POP$|^RÉCOLTER$/),
    expect.stringMatching(/^THE RUN’S END$|^LA FIN DE LA PARTIE$/),
  ]);

  const expedition = manual.locator('section.lesson').first();
  // Its rows: a wall on the board's own wall hex, and a bare legal ring.
  await expect(expedition.locator('[data-row="wall"] .tip-lit .tip-lit-hex')).toHaveCount(1);
  await expect(expedition.locator('[data-row="legal"] .tip-lit .tip-lit-hex')).toHaveCount(1);
  await expect(expedition).toContainText(/Wall|Mur/);
  // The `place` figure under the rows.
  await expect(expedition.locator('figure')).toHaveCount(1);

  // RIPE: its ring row and the ripening picture. POP: what a pop leaves, and
  // the pocket picture.
  const ripe = manual.locator('section.lesson').nth(1);
  await expect(ripe.locator('[data-row="ripeEdge"]')).toHaveCount(1);
  await expect(ripe.locator('figure')).toHaveCount(1);
  const pop = manual.locator('section.lesson').nth(2);
  for (const row of ['stone', 'sizeBonus', 'reach'])
    await expect(pop.locator(`[data-row="${row}"]`), row).toHaveCount(1);
  await expect(pop.locator('figure')).toHaveCount(1);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the walked first run raises RIPE’s card then POP’s, each once, and neither after the pop', async ({
  page,
}) => {
  /*
   * 2026-10-14, Marc: the one merged card was a wall of text. The first ripe
   * tile raises RIPE's short card and POP's follows right behind it; the pop
   * that comes after is a receipt, not a third lesson.
   */
  const errors = watchErrors(page);
  await page.goto('/?seed=7');
  await begin(page);

  const seen: string[] = [];
  const note = async (): Promise<void> => {
    await page.waitForTimeout(150);
    const ids = await page
      .locator('[data-card]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-card') ?? '?'));
    for (const id of ids) if (seen.at(-1) !== id) seen.push(id);
  };
  let refused = false;
  for (let i = 0; i < 40 && !refused; i++) {
    try {
      await placeOneTile(page, { keepCards: true });
    } catch {
      refused = true;
    }
    await note();
    while ((await page.locator('[data-card]').count()) > 0) {
      if (await dismissOne(page)) await note();
    }
  }
  expect(refused, 'a ripe pocket never stopped the placing').toBe(true);
  const once = (id: string) => seen.filter((x) => x === id);
  expect(once('lesson-ripe'), seen.join(' → ')).toHaveLength(1);
  expect(once('lesson-pop'), seen.join(' → ')).toHaveLength(1);
  expect(seen.indexOf('lesson-ripe'), 'POP came before RIPE').toBeLessThan(
    seen.indexOf('lesson-pop'),
  );

  await page
    .getByRole('button', { name: /POP|RÉCOLT/ })
    .first()
    .click();
  for (let i = 0; i < 24; i++) {
    await note();
    await clearCards(page);
  }
  await placeOneTile(page, { keepCards: true });
  await note();
  expect(once('lesson-ripe'), `RIPE's card came back: ${seen.join(' → ')}`).toHaveLength(1);
  expect(once('lesson-pop'), `POP's card came back: ${seen.join(' → ')}`).toHaveLength(1);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the first pop is forced: a waiting pocket refuses placement until it is popped', async ({
  page,
}) => {
  /*
   * 2026-10-12, Marc, of the first screen: _"it should force me to pop one cause
   * now i can just place tiles and create a big one"_. Build until a pocket is
   * ripe, as a stranger does; the next placement is refused with the one
   * sentence that says what to do, tiles unchanged; popping lifts it.
   */
  const errors = watchErrors(page);
  await page.goto('/');
  await begin(page);

  const toast = page.locator('.toast');
  const refusal = /Pop this pocket before you place|Récolte cette poche avant de poser/;
  let refused = false;
  for (let i = 0; i < 40 && !refused; i++) {
    try {
      await placeOneTile(page);
    } catch {
      // `placeOneTile` found no tap that spent a tile: the placement was refused.
      refused = true;
    }
  }
  expect(refused, 'a ripe pocket never stopped the placing').toBe(true);
  await expect(toast).toContainText(refusal);

  const tiles = await tilesLeft(page);
  await page
    .getByRole('button', { name: /POP|RÉCOLT/ })
    .first()
    .click();
  // The pop lands, and then a placement works again.
  await page.waitForTimeout(1200);
  await clearCards(page);
  await placeOneTile(page);
  expect(await tilesLeft(page)).not.toBe(tiles);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('a cue tapped out and a coach line tapped away stay away after the next pop', async ({
  page,
}) => {
  /*
   * 2026-10-16, Marc: _"how many tiles remains keeps flashing even after I
   * press on it, it comes back after a pop or similar"_, and _"if we tap a
   * popup text like 'Avec moins de tuiles que le COÛT…' make sure they don't
   * come back on the next occasion"_. The coach says its step again after
   * every receipt, and its ring came back with it. Now a tap on the ringed
   * control finds it for the run, and a tap on the coach's line puts that
   * step away for the run; a reminder after a receipt rings nothing either.
   */
  const errors = watchErrors(page);
  await page.goto('/?seed=7');
  await begin(page);

  // The walk: build until the first pocket is ripe, then the forced first pop.
  let refused = false;
  for (let i = 0; i < 40 && !refused; i++) {
    try {
      await placeOneTile(page);
    } catch {
      refused = true;
    }
  }
  expect(refused, 'a ripe pocket never stopped the placing').toBe(true);
  await page
    .getByRole('button', { name: /POP|RÉCOLT/ })
    .first()
    .click();
  await page.waitForTimeout(1200);
  await clearCards(page);
  // A receipt takes the strip; the coach says its next step on the placement
  // AFTER the pop, not at it (`App`'s `said === null` clause).
  await placeOneTile(page);

  // The tour's first step points at TILES and says so.
  const shell = page.locator('.shell');
  const toast = page.locator('.toast');
  const build = /Now keep building|Maintenant, continue de bâtir/;
  await expect(shell).toHaveAttribute('data-cue', 'tiles');
  await expect(toast).toContainText(build);

  // Tap the line away, then tap the control it points at.
  await toast.click();
  await expect(toast).not.toContainText(build);
  await expect(shell, 'the line going does not put the ring out').toHaveAttribute(
    'data-cue',
    'tiles',
  );
  await page.locator('[data-stat="tiles"]').click();
  await expect(shell).not.toHaveAttribute('data-cue', 'tiles');

  // Place until the next pocket is ripe and pop it: a receipt, after which the
  // coach used to say BUILD again and ring TILES again.
  const pop = page.locator('[data-action="pop"]');
  let popped = false;
  for (let i = 0; i < 40 && !popped; i++) {
    await placeOneTile(page);
    if ((await pop.count()) > 0 && (await pop.isEnabled())) {
      await pop.click();
      popped = true;
    }
  }
  expect(popped, 'no second pocket ripened in forty placements').toBe(true);
  await page.waitForTimeout(1200);
  await clearCards(page);
  // The placement after the receipt is where the re-say used to land.
  await placeOneTile(page);
  await page.waitForTimeout(500);
  await expect(shell, 'TILES rang again after the pop').not.toHaveAttribute('data-cue', 'tiles');
  await expect(toast, 'BUILD was said again after the pop').not.toContainText(build);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('HOW TO PLAY › on the opening cards opens the book at THE EXPEDITION, and the card is back', async ({
  page,
}) => {
  /*
   * 2026-10-13, Marc's linking decision: every card that teaches carries one
   * quiet link to the book, at that card's own section. The story is the first
   * card a stranger meets, so it is the first one asked.
   *
   * 2026-10-14, Marc: _"we come back and the card is gone and we seem out of
   * the tutorial"_. The card is not told by the trip: it is back, unchanged,
   * when the book closes.
   */
  const errors = watchErrors(page);
  await page.goto('/');
  await page.locator('[data-door="begin"]').click();

  const card = page.locator('.card-scrim .card');
  await expect(card).toContainText(/THE STORY|L’HISTOIRE/);
  await card.locator('[data-action="card-manual"]').click();

  const manual = page.locator('[data-panel="manual"]');
  await expect(manual).toBeVisible();
  await expect(page.locator('[data-tab="start"]')).toHaveAttribute('aria-selected', 'true');
  await expect(manual.locator('#manual-expedition')).toBeInViewport();
  // No card sits over the book.
  await expect(page.locator('.card-scrim')).toHaveCount(0);

  // Closing it returns the player to the SAME card, still the story; only its
  // own GOT IT moves the walk on to the goal.
  await manual.locator('.panel-back').click();
  await expect(manual).toHaveCount(0);
  await expect(page.locator('.card-scrim .card')).toContainText(/THE STORY|L’HISTOIRE/);
  await page.locator('.card-scrim .card .card-acts button').last().click();
  await expect(page.locator('.card-scrim .card')).toContainText(/HOW IT WORKS|COMMENT ÇA MARCHE/);
  await expect(page.locator('.card-scrim .card')).not.toContainText(/THE STORY|L’HISTOIRE/);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('HOW TO PLAY › on a fired lesson card lands on its section, and the card is back after', async ({
  page,
}) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7');
  await begin(page);

  const pop = await walkToCard(page, 'lesson-pop');
  await expect(pop, 'the walk never raised POP’s card').toHaveCount(1);
  await pop.locator('[data-action="card-manual"]').click();

  const manual = page.locator('[data-panel="manual"]');
  await expect(manual).toBeVisible();
  await expect(page.locator('[data-tab="start"]')).toHaveAttribute('aria-selected', 'true');
  await expect(manual.locator('#manual-pop')).toBeInViewport();
  await expect(page.locator('[data-card]')).toHaveCount(0);

  // Not told by the trip: closing the book brings the same card back, and its
  // own GOT IT is what tells it.
  await manual.locator('.panel-back').click();
  await expect(manual).toHaveCount(0);
  await expect(page.locator('[data-card="lesson-pop"]')).toHaveCount(1);
  await page.locator('[data-card="lesson-pop"] .card-acts button').last().click();
  await page.waitForTimeout(400);
  await expect(page.locator('[data-card="lesson-pop"]')).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('a term tapped in a fired card opens its own card, and the fired card is back after', async ({
  page,
}) => {
  // 2026-10-14: a detour from a lesson never skips it (see the HOW TO PLAY ›
  // tests above). The term card gives the lesson way and hands it back.
  const errors = watchErrors(page);
  await page.goto('/?seed=7');
  await begin(page);

  const pop = await walkToCard(page, 'lesson-pop');
  await expect(pop, 'the walk never raised POP’s card').toHaveCount(1);

  await pop.locator('button.term').first().click();
  // One card at a time: the term's, not POP's under it.
  await expect(page.locator('[data-card]')).toHaveCount(1);
  await expect(pop).toHaveCount(0);

  await page.locator('.card-scrim .card-acts button').last().click();
  await expect(pop).toHaveCount(1);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('a term in the book takes you to its section, on whichever tab it lives', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  await begin(page);
  await openMore(page);
  await page.locator('[data-panel="more"] [data-go="manual"]').click();

  const manual = page.locator('[data-panel="manual"]');
  // The START tab names LUCK (POP's WHEN line); LUCK lives on the HAND tab.
  await expect(manual.locator('#manual-luck')).toHaveCount(0);
  const luck = manual
    .locator('button.term')
    .filter({ hasText: /^(LUCK|CHANCE)$/ })
    .first();
  await luck.scrollIntoViewIfNeeded();
  await luck.click();

  await expect(page.locator('[data-tab="hand"]')).toHaveAttribute('aria-selected', 'true');
  await expect(manual.locator('#manual-luck')).toBeInViewport();
  // A book, not a card over a book.
  await expect(page.locator('.card-scrim')).toHaveCount(0);
  // And the section the reader is in never links to itself.
  await expect(
    manual
      .locator('#manual-luck > p')
      .first()
      .locator('button.term')
      .filter({ hasText: /^(LUCK|CHANCE)$/ }),
  ).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});
