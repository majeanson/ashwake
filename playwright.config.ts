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
  webServer: {
    command: 'pnpm --filter @ashwake/game exec vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 30_000,
  },
});
