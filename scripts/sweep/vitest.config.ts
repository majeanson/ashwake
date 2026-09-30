import { defineConfig } from 'vitest/config';
import { TEST_TIMEOUT_MS } from '../../vitest.timeouts';

// The sweep's own tests: the instrument answers to fixtures (2026-09-30).
export default defineConfig({
  test: {
    // The cap has to be set HERE to be set at all — see `vitest.timeouts.ts`.
    testTimeout: TEST_TIMEOUT_MS,
    name: 'sweep',
    environment: 'node',
    include: ['*.test.ts'],
  },
});
