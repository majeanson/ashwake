import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { begin, clearCards, placeOneTile, tilesLeft, watchErrors } from './helpers';

/**
 * THE GAME UNDER ITS OWN CONTENT SECURITY POLICY (2026-09-09).
 *
 * `public/_headers` grew a CSP, and a CSP is the one piece of hardening that
 * can take a whole rendering layer with it. `troika-three-text` starts its glyph
 * worker from a `blob:` URL — written down in `helpers.ts` because Playwright's
 * WebKit refuses it and the board's labels do not draw there. A policy that
 * forgot `worker-src blob:` would reproduce that refusal in every real browser:
 * every number and mark on the board gone, silently, and **only on the
 * deployed build**, because `vite preview` does not serve `_headers`.
 *
 * So the policy is read out of the file the platform will serve and applied
 * here by hand. That is the only way to run the real game under the real
 * policy before a deploy — and the file is PARSED rather than pasted, so a
 * policy edited in one place cannot pass a test pinned to the other's copy.
 *
 * **Chromium only, and deliberately.** `playwright.config.ts` runs WebKit over
 * a named list of specs and this is not on it: WebKit's own troika refusal is
 * already swallowed by `watchErrors`'s noise filter, so the exact console
 * lines this test exists to catch would be invisible there. A test that cannot
 * fail on an engine is worse than not running it on that engine — it reports a
 * policy as proven where nothing was checked.
 *
 * `scripts/verify-deploy.ts` checks the other half: that Cloudflare actually
 * puts the header on the response. A test can prove the file is right; only a
 * request can prove a browser will be told.
 */

test.use({ viewport: { width: 390, height: 844 } });

/** The policy the edge will serve, read from the file that defines it. */
function policy(): string {
  const text = readFileSync('apps/game/public/_headers', 'utf8');
  const line = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('Content-Security-Policy:'));
  if (line === undefined)
    throw new Error('no Content-Security-Policy in apps/game/public/_headers');
  return line.slice('Content-Security-Policy:'.length).trim();
}

test('the board draws, and the game plays, under the shipped CSP', async ({ page }) => {
  const errors = watchErrors(page);
  const csp = policy();
  // Sanity on the fixture itself: a policy that lost its worker clause would
  // make this test pass for the wrong reason on WebKit, where the labels do
  // not draw anyway.
  expect(csp, 'the shipped CSP has no worker-src').toContain("worker-src 'self' blob:");

  /*
   * The DOCUMENT only, and its encoding headers dropped.
   *
   * Both halves cost a debugging round. Re-fulfilling every request re-serves
   * the whole bundle through the interceptor for no benefit — the CSP is a
   * property of the document. And `route.fetch()` hands back a DECODED body
   * while `res.headers()` still says `content-encoding: gzip`, so a naive
   * pass-through tells the browser to gunzip plain text: the page loads, the
   * script never parses, and **nothing appears in the console at all**. It
   * looked exactly like a CSP that had blocked the bundle, which is the wrong
   * lesson to draw from a green-looking file.
   */
  await page.route(
    (url) => url.pathname === '/' || url.pathname.endsWith('.html'),
    async (route) => {
      const res = await route.fetch();
      const headers: Record<string, string> = {
        ...res.headers(),
        'content-security-policy': csp,
      };
      delete headers['content-encoding'];
      delete headers['content-length'];
      await route.fulfill({ status: res.status(), headers, body: await res.body() });
    },
  );

  await page.goto('/?seed=7&taught=1');
  await begin(page);
  await clearCards(page);

  // The board exists and the run is live: the stat row is the shell, the
  // canvas is the renderer, and a placement is the reducer answering a tap.
  await expect(page.locator("[data-hud='stats']")).toBeVisible();
  // `attached`, for `begin`'s own stated reason: the board host can be real,
  // mounted and covered, and insisting on visible would fail on a screen this
  // test does not care about. What proves the RENDERER ran is the placement
  // below (a tap the reducer answers) and the empty error list at the end.
  await expect(page.locator('canvas')).toBeAttached();
  // A placement, read the way every other spec reads one: the purse went down,
  // which means the reducer answered a tap on a board the renderer had drawn.
  const held = await tilesLeft(page);
  await placeOneTile(page);
  expect(await tilesLeft(page), 'the board took no placement under the CSP').toBeLessThan(held);

  /*
   * AND NOTHING WAS BLOCKED.
   *
   * A CSP violation is reported as a console error, which `watchErrors` is
   * already gathering for the renderer-crash canary — so the assertion that
   * makes this test worth having is the same one every other spec ends with.
   * A refused worker, a refused font, a refused image all land here.
   */
  expect(errors, errors.join('\n')).toEqual([]);
});
