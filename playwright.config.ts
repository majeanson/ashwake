import { defineConfig } from '@playwright/test';

/**
 * Serves `apps/game/dist` via vite preview: the same bundle the deploy ships,
 * not the dev server's un-minified shadow of it. **The suite can only ever be
 * as true as the last build**, and both directions of that trap have now been
 * stepped in: a green run against a stale bundle proves nothing (Ashwake 1,
 * 2026-08-26), and a RED one sends you hunting a bug that is not there — three
 * tests "failed" on 2026-08-29 against a bundle built from HEAD while the fix
 * sat in the working tree. So `pnpm test:e2e` now builds first. A comment is
 * not a safeguard at the moment it matters.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  /*
   * One worker (2026-08-29).
   *
   * Every test here boots a WebGL context, and the default worker count is a
   * fraction of the CPU count — which on a sixteen-core machine meant three
   * headless Chromiums competing for one GPU. The way it failed is why the
   * number is pinned rather than tuned: shader programs failing
   * VALIDATE_STATUS, "Target page, context or browser has been closed", and a
   * worker exiting with a Windows crash code — none of which is a bug in the
   * game, and all of which look like one. A renderer suite is not a suite you
   * parallelise on a single GPU.
   */
  workers: 1,
  retries: process.env['CI'] === undefined ? 0 : 1,
  use: { baseURL: 'http://localhost:4174' },
  /**
   * TWO ENGINES (2026-09-08), because the game is not played in this one.
   *
   * Every test in this directory ran in Chromium and only in Chromium, on a
   * repository whose own hard rule is that *testing happens on a phone, in
   * portrait* — which for Marc means WebKit. The viewport was right from the
   * first spec; the engine has never been. That is not a theoretical gap:
   * `NEXT.md` §1 has carried an unreproducible bug report since 2026-09-05
   * (controls painted over a popover, "not reproducible in Chromium at any
   * pixel ratio") whose leading theory was a CSS construct one engine might
   * decline — and the one engine that could have answered was not installed.
   *
   * **The split is deliberate, and the subset was measured rather than
   * guessed.** The whole suite was run on WebKit first: 64 of 93 passed
   * untouched. Every one of the 29 failures was read, and none of them was a
   * bug in the game:
   *
   *   - **22 were the board's own pictures** (`shots.spec.ts`, and the
   *     picture assertions in `board.spec.ts` and `links.spec.ts`).
   *     `troika-three-text` cannot load `/fonts/cinzel.ttf` in this build —
   *     "due to access control checks", on a SAME-ORIGIN request, which is the
   *     tell that it is the harness rather than a rule. The conclusion drawn
   *     here — that board LABELS do not draw — was WRONG, and the correction
   *     is the section below. See `e2e/helpers.ts`.
   *   - **3 were the two-finger gestures**, which Playwright synthesises
   *     differently per engine.
   *   - **1 was `grantPermissions(['clipboard-write'])`**, a fixture
   *     Playwright implements for Chromium alone. That test now skips with its
   *     reason on it.
   *
   * So Chromium runs everything, unchanged, and stays the gate. WebKit runs
   * the specs whose subject is the DOM — stacking, focus and keyboard, the
   * menus, world memory, tap targets, typography — which is the class that
   * actually differs between engines and the class every one of Marc's phone
   * reports has been in.
   *
   * The board's WebGL specs are left off, and that is honesty rather than
   * thrift: Playwright's WebKit renders through a software path that is not
   * the one an iPhone uses, so a green board spec there would be a claim about
   * a renderer nobody ships.
   *
   * `stacking.spec.ts` is the one written FOR this split; the rest were
   * already engine-neutral and were simply never asked.
   *
   * ## ONE PROCESS PER ENGINE, and it is the same old GPU story
   *
   * `pnpm test:e2e` runs the two projects as two separate `playwright test`
   * invocations rather than as one. A bare `playwright test` runs them
   * back-to-back inside one process, and on that run — and only on that run —
   * a WebKit test failed with `INVALID_OPERATION: useProgram: program not
   * valid` and a shader source dump. The WebKit project ALONE is 41 green in
   * a minute; it is Chromium's ninety-six WebGL contexts, retired moments
   * earlier in the same process, that the driver has not finished releasing.
   *
   * That is the identical symptom the `workers: 1` note above records from
   * 2026-08-29 — *"shader programs failing VALIDATE_STATUS ... none of which
   * is a bug in the game, and all of which look like one"* — and it wants the
   * identical treatment: give the renderer room rather than teach the suite to
   * ignore a renderer error. Filtering the shader error was the other option
   * and it was refused outright: `watchErrors` exists to catch exactly that.
   *
   * ## THE SUBSET IS GONE: WEBKIT RUNS EVERYTHING (2026-09-10, `PASS.md` P6.1)
   *
   * The paragraph above was right that the failures were not bugs in the game
   * and wrong about the biggest one. **The labels draw.** Photographed on both
   * engines at the same seed, side by side, with the numbers on the tiles in
   * each — so "every screenshot comes back too plain to assert on" was an
   * inference from a console line that nobody had gone and looked at. The
   * refusal is real and still swallowed; what it costs is TIME, and the shots
   * were sleeping 800 ms for a first frame that takes 95 ms on Chromium and
   * 2,597 ms on WebKit. `boardDrawn` waits for the picture now.
   *
   * Re-run with the subset removed: **103 of 126 passed**, and every failure
   * was one of three named things, each now skipped where it lives with the
   * measurement on it rather than filtered out of sight in this file —
   * `board.spec.ts`'s two multi-touch tests (CDP is Chromium's protocol),
   * `offline.spec.ts` (Playwright's WebKit answers an offline navigation with
   * an internal error) and `csp.spec.ts` (its assertion is an empty console,
   * which the noise filter would empty for it).
   *
   * **A skip in the spec is a fact; a `testMatch` in the config is a silence.**
   * The old list could not say WHY `board.spec.ts` was missing, so for two days
   * the answer was "the labels do not draw", and it was not true.
   *
   * The renderer caveat stands and is worth keeping: Playwright's WebKit draws
   * through a software path that is not an iPhone's, so a green board spec here
   * is a claim about this harness. Session A is what tests the renderer.
   */
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
    {
      name: 'webkit',
      use: { browserName: 'webkit' },
    },
  ],
  /**
   * THE SERVER BUILDS FIRST (2026-09-02).
   *
   * `vite preview` serves `dist` and never builds it, so a bare
   * `npx playwright test` silently tested whatever bundle happened to be on
   * disk. That is not a hypothetical: it happened in this repository on
   * 2026-09-02, and an eighty-six-test suite came back green against code that
   * had not been compiled — which is worse than a red suite, because a red one
   * tells you something.
   *
   * `pnpm test:e2e` chained the build itself and was right; the fault was that
   * the safe way and the obvious way were different commands. They are the same
   * command now. The build is a few hundred milliseconds against a suite that
   * takes minutes, so there is no version of this worth making optional.
   *
   * `reuseExistingServer` locally means a server already up is trusted — which
   * is the one hole left, and it is the deliberate one: it is what makes
   * running a single spec fast while iterating. `CI` always builds.
   */
  webServer: {
    command:
      'pnpm --filter @ashwake/game build && pnpm --filter @ashwake/game exec vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 120_000,
  },
});
