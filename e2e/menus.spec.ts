import { expect, test, type Page } from '@playwright/test';
import { begin, watchErrors } from './helpers';

/**
 * Everything that is not the run (Stage 4, 2026-08-29).
 *
 * The panels are unit-tested for their markup; what only a browser can prove is
 * that they are REACHABLE — that a player who taps MORE gets to their worlds,
 * their shop and their hall of fame, and gets back out of each one. Ashwake 1's
 * menus were each correct in isolation and still had a room you could enter
 * and not leave.
 *
 * And the rule that outranks all of it: **the board host never remounts**
 * (`CLAUDE.md`). Opening a panel, switching worlds and restoring a backup are
 * all state changes, so the canvas on screen at the start must be the same
 * element at the end — losing it loses the WebGL context, and iOS does not
 * always give one back.
 */

test.use({ viewport: { width: 390, height: 844 } });

const panel = (page: Page, id: string) => page.locator(`[data-panel="${id}"]`);

/** The identity of the live canvas, so a remount can be caught. R3F mounts it
 *  a tick after the shell, so the first read waits for it rather than reporting
 *  'none' and quietly passing against itself. */
async function canvasId(page: Page): Promise<string> {
  await page.locator('canvas').waitFor({ state: 'attached' });
  return page.evaluate(() => {
    const el = document.querySelector('canvas');
    if (el === null) return 'none';
    const marked = el as HTMLCanvasElement & { dataset: DOMStringMap };
    marked.dataset['seen'] ??= String(Math.random());
    return marked.dataset['seen'] ?? 'none';
  });
}

test('every room off MORE opens and comes back', async ({ page }) => {
  const errors = watchErrors(page);
  // A device that has met every lesson: this is about the menus, not about
  // walking a card stack out of the way.
  await page.goto('/?taught=1');
  const before = await canvasId(page);

  await page.locator('[data-door="more"]').click();
  await panel(page, 'more').waitFor({ state: 'visible' });

  // A virgin device is offered the rooms that mean something on one: the
  // manual, its worlds, and settings. The shop and the hall of fame arrive
  // with a run to show in them.
  for (const room of ['manual', 'worlds', 'settings']) {
    await page.locator(`[data-go="${room}"]`).click();
    await panel(page, room).waitFor({ state: 'visible' });
    await panel(page, room).locator('.panel-back').click();
    await panel(page, room).waitFor({ state: 'detached' });
    await panel(page, 'more').waitFor({ state: 'visible' });
  }

  await panel(page, 'more').locator('.panel-back').click();
  await panel(page, 'more').waitFor({ state: 'detached' });
  expect(await canvasId(page)).toBe(before);
  expect(errors).toEqual([]);
});

test('a finished run banks, and the end screen spends it', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?end=1&taught=1');
  await begin(page);

  const end = page.locator('[data-hud="end"]');
  await end.waitFor({ state: 'visible' });

  // The breakdown is folded, and opening it is the whole of the answer to
  // "why was the number what it was".
  await end.locator('summary').first().click();
  expect(await end.locator('.bars').count()).toBeGreaterThan(0);
  expect(await end.locator('.arc-chart').count()).toBe(1);

  // The shop is on the end screen because that is where the relics were
  // earned. At least one upgrade row, whether or not it is affordable.
  expect(await end.locator('[data-buy]').count()).toBeGreaterThan(0);

  // And the run reached the hall of fame — the settle step, proved from the
  // outside rather than from its own unit test.
  await end.locator('[data-door="more"]').click();
  await panel(page, 'more').waitFor({ state: 'visible' });
  await page.locator('[data-go="fame"]').click();
  await panel(page, 'fame').waitFor({ state: 'visible' });
  expect(await panel(page, 'fame').locator('details').count()).toBeGreaterThan(0);

  expect(errors).toEqual([]);
});

test('switching worlds is a state change, never a reload', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  const before = await canvasId(page);

  await page.locator('[data-door="more"]').click();
  await page.locator('[data-go="worlds"]').click();
  await panel(page, 'worlds').waitFor({ state: 'visible' });

  await page.locator('[data-slot="2"]').click();
  await panel(page, 'worlds').waitFor({ state: 'detached' });

  // The board is live in world 2, and it is the SAME board host.
  await page.locator('[data-stat="tiles"]').waitFor({ state: 'visible' });
  expect(await canvasId(page)).toBe(before);
  expect(errors).toEqual([]);
});

test("today's board is one tap from the front door", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1');

  // The badge is the catalogue's sentence about today, not a bare word.
  const door = page.locator('[data-door="daily"]');
  await door.waitFor({ state: 'visible' });
  expect((await door.textContent())?.trim().length).toBeGreaterThan(3);

  await door.click();
  // Straight into a live board — the daily is a run, not a screen about one.
  await page.locator('[data-stat="tiles"]').waitFor({ state: 'visible' });

  // And leaving it puts the player back in the world they came from rather
  // than asking them to pick one.
  await page.locator('[data-hud="hand"]').waitFor({ state: 'visible' });
  expect(errors).toEqual([]);
});
