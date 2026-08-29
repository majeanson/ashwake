import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { assertLooksLikeAPicture, watchErrors } from './helpers';

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
