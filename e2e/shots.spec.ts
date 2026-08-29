import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { assertLooksLikeAPicture, begin, clearCards, watchErrors } from './helpers';

/**
 * The shot set (Stage 2b, 2026-08-28): one picture per camera angle, over ONE
 * board, so the open question in `DECISIONS.md` can be answered by looking
 * rather than by imagining. `?place=12` plays the same twelve placements every
 * time, so the only thing that differs between these files is the look.
 *
 * It is also a smoke test, and that is not an afterthought: every angle here
 * is an angle a phone can be handed, and a board that draws at zero degrees
 * can still draw nothing at forty-five. Each shot has to be a picture and
 * nothing may report an error.
 *
 * Portrait phone, like everything else that matters.
 */

const SHOTS = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'shots');

const ANGLES = [
  ['s2-board-top', 'tilt=0'],
  ['s2-board-tilt35', 'tilt=35'],
  ['s2-board-tilt45', 'tilt=45'],
  ['s2-board-tilt35-yaw45', 'tilt=35&yaw=45'],
  ['s2-board-tilt45-yaw45', 'tilt=45&yaw=45'],
  ['s2-board-tilt35-relief', 'tilt=35&relief=0.35'],
  ['s2-board-tilt45-relief', 'tilt=45&relief=0.35'],
  ['s2-board-tilt45-relief-high', 'tilt=45&relief=0.8'],
  // Stage 2c: the rig. `light=0` is every face as the direction authored it —
  // the same board as `s2-board-tilt35`, which is what makes it the honest
  // zero rather than a dimmer setting.
  ['s2c-light-half', 'tilt=35&light=0.5'],
  ['s2c-light-full', 'tilt=35&light=1'],
  ['s2c-light-half-relief', 'tilt=35&light=0.5&relief=0.35'],
  ['s2c-light-full-relief', 'tilt=35&light=1&relief=0.35'],
  ['s2c-light-full-relief-high', 'tilt=45&light=1&relief=0.8'],
  // The materials.  is the ground alone — the same board as
  //  — so the pair is the honest before and after.
  ['s2c-materials', 'tilt=35&light=1&materials=1'],
  ['s2c-materials-relief', 'tilt=35&light=1&materials=1&relief=0.35'],
  ['s2c-materials-art', 'tilt=35&light=1&materials=1&art=1'],
  ['s2c-materials-art-relief', 'tilt=35&light=1&materials=1&art=1&relief=0.35'],
] as const;

test.use({ viewport: { width: 390, height: 844 } });

for (const [name, query] of ANGLES) {
  test(`draws ${name}`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(`/?seed=7&place=12&${query}`);
    await expect(page.locator('canvas')).toBeVisible();
    await begin(page);
    // The board is drawn on demand, so give the first frame and the font time
    // to land — a font that has not loaded is a board that has not drawn.
    await page.waitForTimeout(800);

    // The canvas alone is what has to BE a picture; the whole phone is what
    // gets looked at, because a board is judged next to the chrome over it.
    assertLooksLikeAPicture(await page.locator('canvas').screenshot(), name);
    await mkdir(SHOTS, { recursive: true });
    await writeFile(join(SHOTS, `${name}.png`), await page.screenshot());

    expect(errors, errors.join('\n')).toEqual([]);
  });
}

/**
 * The pop, caught in the air.
 *
 * A screenshot of an animation is a screenshot of one instant, so this one is
 * deliberately taken 160ms in — after the leap has left the ground and before
 * the cascade's last tile has gone. It is the only way to see, in a still,
 * that the COLOUR is above the board while the grey is already under it.
 */
test('catches the harvest in the air', async ({ page }) => {
  const errors = watchErrors(page);
  // `taught=1`: a device that has met every lesson, so the board is the only
  // thing in the picture. A card over it would make this a picture of a card.
  await page.goto('/?seed=7&place=12&taught=1&tilt=35&light=1&materials=1');
  await expect(page.locator('canvas')).toBeVisible();
  await begin(page);
  await page.waitForTimeout(700);

  await clearCards(page);
  const pop = page.getByRole('button', { name: /POP/ });
  await expect(pop).toBeVisible();
  await pop.click();

  await mkdir(SHOTS, { recursive: true });
  // Three instants, because an animation judged from one still is an animation
  // judged from luck: the burst, the arc, and the tail of the cascade.
  let last = 0;
  for (const at of [70, 160, 320]) {
    await page.waitForTimeout(at - last);
    last = at;
    // The CANVAS, not the page: a harvest can raise a teaching card, and a
    // card over the board would make this a picture of the card. The pop is a
    // board effect, so the board is what gets photographed.
    const shot = await page.locator('canvas').screenshot();
    assertLooksLikeAPicture(shot, `the harvest at ${at}ms`);
    await writeFile(join(SHOTS, `s2d-pop-${at}.png`), shot);
  }

  expect(errors, errors.join('\n')).toEqual([]);
});

/**
 * The screens, as a stranger meets them.
 *
 * Not a pass/fail — a set of pictures to look at. It walks the first minute in
 * order: the door, whatever the game teaches first, the board with its chrome,
 * the manual and settings.
 */
test('shoots the first minute', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7');
  await mkdir(SHOTS, { recursive: true });

  await page.locator('[data-door="begin"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(500);
  await writeFile(join(SHOTS, 's3-door.png'), await page.screenshot());

  await page.locator('[data-door="begin"]').click();
  await page.locator('[data-hud="stats"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  if ((await page.locator('.card-scrim').count()) > 0) {
    await writeFile(join(SHOTS, 's3-teaching.png'), await page.screenshot());
  }
  await clearCards(page);
  await page.waitForTimeout(400);
  await writeFile(join(SHOTS, 's3-playing.png'), await page.screenshot());

  await page.locator('.help').click();
  await page.waitForTimeout(300);
  await writeFile(join(SHOTS, 's3-manual.png'), await page.screenshot());

  await page.getByRole('button', { name: 'SETTINGS' }).first().click();
  await page.waitForTimeout(300);
  await writeFile(join(SHOTS, 's3-settings.png'), await page.screenshot());

  // How a run ends, which is the screen the whole gate turns on.
  await page.goto('/?seed=7&end=1');
  await page.locator('[data-door="begin"]').click();
  await clearCards(page);
  await page.locator('[data-hud="end"]').waitFor({ state: 'visible' });
  await page.waitForTimeout(300);
  await writeFile(join(SHOTS, 's3-end.png'), await page.screenshot());

  expect(errors, errors.join('\n')).toEqual([]);
});
