import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import { TEST_TIMEOUT_MS } from '../../vitest.timeouts';

// The harness's own tests: the shell answers to the sim's players (2026-10-21).
// The aliases are `packages/core/vitest.config.ts`'s, because the shell imports
// the core and the core imports itself by layer name.
const alias = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const core = (layer: string) => alias(`../../packages/core/src/${layer}`);

export default defineConfig({
  resolve: {
    alias: {
      '@engine': core('engine'),
      '@content': core('content'),
      '@meta': core('meta'),
      '@render': core('render'),
      '@theme': core('theme'),
      '@view': core('view'),
      '@text': core('text'),
      '@sim': core('sim'),
    },
  },
  test: {
    // The cap has to be set HERE to be set at all — see `vitest.timeouts.ts`.
    testTimeout: TEST_TIMEOUT_MS,
    name: 'stranger',
    environment: 'node',
    include: ['*.test.ts'],
  },
});
