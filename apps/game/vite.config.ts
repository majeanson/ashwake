import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const core = (layer: string): string =>
  fileURLToPath(new URL(`../../packages/core/src/${layer}`, import.meta.url));

/** The commit this bundle was built from. CI states it; a hand build asks git. */
function buildSha(): string {
  if (process.env['GITHUB_SHA'] !== undefined && process.env['GITHUB_SHA'] !== '') {
    return process.env['GITHUB_SHA'];
  }
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * Emit `/version.json` beside the bundle (Stage 2b, 2026-08-28 — carried over
 * from Ashwake 1).
 *
 * Green CI is not a deploy. This file is the only thing that lets
 * `scripts/verify-deploy.ts` prove the LIVE site is serving the commit that
 * was just pushed, rather than a cached edge copy of the one before it.
 */
function versionStamp(sha: string): Plugin {
  return {
    name: 'ashwake:version-stamp',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ sha, builtAt: new Date().toISOString() }, null, 2),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), versionStamp(buildSha())],
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
