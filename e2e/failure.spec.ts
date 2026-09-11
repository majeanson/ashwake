import { expect, test } from '@playwright/test';
import { begin } from './helpers';

/**
 * THE TWO FAILURES A PLAYER CAN ACTUALLY BE SHOWN (`PASS.md` P8.3).
 *
 * Both are about a page that is up and cannot draw, and both were reached by
 * the other rows of this item before anything was written for them:
 *
 *   THE BOARD LOST ITS CONTEXT   `board/gl.ts` has asked for a lost context
 *                                back since 2026-09-02 and nothing ever ran
 *                                it. When the browser does not return one, the
 *                                board was a black rectangle for the life of
 *                                the page with a live HUD answering taps over
 *                                it, and not a word said.
 *   THE BUNDLE NEVER ARRIVED     `index.html`'s browser-floor guard tells the
 *                                visitor their browser is too old, because the
 *                                only thing it can see is that the module
 *                                never set its flag. P8.1 hit that with a
 *                                stale chunk and P8.5 with an offline visit,
 *                                and both were written down as notes rather
 *                                than fixed. This is the fix.
 *
 * Chromium only, deliberately, and for `csp.spec.ts`'s reason: the first test
 * drives `WEBGL_lose_context`, and WebKit's own context behaviour under
 * Playwright is a thing this suite has never characterised — a flaky failure
 * test is worse than no failure test.
 */

test.use({ viewport: { width: 390, height: 844 } });

test('a context that never comes back becomes a sentence', async ({ page }) => {
  await page.goto('/?seed=7&taught=1');
  await begin(page);
  await expect(page.locator('canvas')).toBeAttached();

  /*
   * A REAL loss, through the extension the browser provides for exactly this.
   * `getContext` on a canvas three is already drawing to hands back the SAME
   * context, so this is the board's own, not a probe's — and a context lost
   * this way is only ever restored by `restoreContext()`, which nothing calls.
   * That is the case the row asks for: lost, and never coming back.
   */
  const lost = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (canvas === null) return false;
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    const ext = gl?.getExtension('WEBGL_lose_context') ?? null;
    if (ext === null) return false;
    ext.loseContext();
    return true;
  });
  expect(lost, 'this browser would not give up its context').toBe(true);

  // `gl.ts` waits `RESTORE_MS` (4s) before believing it, so a blink never
  // raises this. The timeout is that wait plus room for a slow machine.
  await expect(page.locator('#boot-failure')).toBeVisible({ timeout: 12_000 });
  await expect(
    page.locator("#boot-failure [data-crash='reload']"),
    'the exit that works was not offered',
  ).toBeVisible();
  await expect(
    page.locator("#boot-failure [data-crash='continue']"),
    'CONTINUE was offered, into a canvas that cannot draw again on this page',
  ).toHaveCount(0);
});

/**
 * AND THE SENTENCE A PAGE SHOWS WHEN ITS BUNDLE NEVER ARRIVES.
 *
 * The guard is a CLASSIC script for a reason that has not changed — on an
 * engine that cannot parse the module bundle, it is the only thing that can
 * still speak. What it could not do is tell "this engine cannot parse it" from
 * "it never got here", because both look identical from inside: the flag is
 * unset. So a stale chunk, an offline visit and a genuinely old browser all
 * read the same sentence, and two of the three are wrong.
 *
 * The request is aborted rather than the file deleted, which is the shape of
 * every real version of this: a chunk the new build does not serve, a phone on
 * no bars, a proxy that ate it.
 */
test('a bundle that never arrived does not blame the browser', async ({ page }) => {
  await page.route('**/assets/index-*.js', (route) => route.abort());
  await page.goto('/');

  const said = await page.locator('body').innerText();
  expect(said, 'an up-to-date browser was told it was too old').not.toContain(
    'navigateur plus récent',
  );
  expect(said, 'nothing was said at all about a page that cannot load').toContain(
    'n’a pas pu se charger',
  );
  // Both languages, like the guard's other sentence: the page is served in
  // French and read by people who do not read it.
  expect(said).toContain('could not load');
});
