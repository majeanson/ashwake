import { expect, test, type Page } from '@playwright/test';
import { assertLooksLikeAPicture, begin, watchErrors } from './helpers';

/**
 * The two links SHARE hands out, opening the games they name (2026-08-29).
 *
 * **This is the game's entire distribution mechanism**, in `shell/share.ts`'s
 * own words: no backend, no account, no store listing, so a run reaches another
 * person because somebody pasted a link into a chat. Which makes a link that
 * opens the wrong game the most expensive kind of quiet bug — the sender is
 * told it worked and the recipient never learns what they missed.
 *
 * `?daily=` was exactly that. `meta/share.ts` has emitted it since the rules
 * were lifted and `meta/route.ts` was written to read it back, and nothing in
 * the app ever called `parseRoute` — so a shared daily result opened the
 * recipient's own front door and ignored the date entirely.
 *
 * **Measured through the run, not the picture.** A board's pixels are not a
 * stable equality test — the fit, the frame the shot lands on and the driver's
 * own antialiasing all move underneath it — and a flaky gate is worse than no
 * gate. What IS exact is the game: `?place=12` plays a fixed opening through
 * the reducer, so the numbers on the stat row afterwards are a pure function of
 * the seed. Two dates draw two different runs; one date draws the same run
 * twice. That is the property a player would notice, and it is what makes "we
 * both played the same ground today" true.
 */

test.use({ viewport: { width: 390, height: 844 } });

/**
 * The run after a fixed opening: a pure function of its seed.
 *
 * The stat row alone is not enough and it is worth saying why, because the
 * first version of this test passed against the bug. Twelve placements with no
 * harvest leave most of the row identical whatever the ground was — 10 tiles
 * left, 0 points, reach 5 — so two different dailies fingerprinted the same.
 * The HAND is where a seed shows: which colours were drawn, in what order, at
 * what rarity. Both, so the fingerprint covers the world and the deck.
 */
async function runOf(page: Page, url: string): Promise<string> {
  await page.goto(url);
  await begin(page);
  await page.locator('canvas').waitFor({ state: 'attached' });
  await expect(page.locator('[data-stat="tiles"] .stat-value')).not.toHaveText('');
  return page.evaluate(() => {
    const stats = [...document.querySelectorAll('[data-stat]')]
      .map((el) => `${el.getAttribute('data-stat')}=${el.textContent?.trim() ?? ''}`)
      .join(' · ');
    const hand = [...document.querySelectorAll('.tile[data-colour]')]
      .map((el) => `${el.getAttribute('data-colour')}/${el.getAttribute('data-rarity')}`)
      .join(',');
    return `${stats} || ${hand}`;
  });
}

test('a shared ?daily= link opens THAT date, and the same date twice', async ({ page }) => {
  const errors = watchErrors(page);

  // Two dates on or after the epoch, so both are playable dailies rather than
  // dates `parseRoute` refuses. Fixed rather than relative to today: a test
  // whose input drifts with the clock is a test that fails on a Tuesday.
  const one = await runOf(page, '/?daily=2026-08-26&taught=1&place=12');
  const two = await runOf(page, '/?daily=2026-08-27&taught=1&place=12');
  const again = await runOf(page, '/?daily=2026-08-26&taught=1&place=12');

  expect(one, 'two dailies played the same run — the date is being ignored').not.toEqual(two);
  expect(again, 'one date played two runs — the daily is not its date’s').toEqual(one);

  // And it is still a board, not an empty scene that happens to differ.
  // The board renders on demand and the label font lands a beat after the
  // first frame, so the shot waits the way `board.spec.ts` does.
  await page.waitForTimeout(600);
  const shot = await page.locator('canvas').screenshot();
  assertLooksLikeAPicture(shot, 'a shared daily');

  expect(errors).toEqual([]);
});

test('a ?daily= that is not one falls back to the world, rather than to nothing', async ({
  page,
}) => {
  const errors = watchErrors(page);

  // `isPlayableDaily` owns the shape AND the epoch, so a truncated, invented or
  // pre-epoch date is simply not a daily — and the device's own world is the
  // honest place to land, not an error and not an empty board.
  const rubbish = await runOf(page, '/?daily=not-a-date&taught=1&place=12');
  const tooEarly = await runOf(page, '/?daily=2026-08-01&taught=1&place=12');
  const home = await runOf(page, '/?taught=1&place=12');

  expect(rubbish, 'a malformed ?daily= did not fall back to the world').toEqual(home);
  expect(tooEarly, 'a pre-epoch ?daily= did not fall back to the world').toEqual(home);

  expect(errors).toEqual([]);
});
