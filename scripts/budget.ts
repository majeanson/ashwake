import { brotliCompressSync, gzipSync } from 'node:zlib';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * WHAT A PHONE DOWNLOADS, AND A BAR IT MAY NOT PASS (`PASS.md` P9).
 *
 * `IMPROVEMENTS.md` Batch 8 measured this **once, in prose** — app 114.9 KB
 * gzipped, vendor 333.1 KB, the precache 2.7 MB → 1.8 MB — and nothing
 * re-measured any of it. B8's own chunking ruling ends by saying the cost of
 * `three` riding in the door's chunk *"shows up immediately as the entry
 * chunk's byte count jumping on the next build"*, which requires a watcher,
 * and there was none. This is the watcher.
 *
 * **This one is a GATE, unlike the sweep's first report or the performance
 * trace, and the difference is defensible**: a byte count is exact,
 * reproducible on any machine, and does not depend on a renderer. That is
 * precisely what B8.6 said the screen audit was NOT, which is why that one
 * stayed a report.
 *
 * The shape is the one this repository already trusts three times over —
 * `pnpm sim` against a golden file, the palette against a contrast budget, the
 * baked art against the theme's own ladder. **A number that may not move
 * without a reason in the same commit.**
 *
 * ## The bars are about MOMENTS, not about files
 *
 * A per-chunk list would go stale the first time the bundler renamed
 * something, and it would not say what matters. What matters is what a phone
 * pays at each of three moments:
 *
 *   - **the first paint** — everything the front door parses before it draws.
 *     This is the number the stranger test is about, and the one B8's split was
 *     bought to move.
 *   - **the renderer** — the board's own chunk, fetched while the door is being
 *     read. It is allowed to be large; it is not allowed to be in the first
 *     paint.
 *   - **the offline install** — what the service worker precaches, which is
 *     what a returning player's storage pays.
 *
 * ## And one bar that is not a number (P9.4)
 *
 * The renderer staying out of the first paint is a fact about the import
 * GRAPH, and a byte count only notices it after it has already happened. So
 * the entry chunk is also searched for the renderer's own FINGERPRINTS — the
 * warning prefixes three, `@react-three/fiber` and troika write into their own
 * code, which survive bundling and minification where an import specifier does
 * not. `RENDERER_MARKERS` carries the two drafts that were wrong first, and
 * why drei has no marker.
 *
 * **A fingerprint is caught on the build that introduces it; a byte count is
 * caught by whoever reads the diff.**
 */

const ROOT = join(import.meta.dirname, '..');
const DIST = join(ROOT, 'apps/game/dist');

const gz = (b: Buffer): number => gzipSync(b, { level: 9 }).byteLength;
const br = (b: Buffer): number => brotliCompressSync(b).byteLength;

/** Every file under a directory, as paths relative to `dist`. */
function filesUnder(dir: string): readonly string[] {
  const out: string[] = [];
  const walk = (at: string): void => {
    for (const entry of readdirSync(join(DIST, at), { withFileTypes: true })) {
      const rel = at === '' ? entry.name : `${at}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else out.push(rel);
    }
  };
  walk(dir);
  return out;
}

const bytes = (rel: string): Buffer => readFileSync(join(DIST, rel));

/** One measured moment: what it is made of, and what it weighs. */
type Bar = {
  readonly of: readonly string[];
  readonly raw: number;
  readonly gzip: number;
  readonly brotli: number;
};

function weigh(files: readonly string[]): Bar {
  let raw = 0;
  let gzip = 0;
  let brotli = 0;
  for (const f of files) {
    const b = bytes(f);
    raw += b.byteLength;
    gzip += gz(b);
    brotli += br(b);
  }
  // Sorted so the report is stable across a bundler's directory order.
  return { of: [...files].sort(), raw, gzip, brotli };
}

/**
 * WHICH FILES THE FIRST PAINT PAYS FOR, read out of `index.html`.
 *
 * The document is the authority rather than a filename pattern: whatever it
 * loads with a `<script>` or a stylesheet `<link>` — plus anything those
 * statically import, which the bundler has already hoisted into modulepreload
 * links — is exactly what a phone parses before the door draws. A pattern like
 * `index-*.js` would miss the runtime chunk and would silently start passing
 * the day a chunk was renamed.
 */
function firstPaintFiles(): readonly string[] {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  const found = new Set<string>();
  for (const m of html.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g)) {
    const name = m[1];
    if (name !== undefined && /\.(js|css)$/.test(name)) found.add(`assets/${name}`);
  }
  return [...found];
}

/** The renderer's chunk: reachable only across the `lazy()` boundary. */
const rendererFiles = (paint: readonly string[]): readonly string[] =>
  filesUnder('assets').filter((f) => /\.js$/.test(f) && !paint.includes(f));

/**
 * What the service worker precaches — the document's own list, plus the
 * assets the build stamps in.
 *
 * Read off the BUILT worker rather than the source, because
 * `__PRECACHE_ASSETS__` is substituted at build time and the source's
 * placeholder measures nothing.
 */
function precacheFiles(): readonly string[] {
  const sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
  const urls = new Set<string>();
  /*
   * BOTH QUOTE STYLES, because the built worker is not the source worker: the
   * hand-written list keeps its single quotes and the stamped array arrives
   * double-quoted out of `JSON.stringify`.
   *
   * The first draft of this looked for single quotes only, and measured
   * **twelve files where the worker precaches twenty-seven** — the icons and
   * the fonts, and none of the art or the bundle. A parser that silently finds
   * a subset reports a budget that can only ever pass, which is worse than no
   * budget: it would have said 158 KB where B8 measured 1.8 MB and nobody
   * would have looked again.
   */
  /*
   * The stamped array FIRST, and then the hand-written list out of what is
   * left. Order matters: the stamped literal is escaped JSON, so a quote scan
   * run over it comes back with `assets/index-abc.js\` — every path carrying
   * the backslash that preceded its closing quote — and then every one of them
   * looks like a file the build did not make. Removing the literal before
   * scanning is what keeps one list from being read two ways.
   */
  const stamped = /JSON\.parse\("((?:[^"\\]|\\.)*)"\)/.exec(sw);
  if (stamped?.[1] === undefined) {
    throw new Error('budget: the worker has no stamped asset list — did the build substitute it?');
  }
  // Twice, because the array is JSON inside a JSON string: the inner parse
  // unescapes the literal and the outer one reads the list.
  const unescaped = JSON.parse(`"${stamped[1]}"`) as string;
  for (const url of JSON.parse(unescaped) as readonly string[]) {
    urls.add(url.replace(/^\//, ''));
  }
  for (const m of sw.replace(stamped[0], '').matchAll(/['"](\/[^'"]*)['"]/g)) {
    const url = m[1];
    if (url === undefined || url === '/' || url.endsWith('/index.html')) continue;
    urls.add(url.replace(/^\//, ''));
  }
  const have = new Set(filesUnder(''));
  // A precached URL the build does not produce is the white screen this
  // worker exists to prevent, so it is reported rather than skipped.
  const missing = [...urls].filter((u) => !have.has(u) && !u.endsWith('.webmanifest'));
  if (missing.length > 0) {
    console.error(
      `budget: the worker precaches files the build does not make: ${missing.join(', ')}`,
    );
    process.exitCode = 1;
  }
  return [...urls].filter((u) => have.has(u));
}

/**
 * THE RENDERER'S OWN FINGERPRINTS, and not its import specifiers (P9.4).
 *
 * Two drafts were wrong before this one, and both are worth keeping:
 *
 *  1. **The bare package names.** `three` is an English WORD, and half of what
 *     this app ships is prose: the entry chunk contains "one of three this
 *     dev", "the other three by VALUE", "9-slice, three states". It fired on
 *     the first run against a boundary that was perfectly intact — **a false
 *     alarm on a gate is how a gate gets switched off.**
 *  2. **The import specifiers** (`from"three"`, `node_modules/three/`). Those
 *     are what a SOURCE file says, and this reads a BUNDLE: rolldown inlines
 *     the module and the specifier is gone. Verified by leaking `Vector3` into
 *     `App` on purpose — the byte bar jumped 92 KB and this check stayed
 *     silent, which is exactly the hole P9.4 exists to close.
 *
 * What survives bundling and minification is a library's own STRINGS, because
 * a minifier renames identifiers and cannot touch a message. Each marker below
 * is a prefix its package writes into its own warnings, verified present in
 * the `Board` chunk where these packages legitimately live.
 *
 * **drei has no marker and is deliberately not listed.** It ships almost no
 * strings of its own — it is largely re-exports — so there is nothing stable
 * to look for. That is acceptable rather than a gap: drei cannot arrive
 * without `@react-three/fiber`, which is checked, and its own weight is
 * trivial beside three's. Saying so here is better than inventing a marker
 * that would rot.
 */
const RENDERER_MARKERS: readonly { readonly name: string; readonly marker: string }[] = [
  // three's warning prefix — `console.warn('THREE.Foo: ...')`, throughout.
  { name: 'three', marker: 'THREE.' },
  // `@react-three/fiber`'s own error prefix.
  { name: '@react-three/fiber', marker: 'R3F:' },
  // troika names itself in its worker source and its font parser.
  { name: 'troika', marker: 'troika' },
];

function rendererInEntry(paint: readonly string[]): readonly string[] {
  const text = paint
    .filter((f) => f.endsWith('.js'))
    .map((f) => bytes(f).toString('utf8'))
    .join('\n');
  return RENDERER_MARKERS.filter(({ marker }) => text.includes(marker)).map(({ name }) => name);
}

function main(): void {
  const paint = firstPaintFiles();
  if (paint.length === 0)
    throw new Error('budget: index.html loaded no assets — did the build run?');

  const bars = {
    firstPaint: weigh(paint),
    renderer: weigh(rendererFiles(paint)),
    fonts: weigh(filesUnder('fonts')),
    precache: weigh(precacheFiles()),
  };

  const kb = (n: number): string => `${(n / 1024).toFixed(1)} KB`;
  /*
   * `budget.json` carries an argument beside every number — `$why` at the top
   * and inside each bar — so the file a reader opens says what the bar is FOR
   * rather than only what it is. Which means the shape is not uniform, so it
   * is read as `unknown` and narrowed once, here, instead of asserted into a
   * type it does not have.
   */
  const raw = JSON.parse(readFileSync(join(ROOT, 'budget.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  const barFor = (name: string): { readonly raw?: number; readonly gzip?: number } | null => {
    const at = raw[name];
    if (at === null || typeof at !== 'object' || Array.isArray(at)) return null;
    const { raw: r, gzip: g } = at as Record<string, unknown>;
    return {
      ...(typeof r === 'number' ? { raw: r } : {}),
      ...(typeof g === 'number' ? { gzip: g } : {}),
    };
  };

  let failed = false;
  for (const [name, bar] of Object.entries(bars)) {
    console.log(
      `${name.padEnd(11)} ${kb(bar.gzip).padStart(9)} gzip  ${kb(bar.brotli).padStart(9)} br  ` +
        `${kb(bar.raw).padStart(9)} raw  (${String(bar.of.length)} files)`,
    );
    const limit = barFor(name);
    if (limit === null || (limit.raw === undefined && limit.gzip === undefined)) {
      console.error(`budget: ${name} has no bar in budget.json — add one, with its argument`);
      failed = true;
      continue;
    }
    /*
     * Each bar names the MEASURE it is in, because the honest one differs by
     * kind: gzip for JS and CSS, raw for fonts (woff2 is already compressed)
     * and raw for the precache (storage pays raw). `budget.json` says which,
     * so this does not have to guess and cannot quietly compare the wrong two
     * numbers.
     */
    for (const of of ['raw', 'gzip'] as const) {
      const cap = limit[of];
      if (cap === undefined) continue;
      if (bar[of] > cap) {
        console.error(
          `budget: ${name} is ${kb(bar[of])} ${of}, over its bar of ${kb(cap)} ` +
            `by ${kb(bar[of] - cap)}. Move the bar in budget.json AND say why in LOG.md, ` +
            `or put the bytes back.`,
        );
        failed = true;
      }
    }
  }

  /*
   * P9.4 — the renderer's absence from the first paint, by NAME.
   */
  const leaked = rendererInEntry(paint);
  if (leaked.length > 0) {
    console.error(
      `budget: the renderer is in the first paint (${leaked.join(', ')}). ` +
        `\`App\` must reach \`Board\` only through \`lazy()\`, and ` +
        `\`vite.config.ts\`'s chunking must leave its packages unassigned.`,
    );
    failed = true;
  }

  /*
   * P9.5 — the two preloaded faces, which B8.2 went and fixed and nothing
   * watched. A preload the page does not use is a wasted round trip on the
   * first visit; a missing one is the FOUT.
   */
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  for (const face of ['/fonts/cinzel.woff2', '/fonts/ebgaramond.woff2']) {
    if (!new RegExp(`rel="preload"[^>]*href="${face}"`).test(html)) {
      console.error(`budget: ${face} is not preloaded — see index.html, and B8.2's FOUT fix`);
      failed = true;
    }
  }
  // And the pre-JS paint, which is what a phone shows between the first byte
  // and the first render. Inline by necessity: a stylesheet for it would be a
  // second round trip before anything is on screen.
  if (!/<style>/.test(html)) {
    console.error('budget: index.html has no inline style — the pre-JS paint is gone');
    failed = true;
  }

  if (failed) process.exitCode = 1;
}

main();
