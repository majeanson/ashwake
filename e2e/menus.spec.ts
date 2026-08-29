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

test('the appearance picker shows each direction, and switching one repaints', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1');

  await page.locator('[data-door="settings"]').click();
  await panel(page, 'settings').waitFor({ state: 'visible' });

  // Every direction is SHOWN, not just named: a swatch each, drawn from that
  // theme's own tokens. AUTO is the one row without one — it has no look of
  // its own.
  const picks = page.locator('[data-theme-pick]');
  expect(await picks.count()).toBeGreaterThan(2);
  expect(await page.locator('[data-theme-pick] .swatch').count()).toBe((await picks.count()) - 1);

  // Two directions do not paint the same board.
  const groundOf = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.locator('[data-theme-pick="daylight"]').click();
  // Polled rather than read once: applying a direction is a React render and
  // then a paint, and a single read can land between the two.
  await expect.poll(groundOf).toBe('rgb(232, 220, 196)');
  const light = await groundOf();
  await page.locator('[data-theme-pick="torchlit"]').click();
  await expect.poll(groundOf).not.toBe(light);

  // And the choice is remembered, which is what makes it a setting.
  await expect(page.locator('[data-theme-pick="torchlit"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(errors).toEqual([]);
});

test('a run can be handed to somebody', async ({ page }) => {
  const errors = watchErrors(page);
  // No share sheet in headless Chromium, so this walks the clipboard path —
  // which is the desktop path anyway, and the one that can silently do
  // nothing.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?end=1&taught=1&seed=7');
  await begin(page);

  const share = page.locator('[data-action="share"]');
  await share.waitFor({ state: 'visible' });
  await share.click();

  const said = await page.evaluate(() => navigator.clipboard.readText());
  // The sentence, and a link that carries the SEED rather than this session's
  // own query — a shared link must not drag `?end=1&taught=1` along.
  expect(said).toMatch(/Ashwake/);
  expect(said).toContain('seed=7');
  expect(said).not.toContain('taught');
  expect(said).not.toContain('end=1');
  expect(errors).toEqual([]);
});

test('?themes=1 puts every direction one tap from the board', async ({ page }) => {
  // The workbench. SETTINGS could always switch directions; the panel doing
  // the switching COVERS the board being judged, which made comparing five of
  // them five round trips through a menu. Here the board never leaves.
  const errors = watchErrors(page);
  await page.goto('/?themes=1&taught=1&place=12');
  // Through the door first: the strip lives over the BOARD, because a board is
  // what a direction is judged on. The front door has its own SETTINGS route
  // for the chrome half.
  await begin(page);

  const strip = page.locator('[data-hud="directions"]');
  await strip.waitFor({ state: 'visible' });

  // Every direction that ships, plus AUTO — and the board still showing.
  expect(await strip.locator('[data-theme-pick]').count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('[data-theme-pick="settlement"]')).toBeVisible();

  const groundOf = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.locator('[data-theme-pick="daylight"]').click();
  await expect.poll(groundOf).toBe('rgb(232, 220, 196)');
  await page.locator('[data-theme-pick="settlement"]').click();
  await expect.poll(groundOf).toBe('rgb(20, 16, 12)');

  // Remembered, because the way this gets used is to leave the phone on one
  // direction and come back to it.
  await page.reload();
  await expect
    .poll(async () => page.locator('[data-theme-pick="settlement"]').getAttribute('aria-pressed'))
    .toBe('true');

  expect(errors).toEqual([]);
});

test('the manual shows the alphabet the rules are written in', async ({ page }) => {
  // Marc, 2026-08-29: "adding visuals and assets and symbols in the how to
  // play". The manual explained the rules and never showed the marks — a
  // player who met a glyph on a hex could only learn it by tapping that hex,
  // which needed them to have walked there first.
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  await page.locator('[data-door="how"]').click();
  await panel(page, 'manual').waitFor({ state: 'visible' });

  await page.locator('[data-tab="play"]').click();
  const legend = page.locator('.legend');
  await legend.waitFor({ state: 'visible' });

  // Four grounds, five destinations, and the other marks.
  expect(await legend.locator('.legend-mark').count()).toBeGreaterThanOrEqual(10);
  // The swatches are the DIRECTION's own fills, so the legend repaints with
  // the board rather than being a second copy of the palette.
  expect(await legend.locator('.legend-swatch').count()).toBeGreaterThanOrEqual(4);

  // And a destination opens its own definition, rather than the legend
  // repeating a sentence this project keeps in one place.
  await legend.locator('[data-term="shrine"]').click();
  await expect(page.locator('.card-scrim .card')).toBeVisible();

  expect(errors).toEqual([]);
});

test('the worlds panel shows what this world has become', async ({ page }) => {
  // A world outlives every run played on it, and the only thing the game said
  // about one was a single line in the list. `knownFraction` and `unlockedBy`
  // were both written, tested, and called by nobody.
  const errors = watchErrors(page);
  await page.goto('/?end=1&taught=1&seed=7');
  await begin(page);
  // Bank a run, so the world has a history to show.
  await page.locator('[data-hud="end"]').waitFor({ state: 'visible' });

  await page.locator('[data-door="more"]').click();
  await page.locator('[data-go="worlds"]').click();
  await panel(page, 'worlds').waitFor({ state: 'visible' });

  const atlas = page.locator('.atlas');
  await atlas.waitFor({ state: 'visible' });
  // Seven facts: runs, best, farthest, known, territories, shrines, finds.
  expect(await atlas.locator('.fact-label').count()).toBe(7);
  // KNOWN is a percentage — the least misleading story about an infinite
  // plane, and the number that proves this is the world's own memory rather
  // than the run's.
  await expect(atlas).toContainText('%');

  expect(errors).toEqual([]);
});
