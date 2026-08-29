import { expect, test, type Page } from '@playwright/test';
import { assertLooksLikeAPicture, begin, clearCards, watchErrors } from './helpers';

/**
 * The real-browser smoke (Stage 2, 2026-08-28): nothing in the unit suite
 * renders a frame — there is no WebGL in vitest — so the whole class of
 * renderer crashes is invisible until a browser draws. This boots the
 * PRODUCTION build in headless Chromium, with WebGL actually rendering, walks
 * the first minute, and fails on any uncaught error.
 *
 * Portrait phone viewport, because that is the only screen that matters.
 */

test.use({ viewport: { width: 390, height: 844 } });

const tiles = async (page: Page): Promise<number> =>
  Number(await page.locator('[data-stat="tiles"] .stat-value').textContent());

/** Tap around the centre in widening rings until a placement lands. The
 *  opening board is one tile at the origin with six legal neighbours around
 *  it, so a ring at the hex pitch finds one. */
async function placeOneTile(page: Page): Promise<void> {
  const box = await page.locator('canvas').boundingBox();
  if (box === null) throw new Error('no canvas');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const before = await tiles(page);
  for (const radius of [40, 60, 80, 30, 100, 20, 120, 140]) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI / 6) * i;
      await clearCards(page);
      await page.mouse.click(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      if ((await tiles(page)) < before) {
        await clearCards(page);
        return;
      }
    }
  }
  throw new Error('placeOneTile: no legal hex found in the search rings');
}

test('boots, draws a board with WebGL, and takes a placement', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7');
  await expect(page.locator('canvas')).toBeVisible();
  await begin(page);
  await expect(page.locator('[data-stat="tiles"] .stat-value')).not.toHaveText('');
  // Let the first frame and the font land.
  await page.waitForTimeout(600);

  const shot = await page.locator('canvas').screenshot();
  assertLooksLikeAPicture(shot, 'the opening board');

  const before = await tiles(page);
  await placeOneTile(page);
  expect(await tiles(page)).toBeLessThan(before);

  // The camera: lean in on the last tile and back out to the fit, with the
  // board still live. One toggle, because a phone already has a pinch.
  const camera = page.locator('[data-action="camera"]');
  await camera.click();
  await page.waitForTimeout(400);
  await camera.click();
  await page.waitForTimeout(400);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('speaks French to a French phone, English to an English one', async ({ browser }) => {
  // Both the FIRST word a player reads and a word from inside the run, because
  // the door and the HUD reach the catalogue by different paths and either
  // could be the one that regressed.
  for (const [locale, door, stat] of [
    ['fr-CA', 'COMMENCER', 'TUILES'],
    ['en-US', 'BEGIN', 'TILES'],
  ] as const) {
    const context = await browser.newContext({ locale, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/?seed=7');
    await expect(page.locator('[data-door="begin"]')).toHaveText(door);
    await begin(page);
    await expect(page.locator('[data-stat="tiles"]')).toContainText(stat);
    await context.close();
  }
});

test('takes a placement with the board leaned and turned', async ({ page }) => {
  // The tap is a raycast now, not a hex-from-pixel inversion, so the angle is
  // exactly the thing that could quietly break it: at 45 degrees, turned 45
  // more, with the ground standing at different heights, a finger has to
  // still land on the hex under it.
  const errors = watchErrors(page);
  await page.goto('/?seed=7&place=12&tilt=45&yaw=45&relief=0.35');
  await expect(page.locator('canvas')).toBeVisible();
  await begin(page);
  await page.waitForTimeout(600);
  const before = await tiles(page);
  await placeOneTile(page);
  expect(await tiles(page)).toBeLessThan(before);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('keeps taking taps on the frontier as the board grows', async ({ page }) => {
  // Marc, on a phone, 2026-08-29: "most of the clicks in the upper tiles don't
  // work." `InstancedMesh` measures its bounding sphere on the FIRST ray it is
  // ever given and caches it forever, and its raycast tests that sphere before
  // any instance — so every cell the board grew after the first tap fell
  // outside it and went quiet. A growing board is the whole game, so this walks
  // one outward and insists every placement still lands.
  const errors = watchErrors(page);
  await page.goto('/?seed=7&tilt=35');
  await expect(page.locator('canvas')).toBeVisible();
  await begin(page);
  await page.waitForTimeout(600);

  for (let i = 0; i < 8; i++) {
    const before = await tiles(page);
    await placeOneTile(page);
    expect(await tiles(page), `placement ${i + 1} never landed`).toBeLessThan(before);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('finishes a run and starts another', async ({ page }) => {
  // This is the shape of v2.0's gate. `DECISIONS.md` D1 turns on a stranger
  // finishing a run and CHOOSING to start another, and a loop that cannot be
  // completed by a script certainly cannot be completed by a person.
  const errors = watchErrors(page);
  await page.goto('/?seed=7&end=1');
  await begin(page);
  await clearCards(page);

  const end = page.locator('[data-hud="end"]');
  await expect(end).toBeVisible();
  // The run said something about itself rather than only printing a number:
  // a score, and an epitaph with words in it.
  await expect(end).toContainText(/[0-9]/);
  await expect(end.locator('.end-epitaph')).not.toBeEmpty();

  await page.locator('[data-action="new-run"]').click();
  await clearCards(page);

  // Back on a live board, with the run reset rather than the end screen hidden.
  await expect(page.locator('[data-hud="stats"]')).toBeVisible();
  await expect(end).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('remembers a run across a reload', async ({ page }) => {
  // Stage 4's whole point. Nothing survived a reload before this, which meant
  // a phone that locked mid-run lost the run — and a game that punishes you
  // for answering the phone is a game you stop opening.
  const errors = watchErrors(page);
  await page.goto('/?seed=7');
  await begin(page);
  await clearCards(page);

  const before = await tiles(page);
  await placeOneTile(page);
  const after = await tiles(page);
  expect(after).toBeLessThan(before);

  // A real reload, not a re-render: the keeper has to have reached the disk.
  await page.reload();
  await expect(page.locator('[data-door="begin"]')).toHaveText(/RESUME|REPRENDRE/);
  await begin(page);
  await clearCards(page);

  expect(await tiles(page)).toBe(after);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('forgets a finished run, so BEGIN means begin', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7&end=1');
  await begin(page);
  await clearCards(page);
  await expect(page.locator('[data-hud="end"]')).toBeVisible();

  await page.reload();
  // A finished run is not a resumable one: the door offers a beginning.
  await expect(page.locator('[data-door="begin"]')).toHaveText(/BEGIN|COMMENCER/);
  expect(errors, errors.join('\n')).toEqual([]);
});
