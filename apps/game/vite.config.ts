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
/**
 * The direction a device renders when it says nothing — `DEFAULT_THEME_ID` in
 * `@theme/index`, written here rather than imported because a build config that
 * pulls in the whole theme graph to read one string is a config that fails for
 * a reason nobody expects. The assertion below is what keeps the two honest.
 */
const SHIPPING_DIRECTION = 'settlement';

/** Anything under a per-direction art folder — `/assets/<direction>/...`. */
const THEME_ART = /^\/assets\/[^/]+\//;

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
      /*
       * ONE DIRECTION'S ART, not four (2026-09-02).
       *
       * The walk swept every theme folder, so the precache carried about 1.2 MB
       * of PNGs for three directions this device will never render — downloaded
       * in the background of somebody's first minute, which is the minute the
       * stranger test measures.
       *
       * A device renders exactly one direction: `pickForScheme` gives it
       * `daylight` if it prefers light, `torchlit-bright` if it prefers
       * contrast, and the default otherwise, and only an explicit `?theme=` or
       * the picker reaches the rest. The three it does not render are cached
       * by the FETCH handler the moment anything asks for them, which is what
       * makes this a saving rather than a loss.
       *
       * The default stays IN, and that is the part worth keeping: art fetched
       * on visit one goes through an uncontrolled page and never reaches the
       * worker's cache, so without it a second visit offline would fall back to
       * the procedural floor. A supported state, and not the one to ship to the
       * largest share of devices.
       */
      const bundle = walk(out('assets'), '/assets/')
        .filter((f) => /.(js|css|png|webp|json)$/.test(f))
        .filter((f) => !THEME_ART.test(f) || f.startsWith(`/assets/${SHIPPING_DIRECTION}/`));

      // Asserted, not assumed: a renamed direction would otherwise precache
      // nothing at all and offline would quietly lose its art.
      if (!bundle.some((f) => f.startsWith(`/assets/${SHIPPING_DIRECTION}/`))) {
        throw new Error(
          `sw.js precache has no art for '${SHIPPING_DIRECTION}' — ` +
            'the default direction was renamed and this list did not follow',
        );
      }

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

/**
 * THE REACT COMPILER, ON (2026-09-02).
 *
 * It has been a constraint this codebase reasons about for months and was
 * never installed. What WAS on is `eslint-plugin-react-hooks@7`'s recommended
 * rules — `purity`, `immutability`, `refs`, `set-state-in-effect` — which are
 * the compiler's own analysis run as lint, and which `eslint.config.js` turns
 * off for `board/` with a page of argument about why the scene graph is
 * different. So every file in this app has been WRITTEN to be compilable for
 * months, under a rule that enforces it, without anything compiling it.
 *
 * What that cost is one thing, and it is the thing this pass kept running into:
 * **a toast re-rendered the 3D board.** `Game` holds seventeen `useState`s and
 * there is not one `memo()` in `screens/`, `ui/` or `board/`, so any sentence
 * the game says re-rendered every component under it — including `Board`, whose
 * children then rebuild batches, materials and pointer handlers.
 *
 * Auto-memoisation is exactly the answer to that, and it is the answer that
 * cannot go stale: a hand-placed `memo()` is a dependency list somebody has to
 * keep true, which is the same class of hazard as `useLedgers`' hand-kept
 * change-stamp two files away.
 *
 * **`board/` is compiled too, and that is deliberate.** The rules turned off
 * there are `purity` and `immutability` — a statement about `useFrame`, which
 * is not render — and the compiler only ever memoises RENDER. Where it cannot
 * prove a component safe it bails out on that component and leaves it exactly
 * as it was, which is the behaviour the board wants: no worse than today,
 * better wherever the analysis holds.
 *
 * ## What it cost, measured rather than assumed
 *
 * `react-compiler-healthcheck` compiles **70 of 70 components** — nothing opted
 * out, nothing rejected, which is what months of the lint rules bought.
 *
 * The bundle grew **40 KB raw and 16 KB gzipped** (432.4 → 448.6 KB gzipped),
 * measured by building this file with and without the plugin. That is the
 * memoisation code itself, it is real, and it is the honest price of the
 * trade: sixteen kilobytes once, against a re-render of the entire 3D board
 * every time the game says a sentence. It is also the strongest argument for
 * splitting the vendor chunk, because the app half is what a returning player
 * re-downloads and the vendor half is what they should not.
 */
export default defineConfig({
  plugins: [
    react({ babel: { plugins: [['babel-plugin-react-compiler', {}]] } }),
    versionStamp(sha),
    assetManifest(),
    serviceWorkerStamp(sha),
  ],
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
  /**
   * TWO CHUNKS, BECAUSE ONE OF THEM NEVER CHANGES (2026-09-02).
   *
   * It was a single 1.5 MB file, and `wrangler.toml` serves `/assets/*` as
   * immutable — so the caching is perfect and the invalidation is total: a
   * one-line change to a sentence gives every returning player a fresh hash on
   * the whole bundle, and they re-download three, react and troika to read it.
   * That is about 400 KB gzipped of code that has not moved since the last
   * dependency bump.
   *
   * Split on the dependency boundary rather than on a size guess. `three`,
   * `react`, `react-dom` and troika (which drei's `<Text>` pulls in) are
   * essentially all of it, and they move on a `pnpm up` — a few times a
   * quarter — while the app half moves several times a day. A returning player
   * pays for what actually changed.
   *
   * Matched on the path rather than by naming packages: a nested dependency of
   * three lives under `node_modules` too, and a list of names is a list that
   * goes stale the first time one of them grows a peer.
   *
   * It is deliberately NOT split further. Per-package chunks would mean more
   * requests on a phone's first visit — the visit that decides whether anybody
   * comes back — to save bytes on a rebuild that only happens on a version
   * bump. Two files is the whole of the win.
   */
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => (id.includes('node_modules') ? 'vendor' : undefined),
      },
    },
  },

  server: { host: true, port: 5173 },
});
