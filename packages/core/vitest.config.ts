import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import { TEST_TIMEOUT_MS } from '../../vitest.timeouts';

const alias = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@engine': alias('./src/engine'),
      '@content': alias('./src/content'),
      '@meta': alias('./src/meta'),
      '@render': alias('./src/render'),
      '@theme': alias('./src/theme'),
      '@view': alias('./src/view'),
      '@text': alias('./src/text'),
      '@sim': alias('./src/sim'),
    },
  },
  test: {
    // The cap has to be set HERE to be set at all — see `vitest.timeouts.ts`.
    testTimeout: TEST_TIMEOUT_MS,
    name: 'core',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
