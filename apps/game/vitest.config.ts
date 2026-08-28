import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const core = (layer: string): string =>
  fileURLToPath(new URL(`../../packages/core/src/${layer}`, import.meta.url));

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
    name: 'game',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
