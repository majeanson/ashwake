import { expect, test } from '@playwright/test';
import { watchErrors } from './helpers';

/**
 * The chrome renders in the faces the directions actually name.
 *
 * This body declared no `@font-face` at all between Stage 3 and 2026-08-29.
 * `themeCssVars` handed `ui.css` `"Cinzel, 'Trajan Pro', Georgia, serif"` and
 * `"'EB Garamond', Garamond, Georgia, serif"`, the files were never carried
 * over from Ashwake 1, and so every screen a player reads — door, manual,
 * shop, settings, end screen — fell through to Georgia.
 *
 * **Nothing would ever have reported it.** A missing face is not an error, not
 * a console warning and not a failed request the page notices; the text simply
 * renders in something else and looks a bit wrong to somebody who has never
 * seen it look right. That is precisely why it needs a test rather than an
 * eye: the one font that DID ship is troika's, so the board was correct and
 * the chrome around it was not, which is the hardest version to spot.
 */

test.use({ viewport: { width: 390, height: 844 } });

test('both chrome faces load, and the front door is set in them', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.locator('[data-door="begin"]').waitFor({ state: 'visible' });

  // `document.fonts.load` resolves whether or not the face exists, so the
  // answer is `check` afterwards — which is false for a family the document
  // has no @font-face rule for and no local copy of.
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([
      document.fonts.load('600 1rem Cinzel'),
      document.fonts.load('400 1rem "EB Garamond"'),
      document.fonts.load('italic 400 1rem "EB Garamond"'),
    ]);
    return {
      cinzel: document.fonts.check('600 1rem Cinzel'),
      garamond: document.fonts.check('400 1rem "EB Garamond"'),
      italic: document.fonts.check('italic 400 1rem "EB Garamond"'),
      families: [...new Set([...document.fonts].map((f) => f.family))].sort(),
    };
  });

  expect(loaded.cinzel, 'Cinzel did not load — the display face').toBe(true);
  expect(loaded.garamond, 'EB Garamond did not load — the body face').toBe(true);
  expect(loaded.italic, 'EB Garamond italic did not load').toBe(true);
  expect(loaded.families).toEqual(['Cinzel', 'EB Garamond']);

  expect(errors).toEqual([]);
});

test('the board’s own font is the TTF troika can actually parse', async ({ page }) => {
  const errors = watchErrors(page);
  const asked: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/fonts/')) asked.push(new URL(r.url()).pathname);
  });

  await page.goto('/?seed=7');
  await page.locator('canvas').waitFor({ state: 'attached' });
  await page.waitForTimeout(600);

  // Both halves of the split, proved by what the page actually fetched: woff2
  // for the DOM, TTF for the board. Shipping only one of the two is the state
  // this body was in, in each direction at different times — Stage 2 tried a
  // woff2 for the board and troika refused it.
  expect(asked, 'the board never asked for its TTF').toContain('/fonts/cinzel.ttf');
  expect(
    asked.some((p) => p.endsWith('.woff2')),
    'the chrome never asked for a woff2',
  ).toBe(true);

  expect(errors).toEqual([]);
});
