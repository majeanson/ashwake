import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

const core = (layer: string): string =>
  fileURLToPath(new URL(`../../packages/core/src/${layer}`, import.meta.url));

/**
 * One environment for the app, and it is jsdom.
 *
 * The board's arithmetic — the camera, the relief, the leap, the instanced
 * field — is pure and would be happy in `node`; the chrome needs a DOM. Two
 * environments in one package means either nested projects (which the root
 * runner does not thread through) or a docblock on every component test, and
 * both are ceremony to save about a second of startup once. jsdom for
 * everything: three's raycasting is arithmetic either way, and `packages/core`
 * — the half that must never touch the DOM — is a different project entirely
 * and is where that rule is actually enforced.
 */
export default defineConfig({
  plugins: [react()],
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
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/ui/setupTests.ts'],
  },
});
