import { expect, test, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
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
 * ## AND SINCE P8.4 IT PROVES A SECOND THING (2026-09-10)
 *
 * The policy no longer says `'unsafe-inline'`: the page's two inline blocks
 * are hashed at build time by `vite.config.ts`'s `contentPolicy` plugin. So
 * the file this reads is `apps/game/dist/_headers` — the generated one — and
 * there is a second test, which injects an inline script and an inline style
 * attribute and asserts that neither takes effect. That test fails against
 * every policy this repository served before today, which is the point of it.
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

/**
 * The policy the edge will serve, read from the file the BUILD writes.
 *
 * `apps/game/dist/_headers`, not the source in `public/` — since P8.4 the
 * `script-src` and `style-src` hashes are computed from `dist/index.html` by
 * `vite.config.ts`'s `contentPolicy` plugin, so the source file carries marks
 * rather than a policy and a test pinned to it would prove nothing about what
 * a browser is told. `playwright.config.ts`'s `webServer` builds before it
 * previews, so the file is there by the time this runs.
 */
function policy(): string {
  const built = 'apps/game/dist/_headers';
  if (!existsSync(built)) throw new Error(`no ${built} — this suite builds first, so run it`);
  const text = readFileSync(built, 'utf8');
  const line = text
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith('Content-Security-Policy:'));
  if (line === undefined) throw new Error(`no Content-Security-Policy in ${built}`);
  const csp = line.slice('Content-Security-Policy:'.length).trim();
  if (csp.includes('__INLINE_')) {
    throw new Error(`the build left a mark unfilled in ${built}: ${csp}`);
  }
  return csp;
}

/**
 * WHAT THE POLICY MUST SAY BEFORE ANYTHING IS RUN UNDER IT.
 *
 * Both tests below apply a policy read out of a file, so a file that lost a
 * directive would make them pass by having nothing to enforce. These are the
 * two clauses whose absence is silent: the worker clause, without which the
 * board's labels do not draw (and WebKit's own refusal would hide it), and the
 * inline hashes, without which `script-src` is `'unsafe-inline'` again and the
 * injection test below is testing a policy that permits injection.
 */
function checkFixture(csp: string): void {
  expect(csp, 'the shipped CSP has no worker-src').toContain("worker-src 'self' blob:");
  expect(csp, "the CSP is back to 'unsafe-inline' — P8.4's hashes are gone").not.toContain(
    "'unsafe-inline'",
  );
  expect(csp, 'script-src carries no inline hash, so the floor guard is refused').toMatch(
    /script-src [^;]*'sha256-/,
  );
  expect(csp, 'style-src carries no inline hash, so the pre-JS paint is refused').toMatch(
    /style-src [^;]*'sha256-/,
  );
}

/**
 * SERVE THE DOCUMENT UNDER THAT POLICY, since the preview server will not.
 *
 * The DOCUMENT only, and its encoding headers dropped. Both halves cost a
 * debugging round. Re-fulfilling every request re-serves the whole bundle
 * through the interceptor for no benefit — the CSP is a property of the
 * document. And `route.fetch()` hands back a DECODED body while `res.headers()`
 * still says `content-encoding: gzip`, so a naive pass-through tells the
 * browser to gunzip plain text: the page loads, the script never parses, and
 * **nothing appears in the console at all**. It looked exactly like a CSP that
 * had blocked the bundle, which is the wrong lesson to draw from a
 * green-looking file.
 */
async function serveWithPolicy(page: Page, csp: string): Promise<void> {
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
}

test('the board draws, and the game plays, under the shipped CSP', async ({ page }) => {
  const errors = watchErrors(page);
  const csp = policy();
  checkFixture(csp);

  await serveWithPolicy(page, csp);

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

/**
 * AND THE POLICY REFUSES CODE THE PAGE DID NOT SHIP (`PASS.md` P8.4).
 *
 * This is the test that fails against the policy shipped before 2026-09-10.
 * `script-src` carried `'unsafe-inline'` — named as a real weakness in
 * `_headers` rather than hidden, and load-bearing all the same: with it, ANY
 * inline `<script>` that reaches this document runs, which is the entire
 * mechanism the directive exists to stop. Hashing the page's own two blocks
 * (the floor guard and the pre-JS paint) is what let it go.
 *
 * Injected through the DOM rather than through the markup, because that is
 * both what an injection looks like on a page with no server rendering and
 * what a browser treats identically: a `<script>` element with a body is
 * inline code whatever put it there, and its content is checked against the
 * hashes.
 *
 * The style attribute is here for the same reason and it is the half that cost
 * two edits to `index.html`: **a hash never covers a `style` attribute**, so
 * `style-src` could only drop `'unsafe-inline'` once the floor guard and the
 * `<noscript>` stopped writing one. This asserts what that bought.
 *
 * No `watchErrors` — two refusals are the expected outcome here, and they are
 * reported as console errors.
 */
test('inline code the page did not ship is refused', async ({ page }) => {
  const csp = policy();
  checkFixture(csp);
  await serveWithPolicy(page, csp);
  await page.goto('/?seed=7&taught=1');
  // The door is enough: the policy is a property of the document, and this
  // proves the document is up and the bundle ran under it.
  await expect(page.locator("[data-door='begin']")).toBeVisible();

  const ran = await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'window.__injected = true;';
    document.head.append(script);
    return (window as unknown as { __injected?: boolean }).__injected === true;
  });
  expect(ran, 'an injected inline script RAN — script-src is permitting inline code').toBe(false);

  const outline = await page.evaluate(() => {
    const div = document.createElement('div');
    div.setAttribute('style', 'outline-style: dotted');
    document.body.append(div);
    const applied = getComputedStyle(div).outlineStyle;
    div.remove();
    return applied;
  });
  expect(outline, 'an injected style attribute APPLIED — style-src permits inline styles').toBe(
    'none',
  );
});
