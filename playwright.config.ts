import { defineConfig } from '@playwright/test';

/**
 * Serves `apps/game/dist` via vite preview: the same bundle the deploy ships,
 * not the dev server's un-minified shadow of it. **Build first, or a green run
 * proves nothing** — Ashwake 1 learned that on 2026-08-26.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  retries: process.env['CI'] === undefined ? 0 : 1,
  use: { baseURL: 'http://localhost:4174' },
  webServer: {
    command: 'pnpm --filter @ashwake/game exec vite preview --port 4174 --strictPort',
    url: 'http://localhost:4174',
    reuseExistingServer: process.env['CI'] === undefined,
    timeout: 30_000,
  },
});
