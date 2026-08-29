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
 */
export default defineConfig({
  testDir: 'e2e/audit',
  testMatch: '**/*.audit.ts',
  timeout: 180_000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:4175' },
  webServer: {
    command: 'pnpm --filter @ashwake/game exec vite preview --port 4175 --strictPort',
    url: 'http://localhost:4175',
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 30_000,
  },
});
