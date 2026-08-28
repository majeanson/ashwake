import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const core = (layer: string): string =>
  fileURLToPath(new URL(`../../packages/core/src/${layer}`, import.meta.url));

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
  server: { host: true, port: 5173 },
});
