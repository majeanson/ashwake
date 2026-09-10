import { expect, test, type Page } from '@playwright/test';
import { begin, clearCards, openMore, placeOneTile, tilesLeft } from './helpers';

/**
 * WHAT A DOOR OWES THE RUN IT IS LEAVING (2026-09-10).
 *
 * Marc, playing: *"we still cant restart a daily without us getting back to our
 * worlds."* Checking it found two things, and this pins the one that was a
 * defect rather than a gap.
 *
 * **The keeper debounces by 400ms and no door flushed it.** So the last moments
 * of a run were still owed to a keeper that was about to be dropped, and a
 * player who left a board and came back found it one placement behind the one
 * they left. Measured before the fix: a daily left at 20 tiles resumed at 21.
 *
 * It is not a daily bug — every door goes through `enterRun` and a world switch
 * had it too. The daily is where it was found because the daily is the place
 * you are most likely to step out of and back into.
 *
 * **The other finding was a GAP, and Marc ruled on it on 2026-09-10**: *"restart
 * should restart whats being played currently (world or daily, one or the
 * other)."* MORE's RESTART called `newRun()` unconditionally, and `newRun`
 * LEAVES the daily on purpose — so the one control that looks like "start this
 * over" took a daily player into their own world, which is the sentence he
 * wrote from his phone. It branches now, and the second test below is that
 * ruling.
 *
 * **No `watchErrors` here, deliberately.** This spec's subject is a number:
 * how many tiles a board has when you come back to it. The renderer canary is
 * carried by twenty other specs, and on this machine it is currently flaky in
 * a way that has nothing to do with doors — `board.spec.ts:683` passed and then
 * failed on identical code, both times on
 * `THREE.WebGLProgram: Shader Error - VALIDATE_STATUS false`, which is a driver
 * complaint rather than an app one. Asserting it here would make a tile count
 * fail for a reason it cannot see. The flake itself is written up in `NEXT.md`.
 */

test.use({ viewport: { width: 390, height: 844 } });

/** Open today's daily through the door a player actually uses. */
async function openDaily(page: Page): Promise<void> {
  await openMore(page);
  await page.locator('[data-panel="more"] [data-go="daily"]').click();
  await page.waitForTimeout(1200);
  await clearCards(page);
}

test('a daily left mid-run comes back exactly where it was left', async ({ page }) => {
  await page.goto('/?taught=1');
  await expect(page.locator('canvas')).toBeVisible();
  await begin(page);
  await openDaily(page);

  const fresh = await tilesLeft(page);
  await placeOneTile(page);
  await placeOneTile(page);
  const left = await tilesLeft(page);
  expect(left, 'the placements did not land').toBe(fresh - 2);

  /*
   * OUT AND BACK, with no pause. The pause is the whole test: waiting out the
   * 400ms debounce is what USED to make this pass, so anything that sleeps
   * here would pass against the bug it exists to catch.
   */
  await openMore(page);
  await page.locator('[data-panel="more"] [data-go="worlds"]').click();
  await page.locator('[data-slot="2"]').click();
  await page.waitForTimeout(1400);
  await clearCards(page);
  await openDaily(page);

  expect(await tilesLeft(page), 'the daily came back with a placement it had already spent').toBe(
    left,
  );
});

/**
 * RESTART RESTARTS WHAT YOU ARE PLAYING (Marc's ruling, 2026-09-10).
 *
 * Two claims, and the second is what his sentence is actually about: today's
 * board is dealt FRESH, and you are still in the daily afterwards. The old
 * behaviour satisfied neither — it began a world run, which is a fresh board of
 * a different kind in a different place — and **a tile count alone cannot tell
 * those apart**, because a world run also starts at a full purse. So the count
 * is half the test and the mode is the other half.
 */
test('RESTART deals today’s board again, and leaves you in the daily', async ({ page }) => {
  await page.goto('/?taught=1');
  await expect(page.locator('canvas')).toBeVisible();
  await begin(page);
  await openDaily(page);

  const fresh = await tilesLeft(page);
  await placeOneTile(page);
  await placeOneTile(page);
  expect(await tilesLeft(page), 'the placements did not land').toBe(fresh - 2);

  /*
   * By accessible name, in both languages, the way `board.spec.ts` reaches POP.
   * `Confirming` renders a bare button and what it SAYS is its only handle —
   * which is deliberate: once armed the name has to BE the consequence, so a
   * screen reader hears it at the moment it is what is meant.
   *
   * Two taps, because it throws a live run away and arms first.
   */
  await openMore(page);
  const restart = page
    .locator('[data-panel="more"]')
    .getByRole('button', { name: /RESTART|RECOMMENCER|START OVER|RECOMMENCER\?/ });
  await restart.click();
  await restart.click();
  await page.waitForTimeout(1400);
  await clearCards(page);

  expect(await tilesLeft(page), 'RESTART did not deal a fresh board').toBe(fresh);

  /*
   * AND IT IS STILL THE DAILY. Reached the way a player would check: MORE ▸
   * DAILY resumes today's board, so if RESTART had quietly taken us home this
   * door would hand back the daily we abandoned — two placements down — rather
   * than the one RESTART just dealt.
   */
  await openMore(page);
  await page.locator('[data-panel="more"] [data-go="daily"]').click();
  await page.waitForTimeout(1200);
  await clearCards(page);
  expect(
    await tilesLeft(page),
    'MORE ▸ DAILY did not resume the board RESTART dealt — so RESTART left the daily',
  ).toBe(fresh);
});
