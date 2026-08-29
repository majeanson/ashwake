import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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

/**
 * Scan `public/assets/<themeId>/<slotId>.png` and write the manifest.
 *
 * The whole art workflow is meant to be "drop a PNG in the folder". A hand-kept
 * list would be a second place to forget, and probing seven slots per direction
 * from the client would mean a wall of 404s on a phone connection every load. So
 * the build looks, once, and the client fetches one small file.
 *
 * `public/assets/` not existing produces an empty manifest, not a failed build
 * — which is the state this repository shipped in until Ashwake 1's terrain
 * landed, and the state a new direction is in before anyone paints it.
 */
function assetManifest(): Plugin {
  const scan = (root: string): Record<string, string[]> => {
    const out: Record<string, string[]> = {};
    let themes: string[];
    try {
      themes = readdirSync(root);
    } catch {
      return out;
    }
    for (const themeId of themes) {
      try {
        if (!statSync(join(root, themeId)).isDirectory()) continue;
        const ids = readdirSync(join(root, themeId))
          .filter((f) => f.endsWith('.png'))
          .map((f) => f.slice(0, -'.png'.length));
        if (ids.length > 0) out[themeId] = ids.sort();
      } catch {
        // A directory that vanished between the listing and the stat. Skip it.
      }
    }
    return out;
  };

  const root = (): string => fileURLToPath(new URL('./public/assets', import.meta.url));

  return {
    name: 'ashwake:asset-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'assets/manifest.json',
        source: JSON.stringify(scan(root()), null, 2),
      });
    },
    configureServer(server) {
      server.middlewares.use('/assets/manifest.json', (_req, res) => {
        // Rescanned every request rather than cached: the point of dev is that
        // you drop a file in and reload, and a cached manifest would make the
        // one workflow this exists for require a server restart.
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(scan(root())));
      });
    },
  };
}

/**
 * Stamp the build into the service worker, and fill its precache list.
 *
 * `public/sw.js` ships verbatim, so both substitutions have to happen on the
 * way out. Getting either wrong fails SILENTLY and badly: an unstamped cache
 * name never changes, which means a phone that installs the worker never sees
 * another build; an unfilled precache list means offline only works from the
 * SECOND visit, because the worker registers after the first playable frame
 * and visit one's bundle was never cached. Both are asserted rather than
 * hoped, which is why this throws.
 *
 * `closeBundle` rather than `generateBundle`: files in `public/` are COPIED
 * to the output directory rather than passing through the bundle, so there is
 * nothing to rewrite until the copy has happened.
 */
function serviceWorkerStamp(sha: string): Plugin {
  const out = (name: string): string => fileURLToPath(new URL(`./dist/${name}`, import.meta.url));

  return {
    name: 'ashwake:sw-stamp',
    apply: 'build',
    closeBundle() {
      const file = out('sw.js');
      const source = readFileSync(file, 'utf8');

      const stamped = source.replace('__BUILD_SHA__', sha.slice(0, 12));
      if (stamped === source) {
        throw new Error('sw.js has no __BUILD_SHA__ to stamp — the cache name would never change');
      }

      // Walked recursively: the theme art lives in dist/assets/<themeId>/ and
      // a flat listing would skip it, shipping the procedural fallback to
      // exactly the players offline support exists for.
      const walk = (dir: string, prefix: string): string[] =>
        readdirSync(dir).flatMap((name) => {
          const full = join(dir, name);
          return statSync(full).isDirectory()
            ? walk(full, `${prefix}${name}/`)
            : [`${prefix}${name}`];
        });
      const bundle = walk(out('assets'), '/assets/').filter((f) =>
        /.(js|css|png|webp|json)$/.test(f),
      );

      const listed = stamped.replace(
        "'__PRECACHE_ASSETS__'",
        JSON.stringify(JSON.stringify(bundle)),
      );
      if (listed === stamped) {
        throw new Error('sw.js has no __PRECACHE_ASSETS__ to fill — offline would need two visits');
      }
      writeFileSync(file, listed);
    },
  };
}

const sha = buildSha();

export default defineConfig({
  plugins: [react(), versionStamp(sha), assetManifest(), serviceWorkerStamp(sha)],
  define: {
    // Compile-time, so it costs nothing at runtime and cannot disagree with
    // the bundle it is baked into. A backup names the build that wrote it,
    // which is what turns a bug report into one that comes with a file.
    __BUILD_SHA__: JSON.stringify(sha),
  },
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
