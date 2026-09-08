import { defineConfig } from '@playwright/test';

/**
 * The screen audit's own config (Stage 4, 2026-08-29).
 *
 * Separate from `playwright.config.ts` for two reasons. It is slow — every
 * screen, in three directions, with a screenshot each — and it is not a gate:
 * it produces pictures to look at and a table of measurements to read, not a
 * pass or a fail. Wiring that into the pipeline `verify-deploy` gates would buy
 * nothing and cost a minute a push.
 *
 * `testMatch` is what keeps the two apart with no exclusions to maintain:
 * Playwright's default only picks up `*.spec.ts` and `*.test.ts`, so an
 * `*.audit.ts` is invisible to `pnpm test:e2e` and visible only here.
 *
 * ONE worker, deliberately, for two independent reasons: every test appends to
 * a shared report array in the file, and every test boots a WebGL context on
 * one GPU.
 *
 * ## Why CI does not run this, considered and declined (2026-09-02)
 *
 * The shots HAVE gone stale once, silently, and that is a real argument for
 * automating them. Three things beat it:
 *
 *   - **It is a quarter of an hour**, 181 visits at one worker, against a
 *     pipeline that currently costs a couple of minutes. Paid on every push,
 *     for something that cannot fail.
 *   - **It would not be the same pictures.** A runner draws through software
 *     WebGL, so the board it photographs is not the board a phone does — and
 *     the whole value of this instrument is that somebody LOOKS at the output.
 *     `.github/workflows/ci.yml` already declines to diff the baked art for
 *     the neighbouring reason (`sharp` is not byte-reproducible across
 *     platforms), and says so at length.
 *   - **Staleness is now visible instead.** `report.md`'s header says how many
 *     of the expected screen-visits actually happened, so a partial run cannot
 *     pass itself off as the record — which is what actually went wrong.
 *
 * So it stays a command somebody runs, and the rule is the one every ledger in
 * this repo follows: **regenerate it in the same commit as a chrome change.**
 */
export default defineConfig({
  testDir: 'e2e/audit',
  testMatch: '**/*.audit.ts',
  timeout: 180_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4175' },
  /**
   * THE SERVER BUILDS FIRST (2026-09-08), for the reason the gate config
   * already gives at length — and this config is where that lesson had not
   * landed.
   *
   * `vite preview` serves `dist` and never builds it. `playwright.config.ts`
   * was fixed for exactly this on 2026-09-02, after an eighty-six-test suite
   * came back green against a bundle that had not been compiled; the fault
   * named there was that *the safe way and the obvious way were different
   * commands*. That fault was still live here. `pnpm audit:screens` chains
   * `pnpm build` itself and is right, but `playwright test --config
   * playwright.audit.config.ts` — the obvious way to re-shoot one screen — ran
   * against whatever happened to be on disk and produced 320 pictures of it.
   *
   * A stale bundle is worse in this instrument than in the gate. The gate at
   * least goes red; an audit cannot fail, so a stale run produces a plausible
   * report and a set of screenshots that go straight into `audit-shots/` as
   * the record of a build that was never made. Both ways in are the same
   * command now.
   */
  webServer: {
    command:
      'pnpm --filter @ashwake/game build && pnpm --filter @ashwake/game exec vite preview --port 4175 --strictPort',
    url: 'http://localhost:4175',
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 120_000,
  },
});
