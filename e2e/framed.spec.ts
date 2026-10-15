import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

/**
 * The game inside somebody else's page (2026-10-15): marcportal.com embeds it
 * as a 1280x800 preview. `vite preview` serves no `_headers`, so this proves
 * the PAGE's half — what a framed visitor sees — and `verify-deploy` proves the
 * edge's half, that the header lets the frame open at all.
 */
test.use({ viewport: { width: 1280, height: 800 } });

test('framed, the door is BEGIN, MENU and a way out — and no DAILY', async ({ page, baseURL }) => {
  const errors = watchErrors(page);
  await page.setContent(
    `<body style="margin:0"><iframe title="game" src="${baseURL}/" style="width:1280px;height:800px;border:0"></iframe></body>`,
  );
  const game = page.frameLocator('iframe');
  await expect(game.locator('[data-door="begin"]')).toBeVisible();
  await expect(game.locator('[data-door="menu"]')).toBeVisible();
  await expect(game.locator('[data-door="daily"]')).toHaveCount(0);

  const out = game.locator('[data-door="open-full"]');
  await expect(out).toBeVisible();
  await expect(out).toHaveAttribute('target', '_blank');
  await expect(out).toHaveAttribute('rel', /noopener/);
  expect(errors).toEqual([]);
});

test('on its own, the door keeps DAILY and offers no way out', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-door="begin"]')).toBeVisible();
  await expect(page.locator('[data-door="daily"]')).toBeVisible();
  await expect(page.locator('[data-door="open-full"]')).toHaveCount(0);
});

test('a wide screen keeps the header in the dock’s column', async ({ page }) => {
  await page.goto('/?seed=7&taught=1&place=12');
  await page.locator('[data-door="begin"]').click();
  await page.locator('canvas').waitFor({ state: 'attached' });
  const hud = await page.locator('.hud').boundingBox();
  const stats = await page.locator('.hud > .stat').first().boundingBox();
  const hand = await page.locator('.controls').boundingBox();
  if (hud === null || stats === null || hand === null) throw new Error('layout missing');
  // The first stat starts well inside the row, not at its left edge...
  expect(stats.x - hud.x).toBeGreaterThan(200);
  // ...and the dock's column is the same one: both centred on the screen.
  expect(Math.abs(hud.x + hud.width / 2 - (hand.x + hand.width / 2))).toBeLessThan(2);
});
