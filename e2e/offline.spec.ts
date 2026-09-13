import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import { begin, watchErrors } from './helpers';

/**
 * ASHWAKE WITH THE NETWORK OFF (`PASS.md` P8.5, 2026-09-10).
 *
 * `public/sw.js` and `vite.config.ts`'s precache stamp have been in the build
 * since Stage 4, they carry two bugs' worth of scar tissue in their comments —
 * the white screen of 2026-08-18, the all-or-nothing `addAll` of 2026-08-20 —
 * and **nothing has ever loaded this game with the network off.** Every claim
 * about offline in this repository was an argument about code.
 *
 * The two cases the row asks for are not symmetrical:
 *
 *   VISIT ONE, OFFLINE   Unreachable by construction and pinned as such. The
 *                        worker registers after the first playable frame, so
 *                        with nothing cached there is nothing to serve and the
 *                        browser's own error page is the honest outcome. What
 *                        matters is that it is the BROWSER's failure and not a
 *                        white page of ours.
 *   VISIT TWO, OFFLINE   The whole point of the feature, and the case both
 *                        bugs above were. The game must boot, walk through the
 *                        door and draw a board, out of the cache alone.
 *
 * **Chromium only**, and the skip below says what was measured on WebKit
 * rather than what was predicted of it.
 */

/**
 * CHROMIUM-ONLY, AND MEASURED RATHER THAN ASSUMED (P6.1, 2026-09-10).
 *
 * The first version of this file guessed that Playwright's WebKit ran service
 * workers "in a way this suite has never characterised". It was run: every
 * offline navigation dies with **"WebKit encountered an internal error"**
 * before the worker is consulted — the reload in the first two tests, and the
 * deliberately-failing `goto` in the last, which is supposed to reject with a
 * transport error and instead rejects with the harness falling over.
 *
 * So the skip stays, with the reason it earned. What is NOT covered by it:
 * whether Safari on a phone serves this game from its cache. That is Session
 * A's, and it is the only way to know.
 */
test.beforeEach(({ browserName }) => {
  test.skip(
    browserName !== 'chromium',
    'Playwright WebKit answers an offline navigation with an internal error',
  );
});

/**
 * DARK, BECAUSE THAT IS THE DIRECTION THE PRECACHE CARRIES.
 *
 * `pickForScheme` gives a device that prefers light (or more contrast)
 * `daylight`, and the build's precache walk ships ONE direction's art — the
 * default, which is what a dark or unstated device opens in. So the colour
 * scheme decides which of two offline stories a test is telling, and the tests
 * below tell both on purpose. Playwright's own default is LIGHT, which is how
 * the second story was found rather than reasoned about.
 */
test.use({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });

/** One direction ships art; `vite.config.ts` narrowed the precache to it. */
const SHIPPING = 'settlement';
const OTHER = 'daylight';

/**
 * WAIT FOR THE WORKER TO BE IN CHARGE, WHICH IS NOT WHEN THE CACHE FILLS.
 *
 * The first version of this helper polled the CACHE — index, a script, a
 * stylesheet — and both tests below failed against a worker that is fine. Two
 * things it got wrong, and they are the same thing:
 *
 *   - `install` writes the core shell FIRST and the art, icons and fonts
 *     after, best-effort (`sw.js`: one flaky art fetch must not void all of
 *     offline). A cache holding the bundle is an install still running.
 *   - A page that registered a worker is not CONTROLLED by it until `claim()`
 *     at activate, and activate does not run until install's `waitUntil`
 *     settles. Reloading before that is a plain network navigation, which
 *     offline is an error page — the worker never saw the request.
 *
 * So the gate is the controller, which is downstream of both. Registration
 * itself is deliberately late (`shell/worker.ts` waits for idle, up to two
 * seconds, so the precache does not compete with the board's first frames),
 * hence the generous timeout rather than a default one.
 */
async function precacheReady(page: Page): Promise<void> {
  await page.waitForFunction(
    () => 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null,
    undefined,
    { timeout: 20_000 },
  );
}

/** Every path this build cached, whatever the cache is called this time. */
async function cachedPaths(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const names = await caches.keys();
    const held = await caches.open(names[0] as string);
    return (await held.keys()).map((r) => new URL(r.url).pathname);
  });
}

/** Every request the network refused, by path — what offline actually cost. */
function watchFailures(page: Page): string[] {
  const failed: string[] = [];
  page.on('requestfailed', (r) => failed.push(new URL(r.url()).pathname));
  return failed;
}

/** Visit one online, wait for the worker, then pull the plug. */
async function secondVisitOffline(page: Page, context: BrowserContext): Promise<void> {
  await page.goto('/?seed=7&taught=1');
  await precacheReady(page);
  await context.setOffline(true);
  await page.reload();
}

test('a second visit plays with the network off', async ({ page, context }) => {
  const errors = watchErrors(page);
  await secondVisitOffline(page, context);

  /*
   * The whole game, out of the cache: the door, a press, and a board.
   *
   * `begin` waits for the canvas to attach, which is the assertion that
   * matters most here — `Board` is behind `lazy()`, so the renderer is a
   * SEPARATE chunk fetched at the moment of the press. That chunk is exactly
   * what the 2026-08-18 white screen was: a cached page pointing at a script
   * the cache never held. Offline, a missing chunk is not slow, it is fatal —
   * and `ui/staleChunk.test.tsx` proves the panel could not continue past it.
   */
  await expect(page.locator("[data-door='begin']")).toBeVisible();
  await begin(page);
  await expect(page.locator("[data-hud='stats']")).toBeVisible();

  /*
   * AND NOTHING FELL OVER ON THE WAY.
   *
   * A failed subresource is a console error, which is what this list is for.
   * This is the assertion that fails without the `ignoreVary` fix in `sw.js`:
   * nine refusals, the bundle among them, and a page that told an up-to-date
   * Chromium its browser was too old.
   */
  expect(errors, errors.join('\n')).toEqual([]);
});

/**
 * AND THE HALF OF THE DEVICES THE PRECACHE DOES NOT COVER.
 *
 * A phone that prefers light opens in `daylight`, whose art the build
 * deliberately does not precache (`vite.config.ts`, 2026-09-02: a device
 * renders one direction, and downloading the others in the background of
 * somebody's first minute is the minute the stranger test measures). That
 * argument was written when four directions shipped; two do now, and the split
 * is no longer four-to-one but roughly half the phones on earth.
 *
 * What that costs is measured here rather than assumed: the game still boots,
 * still plays, and draws on the PROCEDURAL floor — the art requests fail and
 * nothing else does. A graceful fallback, and the trade is Marc's (`NEXT.md`
 * §1 carries the number: 301 KB raw, which is also over `budget.json`'s
 * precache bar).
 */
test.describe('on a device that prefers light', () => {
  test.use({ colorScheme: 'light' });

  test('a second visit still plays, on the procedural floor', async ({ page, context }) => {
    const failed = watchFailures(page);
    await secondVisitOffline(page, context);

    await expect(page.locator("[data-door='begin']")).toBeVisible();
    await begin(page);
    await expect(page.locator("[data-hud='stats']")).toBeVisible();

    expect(failed.length, 'nothing was refused — this direction IS precached now').toBeGreaterThan(
      0,
    );
    expect(
      failed.filter((p) => !p.startsWith(`/assets/${OTHER}/`)),
      'offline cost this device more than its art',
    ).toEqual([]);
  });
});

/**
 * THE NARROWING, FROM THE CACHE'S SIDE (`vite.config.ts`, 2026-09-02).
 *
 * The precache walk ships ONE direction's art, because a phone renders one and
 * downloading four in the background of somebody's first minute is the minute
 * the stranger test measures. That decision is asserted at build time by the
 * plugin — and what it costs a player has never been looked at: a device that
 * prefers light gets `daylight`, whose art is NOT precached, so its second
 * visit offline draws on the procedural floor.
 *
 * Pinned here as a fact rather than fixed, because the fix is a trade Marc
 * owns — see `NEXT.md` §1. What must not happen silently is the reverse: the
 * default direction dropping OUT of the precache, which would put every
 * offline player on the procedural floor and look like nothing at all.
 */
test('the precache carries the shipping direction only', async ({ page }) => {
  await page.goto('/');
  await precacheReady(page);
  const paths = await cachedPaths(page);

  expect(
    paths.filter((p) => p.startsWith(`/assets/${SHIPPING}/`)).length,
    'the default direction has no art cached — every offline board is procedural',
  ).toBeGreaterThan(0);
  expect(
    paths.filter((p) => p.startsWith(`/assets/${OTHER}/`)),
    'a direction nobody boots into is being downloaded on the first visit',
  ).toEqual([]);

  // The shell, all of it: the page, the bundle, the stylesheet, and the four
  // faces that are self-hosted precisely so an offline screen is still set in
  // them (2026-08-20 — three woff2 for the DOM, one TTF for troika).
  expect(paths, 'the page itself is not cached').toContain('/index.html');
  expect(paths.filter((p) => p.endsWith('.js')).length, 'no bundle cached').toBeGreaterThan(0);
  expect(paths.filter((p) => p.endsWith('.css')).length, 'no stylesheet cached').toBeGreaterThan(0);
  expect(paths.filter((p) => p.startsWith('/fonts/')).length, 'the faces are not cached').toBe(4);
});

/**
 * AND THE CASE THE WORKER CANNOT HELP WITH, stated rather than wished away.
 *
 * A first visit with no network reaches nothing: no page, no worker, no cache.
 * The pin is that this is the BROWSER's failure — `page.goto` rejects with a
 * transport error — and not ours: there is no document, so there is no white
 * screen, no dead controls, and nothing for the failure panel to be wrong
 * about. It is the one honest answer, and the only alternative would be a
 * native install.
 */
test('a first visit with no network is the browser saying so', async ({ page, context }) => {
  await context.setOffline(true);
  await expect(page.goto('/')).rejects.toThrow(/ERR_INTERNET_DISCONNECTED|ERR_NETWORK|net::/);
});

/**
 * A STALE SHELL IS NEVER SERVED, WHICH IS HOW THE RELOAD LOOP STOPS EXISTING
 * (2026-09-13, `PASS.md` P8.1, Marc's ruling).
 *
 * The loop: past the worker's 2.5 s navigation timeout the cached shell
 * answers, naming chunks the CURRENT build does not serve; the chunk 404s, the
 * import rejects, the panel comes up, and RELOAD does the same thing again
 * until the network finally beats the timer. `ui/staleChunk.test.tsx` already
 * proves CONTINUE could never escape it, so RELOAD was the only door — and
 * `CLAUDE.md` allows exactly two reloads, which is why a third was Marc's to
 * rule on. He ruled the other way: **tighten the worker rather than add an
 * escape**, because it removes the state instead of adding a way out of it.
 *
 * So the worker asks `/version.json` — ninety bytes, never cached, fetched in
 * parallel with the document so it costs no latency — and declines to fall
 * back to a shell whose build the site is no longer serving.
 *
 * **Both directions are asserted here, and the second is the one that
 * matters.** A guard that never serves the cache would "pass" the first test
 * and break offline for everybody; the pair is what says this is a narrower
 * fallback rather than no fallback. The offline tests above are the third
 * witness: a failed `/version.json` leaves the answer false, so a device with
 * no network behaves exactly as it did before.
 */
async function slowDocumentSaying(context: BrowserContext, marker: string): Promise<void> {
  // Slower than the worker's NAV_TIMEOUT_MS, so the cached shell is the thing
  // that WOULD answer. Whether it does is the subject.
  await context.route('**/index.html', async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    await new Promise((r) => setTimeout(r, 3200));
    await route.fulfill({ contentType: 'text/html', body: `<title>${marker}</title>` });
  });
  await context.route('http://localhost:4174/?*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.fallback();
    await new Promise((r) => setTimeout(r, 3200));
    await route.fulfill({ contentType: 'text/html', body: `<title>${marker}</title>` });
  });
}

test('a slow line is answered from the cache when the build still matches', async ({
  page,
  context,
}) => {
  await page.goto('/?seed=7&taught=1');
  await precacheReady(page);

  await slowDocumentSaying(context, 'FROM THE NETWORK');
  await page.reload();

  // The cached shell, because nothing says this build is gone. This is the
  // behaviour that has always been here and the half that must not regress.
  await expect(page.locator('[data-door="begin"]')).toBeVisible();
});

/**
 * AND THE OTHER HALF CANNOT BE TESTED HERE — MEASURED, NOT ASSUMED.
 *
 * The test that belongs beside the one above is "a slow line WAITS for the
 * network when the build has moved on": stage a deploy by answering
 * `/version.json` with a different sha, delay the document past the worker's
 * timeout, and assert the cached shell is declined. It was written, and it
 * fails — the cached shell is served anyway.
 *
 * Not because the guard is wrong. **Playwright's `context.route` does not
 * intercept the service worker's OWN fetches.** Instrumented, the version
 * route is hit exactly once — by the page — while the worker's request goes
 * to the real server, gets the real sha, finds it matches, and correctly
 * serves the cache. The test would have been measuring the harness.
 *
 * That is the same conclusion `e2e/quota.spec.ts` reached the same day about a
 * full device, by the same method: probe until the thing that is actually
 * happening is visible, and then say so. Two guesses were made here before the
 * instrumentation was written and both were wrong.
 *
 * **So what covers the guard, and what does not.** Covered: the cache still
 * answers a slow line when the build matches (above), and every offline test
 * in this file still passes — which is the third witness, because a failed
 * `/version.json` leaves the answer false and an offline device takes exactly
 * the path it always did. Not covered: the decline itself, and the
 * `network.catch` that keeps a dropped connection from becoming a white
 * screen. Both are read-through-and-reason, and both are written to fail
 * towards today's behaviour rather than away from it.
 *
 * `NEXT.md` §1 carries it. A real deploy landing under a real phone on a real
 * slow line is the only thing that can answer it, which makes it Session A's
 * kind of question rather than this file's.
 */
