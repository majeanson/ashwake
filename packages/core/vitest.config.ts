import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

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
    name: 'core',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
