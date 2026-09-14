import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
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
    /*
     * THE ART IS CONTENT-ADDRESSED, AND IT WAS NOT (2026-09-14, Marc's ruling).
     *
     * `public/_headers` serves `/assets/**` as
     * `cache-control: public, max-age=31536000, immutable` — a year, and
     * `immutable` tells the browser not to revalidate even on a reload. That is
     * correct for every other asset in this build because their names carry a
     * content hash. **The art's did not.** `terrain.green.png` was the same URL
     * in every build ever shipped, so a redrawn PNG would never reach a device
     * that had already visited, for up to a year, and no reload would fix it.
     * Measured on the live site rather than read off the config.
     *
     * The whole premise of this pipeline is *"drop a PNG in the folder and
     * rebuild"* (see `theme/assets.ts`), and in production that premise was
     * false. Marc: hash the filenames.
     *
     * **In `closeBundle`, and that is the whole subtlety.** These files are
     * copied verbatim out of `publicDir` by Vite, so there is nothing on disk
     * to hash until the copy has happened — the same reason `serviceWorkerStamp`
     * below rewrites rather than emits. Renaming here also means the precache
     * walk in that plugin picks the hashed names up by itself, because it walks
     * `dist`; plugin `closeBundle` hooks run in array order and this one is
     * registered first, which is now load-bearing and says so at the array.
     *
     * The dev server is deliberately untouched: it serves `public/` directly,
     * where the files keep their plain names, and `configureServer` below still
     * answers with those. A hash in dev would buy nothing and break the one
     * workflow this plugin exists for.
     */
    closeBundle() {
      const dist = fileURLToPath(new URL('./dist/assets', import.meta.url));
      const manifest: Record<string, Record<string, string>> = {};

      let themes: string[];
      try {
        themes = readdirSync(dist);
      } catch {
        themes = [];
      }
      for (const themeId of themes) {
        const dir = join(dist, themeId);
        try {
          if (!statSync(dir).isDirectory()) continue;
        } catch {
          continue;
        }
        for (const file of readdirSync(dir).filter((f) => f.endsWith('.png'))) {
          const id = file.slice(0, -'.png'.length);
          // Eight hex characters of the CONTENT, which is what makes the
          // year-long `immutable` an honest promise rather than a trap: the
          // bytes changing changes the URL, and nothing else can.
          const hash = createHash('sha256')
            .update(readFileSync(join(dir, file)))
            .digest('hex')
            .slice(0, 8);
          const hashed = `${id}.${hash}.png`;
          renameSync(join(dir, file), join(dir, hashed));
          (manifest[themeId] ??= {})[id] = `/assets/${themeId}/${hashed}`;
        }
      }

      writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
    },
    configureServer(server) {
      server.middlewares.use('/assets/manifest.json', (_req, res) => {
        // Rescanned every request rather than cached: the point of dev is that
        // you drop a file in and reload, and a cached manifest would make the
        // one workflow this exists for require a server restart.
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        // Slot -> PATH, the same shape the build writes. Unhashed here on
        // purpose: dev serves `public/` directly, where the files keep the
        // names you dropped them under, and `no-store` above already makes
        // every reload honest.
        const out: Record<string, Record<string, string>> = {};
        for (const [themeId, ids] of Object.entries(scan(root()))) {
          out[themeId] = Object.fromEntries(ids.map((id) => [id, `/assets/${themeId}/${id}.png`]));
        }
        res.end(JSON.stringify(out));
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

/**
 * The renderer's packages, for the chunking rule at the bottom of this file.
 *
 * Anchored at `^`, and fed the path AFTER the last `node_modules/` — which is
 * the whole subtlety and it cost a wrong build to find. pnpm's store puts a
 * package's peers inside a directory named for every one of them, so
 * react-dom's real path under fiber is
 * `.pnpm/@react-three+fiber@9.5.0_..._three@0.183.2/node_modules/react-dom/`.
 * An unanchored `three` matches that directory name twice over, so the first
 * version of this rule quietly moved REACT into the renderer's chunk — which
 * is exactly why the entry chunk still had a static import of it and Vite
 * still preloaded the megabyte. The bug looked like "the lazy boundary does
 * not work"; it was a regex reading a lockfile's filename.
 */
const RENDERER = /^(three|@react-three\/|troika|bidi-js|webgl-sdf-generator)/;

/** The package a module belongs to: everything after the LAST `node_modules/`,
 *  which is the real package path rather than pnpm's peer-stamped directory. */
function packagePath(id: string): string | null {
  const path = id.replace(/\\/g, '/');
  const at = path.lastIndexOf('node_modules/');
  return at === -1 ? null : path.slice(at + 'node_modules/'.length);
}

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
       * ONE DIRECTION'S ART, not four (2026-09-02; two directions ship at all
       * since D12, 2026-09-03 — see `theme/index.ts`).
       *
       * The walk swept every theme folder, so the precache carried PNGs for
       * directions this device will never render — downloaded in the
       * background of somebody's first minute, which is the minute the
       * stranger test measures.
       *
       * A device renders exactly one direction: `pickForScheme` gives it
       * `daylight` if it prefers light or more contrast, and the default
       * otherwise, and only an explicit `?theme=` or the picker reaches the
       * other one. What it does not render is cached by the FETCH handler the
       * moment anything asks for it, which is what makes this a saving rather
       * than a loss.
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
      const shipped = bundle.filter((f) => f.startsWith(`/assets/${SHIPPING_DIRECTION}/`));
      if (shipped.length === 0) {
        throw new Error(
          `sw.js precache has no art for '${SHIPPING_DIRECTION}' — ` +
            'the default direction was renamed and this list did not follow',
        );
      }
      /*
       * AND IT HAS TO BE THE HASHED NAME (2026-09-14).
       *
       * `assetManifest` renames the art before this runs, and the manifest the
       * client reads names the hashed file. If this walk ever saw the plain
       * name it would mean the rename had not happened — the plugins reordered,
       * or that hook throwing somewhere this one cannot see — and the precache
       * would hold files the page never asks for while the files it DOES ask
       * for are absent. Offline art, silently gone, from a green build.
       */
      const plain = shipped.filter((f) => !/\.[0-9a-f]{8}\.png$/.test(f));
      if (plain.length > 0) {
        throw new Error(
          `sw.js precache carries unhashed art (${plain[0] ?? ''}) — ` +
            'assetManifest did not rename it, so the page will ask for a file this list does not hold',
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

/**
 * THE POLICY'S INLINE HASHES, COMPUTED FROM THE PAGE THAT SHIPS
 * (`PASS.md` P8.4, 2026-09-10).
 *
 * `public/_headers` carried `'unsafe-inline'` in `script-src` and `style-src`
 * and CONFESSED to it in a comment: the page runs one inline classic script
 * (the browser-floor guard, which must parse on engines the module bundle
 * cannot) and one inline `<style>` (the pre-JS paint), both static, both
 * hashable — *"which is a build step this repository does not have yet"*. This
 * is that build step.
 *
 * `'unsafe-inline'` is the directive worth the work, because it is the one that
 * makes the rest of the policy decorative: with it, ANY inline `<script>` that
 * reaches this document runs, which is the entire mechanism of the injection
 * class `script-src` exists to stop. A hash permits exactly the block whose
 * bytes are in the build and nothing else — and a browser given a hash IGNORES
 * `'unsafe-inline'`, so leaving it beside them would have been a policy that
 * reads hardened and enforces nothing.
 *
 * **Hashed from `dist/index.html`, not from the source page**, which is not a
 * detail: Vite folds this page's inline `<script type="module">` — the syntax
 * probe — into the entry chunk, so the built document has ONE inline script
 * where the source has two. Hashing what the repository writes would have
 * shipped a policy for a block the edge never serves, and refused the one it
 * does. The blocks are found by shape rather than counted, so a future Vite
 * that stops folding is handled without an edit here.
 *
 * Newlines are normalised because the browser normalises them: HTML character
 * data has its CRLF collapsed during parsing, so a checkout with Windows line
 * endings would otherwise hash bytes no engine ever sees and refuse the page's
 * own guard.
 *
 * Every step throws rather than warns. A policy is a file that can be wrong in
 * a way nothing notices — `vite preview` serves no `_headers` at all, so a
 * wrong one is invisible until it is live. `e2e/csp.spec.ts` runs the game
 * under the generated policy and asserts an injected inline script does NOT
 * run; `scripts/verify-deploy.ts` proves the edge puts the header on the
 * response.
 */
function contentPolicy(): Plugin {
  const out = (name: string): string => fileURLToPath(new URL(`./dist/${name}`, import.meta.url));

  /**
   * `'sha256-…'` for every inline block one pattern finds, in document order.
   *
   * **HTML comments are cut first, and that is not tidiness** (found by the
   * generated hash disagreeing with a hand-computed one, 2026-09-10). This
   * page's comments describe the page: they quote `<style>` and
   * `<script type="module">` in prose, and a lazy match that starts at a
   * quoted opening tag runs on to the next REAL closing tag — hashing a span
   * of documentation plus the block, and refusing the block the page ships.
   * A policy wrong in exactly that way is invisible until it is live, since
   * `vite preview` serves no `_headers`.
   */
  const hashesOf = (html: string, blocks: RegExp): string[] =>
    [...html.replace(/<!--[\s\S]*?-->/g, '').matchAll(blocks)]
      // A script with a `src` is an external file, governed by the origin part
      // of the directive; only a block with a body of its own has a hash.
      .filter(([, attrs]) => !/\ssrc\s*=/i.test(attrs ?? ''))
      .map(([, , body]) => {
        const text = (body ?? '').replace(/\r\n/g, '\n');
        return `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
      });

  return {
    name: 'ashwake:content-policy',
    apply: 'build',
    // `closeBundle`, for `sw-stamp`'s reason: `_headers` is COPIED out of
    // `public/` rather than passing through the bundle, so there is nothing to
    // rewrite until the copy has happened — and `index.html`, which is what
    // gets hashed, is written by then too.
    closeBundle() {
      const html = readFileSync(out('index.html'), 'utf8');
      const file = out('_headers');
      const source = readFileSync(file, 'utf8');

      let filled = source;
      for (const [tag, mark, blocks] of [
        ['script', '__INLINE_SCRIPT_HASHES__', /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi],
        ['style', '__INLINE_STYLE_HASHES__', /<style(\s[^>]*)?>([\s\S]*?)<\/style>/gi],
      ] as const) {
        const hashes = hashesOf(html, blocks);
        if (hashes.length === 0) {
          throw new Error(
            `_headers: no inline <${tag}> in the built page to hash — ` +
              `the policy would have named none and forbidden whatever ships`,
          );
        }
        if (!filled.includes(mark)) {
          throw new Error(`_headers has no ${mark} to fill — ${tag}-src would forbid its own page`);
        }
        filled = filled.replaceAll(mark, hashes.join(' '));
      }

      /*
       * The weakness this whole plugin exists to remove, asserted at the one
       * moment it is provably gone: a hash beside `'unsafe-inline'` is a policy
       * that reads hardened and permits everything.
       *
       * The POLICY LINES only, not the file — the comment above them describes
       * what was removed, in those words, and the first version of this check
       * failed the build over its own explanation.
       */
      const directives = filled
        .split('\n')
        .filter((line) => line.trim().startsWith('Content-Security-Policy:'))
        .join('\n');
      if (directives === '') throw new Error('_headers has no Content-Security-Policy to fill');
      if (directives.includes("'unsafe-inline'") || directives.includes("'unsafe-eval'")) {
        throw new Error(
          "_headers still carries 'unsafe-inline' or 'unsafe-eval' — " +
            'a hash beside either one is ignored by the browser',
        );
      }
      writeFileSync(file, filled);
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
    /*
     * ORDER IS LOAD-BEARING HERE (2026-09-14), and only between these two.
     *
     * `assetManifest` renames the art in `dist` to carry a content hash;
     * `serviceWorkerStamp` walks `dist` to build the precache list. Vite runs
     * `closeBundle` hooks in array order, so the walk sees the hashed names.
     * Swap them and the precache would name files that no longer exist — every
     * offline board down to the procedural floor, from a green build.
     *
     * The assertion inside `serviceWorkerStamp` is what makes that a failed
     * build rather than a silent one: it requires the precache to carry art
     * for the shipping direction, and an unhashed name can no longer satisfy
     * it.
     */
    assetManifest(),
    serviceWorkerStamp(sha),
    contentPolicy(),
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
   * It is deliberately NOT split by PACKAGE. Per-package chunks would mean
   * more requests on a phone's first visit — the visit that decides whether
   * anybody comes back — to save bytes on a rebuild that only happens on a
   * version bump.
   *
   * ## AND SPLIT AGAIN ON WHAT THE FRONT DOOR NEEDS (2026-09-08)
   *
   * The two-chunk split above is about a RETURNING player, and it is still
   * right about them. It did nothing for the first visit, where all 333KB
   * gzipped arrived and was parsed before the door drew a pixel — and roughly
   * 260KB of that is three, `@react-three/fiber`, drei and troika, which the
   * door, the manual, settings and the hall of fame do not use at all.
   *
   * `App` imports `Board` through `lazy()` now, so the renderer is reachable
   * only across a dynamic boundary. The rule below is what lets that boundary
   * survive bundling: a blanket `node_modules -> 'vendor'` would have hauled
   * three back into the chunk react is in, and the lazy import would have been
   * a lazy import of something already downloaded.
   *
   * The renderer's packages are NAMED and then deliberately left UNASSIGNED,
   * which is the opposite of what it looks like. **The list says "do not
   * staple these to the door", not "put these together"**, and the difference
   * is the whole of what makes the lazy boundary real.
   *
   * Giving them a chunk of their own was tried, twice, and it does not work.
   * `@react-three/fiber` depends on `react-reconciler`, which the bundler will
   * place in whichever chunk it is assigned to — and the entry chunk then
   * carries a static `import {...} from "./three-*.js"`, so Vite emits a
   * `modulepreload` for the megabyte and the browser fetches and compiles it
   * before the door draws. A lazy import of a file the browser has already
   * been told to go and get is not a lazy import. No preload-filtering hook
   * helps, because the static edge is real and would be honoured anyway.
   *
   * `undefined` hands the decision to the only thing that can get it right,
   * which is REACHABILITY: three is reachable from `Board` and from nothing
   * else, so it follows `Board`'s dynamic boundary without being told to.
   *
   * **The cost, stated plainly:** three now rides in the `Board` chunk, so a
   * change to board code re-downloads the renderer for a returning player —
   * 289KB gzipped instead of 18KB. That is a real loss and it is the right way
   * round. The first visit is the one the stranger test measures and the one
   * that decides whether there is a second; a returning player has the whole
   * thing in a service-worker cache and pays this only on a deploy that
   * touched `board/`.
   *
   * A name going stale fails SAFE — a renderer package this misses joins
   * `vendor` and costs first-load bytes rather than breaking anything — and it
   * shows up immediately as the entry chunk's byte count jumping on the next
   * build. `troika` and `webgl-sdf-generator` are drei's `<Text>`; `bidi-js`
   * is troika's.
   */
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id: string) => {
          const pkg = packagePath(id);
          if (pkg === null) return undefined;
          // UNASSIGNED, not "grouped" — see the argument above. Naming a
          // `three` chunk puts a static edge from the entry to it, and a
          // `modulepreload` for the megabyte follows.
          return RENDERER.test(pkg) ? undefined : 'vendor';
        },
      },
    },
  },

  server: { host: true, port: 5173 },
});
