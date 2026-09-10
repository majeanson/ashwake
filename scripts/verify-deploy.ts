import { execSync } from 'node:child_process';

/**
 * Post-deploy smoke check — proves the LIVE site serves the commit that was
 * just deployed, rather than proving only that CI went green.
 *
 *   pnpm verify:deploy
 *   DEPLOY_URL=https://... pnpm verify:deploy
 *
 * Carried over from Ashwake 1 (`../tiles/scripts/verify-deploy.ts`), which
 * earned every one of its guards on a real deploy. Trimmed to what this body
 * actually ships today; the two blocks it does not check yet are named at the
 * bottom so they are owed rather than forgotten.
 *
 * Three checks, in order:
 *   1. `/version.json` (emitted by the vite build) reports the expected sha,
 *      polled to ride out edge propagation.
 *   2. `/` references hashed bundles and every one of them serves 200 — this
 *      is what catches the "new index.html, missing assets" broken deploy that
 *      a plain 200 on `/` would happily call success.
 *   3. **The font.** Stage 2 learned this the hard way: troika refused a woff2,
 *      the `Text` failure took the frame with it, and the board rendered black.
 *      A font that cannot load is a board that cannot draw, so `cinzel.ttf` is
 *      verified like a bundle rather than assumed like a decoration. Ashwake 1
 *      had no equivalent because a missing font there cost a typeface, not the
 *      screen.
 *
 * The custom domain sits behind the zone's bot protection, which 403s plain
 * fetches from CI datacenter IPs. When (and only when) that happens, the same
 * checks re-run against DEPLOY_FALLBACK_URL — the workers.dev host of the SAME
 * worker, captured from the deploy log in `ci.yml`, which fronts no zone WAF.
 *
 * Exits non-zero on any mismatch, so the deploy job fails loudly.
 */

const BASE = (process.env['DEPLOY_URL'] ?? 'https://ashwake.marcportal.com').replace(/\/$/, '');
const FALLBACK = process.env['DEPLOY_FALLBACK_URL']?.replace(/\/$/, '') ?? null;

/** CI states the commit; a hand run asks git, so this is usable from a desk. */
function expectedSha(): string {
  const fromCi = process.env['GITHUB_SHA'];
  if (fromCi !== undefined && fromCi !== '') return fromCi;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

/**
 * A malformed override reads as the default, not as NaN (Ashwake 1,
 * 2026-08-21). A bare `Number(env ?? 12)` turns `VERIFY_ATTEMPTS=twelve` into
 * NaN, and `attempt <= NaN` is false — so the retry loop never runs a single
 * attempt and the check fails instantly with a message about nothing.
 */
const positive = (raw: string | undefined, fallback: number): number => {
  const n = Number(raw);
  return raw !== undefined && Number.isFinite(n) && n > 0 ? n : fallback;
};

const ATTEMPTS = positive(process.env['VERIFY_ATTEMPTS'], 12);
const DELAY_MS = positive(process.env['VERIFY_DELAY_MS'], 10_000);
const ASSET_ATTEMPTS = positive(process.env['VERIFY_ASSET_ATTEMPTS'], 5);
const ASSET_DELAY_MS = positive(process.env['VERIFY_ASSET_DELAY_MS'], 3_000);

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** The edge refused us, not the app — the Worker itself never answers 403. */
class EdgeBlockedError extends Error {}

async function get(base: string, path: string): Promise<{ status: number; body: string }> {
  const res = await fetch(`${base}${path}`, {
    cache: 'no-store',
    headers: { 'cache-control': 'no-cache' },
  });
  // A CHALLENGE, not any 403 (Ashwake 1, 2026-08-21). Treating every 403 from
  // the custom domain as "the edge is challenging us" meant a genuinely broken
  // domain — a route unbound, an Access policy switched on, the worker gone —
  // fell through to the workers.dev fallback, verified THAT, and printed
  // `ok deploy verified`. The one script whose whole job is proving the custom
  // domain works could pass while it did not. Cloudflare's own `cf-mitigated`
  // marker is the only thing trusted now; any other 403 is the site refusing
  // to serve, and fails the deploy.
  if (res.status === 403 && res.headers.has('cf-mitigated')) {
    throw new EdgeBlockedError(`GET ${path} -> 403 (edge bot challenge, not the app)`);
  }
  return { status: res.status, body: await res.text() };
}

async function waitForVersion(base: string, expected: string): Promise<void> {
  let last = '';
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const { status, body } = await get(base, `/version.json?t=${Date.now()}`);
      if (status === 200 && body.trimStart().startsWith('<')) {
        // The SPA fallback answers 200 with index.html for files that are not
        // there, so "200" alone would call a missing version.json a match.
        last = 'version.json not deployed yet (SPA fallback served)';
      } else if (status === 200) {
        const sha = (JSON.parse(body) as { sha?: string }).sha ?? '';
        if (sha === expected) {
          console.log(`ok  version.json matches deployed commit ${expected.slice(0, 7)}`);
          return;
        }
        last = `live sha ${sha.slice(0, 7) || '(none)'} != expected ${expected.slice(0, 7)}`;
      } else {
        last = `GET /version.json -> ${status}`;
      }
    } catch (err) {
      if (err instanceof EdgeBlockedError) throw err; // retrying will not unblock the edge
      last = String(err);
    }
    if (attempt < ATTEMPTS) {
      console.log(`    ${attempt}/${ATTEMPTS}: ${last} — retrying in ${DELAY_MS / 1000}s`);
      await sleep(DELAY_MS);
    }
  }
  throw new Error(`live bundle never matched after ${ATTEMPTS} attempts: ${last}`);
}

async function checkAssets(base: string): Promise<void> {
  const { status, body } = await get(base, `/?t=${Date.now()}`);
  if (status !== 200) throw new Error(`GET / -> ${status}`);

  const assets = [
    ...new Set([...body.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]!)),
  ];
  if (assets.length === 0) throw new Error('index.html references no /assets/ bundles');

  for (const path of assets) await servesAFile(base, path);
  console.log(`ok  index.html live and all ${assets.length} referenced bundles serve 200`);

  // The font is load-bearing, not decoration — see the header.
  await servesAFile(base, '/fonts/cinzel.ttf');
  console.log('ok  the board font serves 200 as a file');

  /*
   * And the CHROME's faces, which fail more quietly than the board's.
   *
   * A missing board font is a board that cannot draw. A missing DOM face is a
   * game that renders perfectly in Georgia and looks merely a bit wrong — the
   * shape of miss that survived in this body from Stage 3 until 2026-08-29,
   * because nothing anywhere would have told anyone. `ui.css` names all three
   * in `@font-face`; a 404 here means every screen is in fallback serif.
   */
  for (const face of ['cinzel.woff2', 'ebgaramond.woff2', 'ebgaramond-italic.woff2']) {
    await servesAFile(base, `/fonts/${face}`);
  }
  console.log('ok  all three chrome faces serve 200 as files');

  /*
   * The install surface (Stage 4, 2026-08-29).
   *
   * Checked rather than trusted, because every one of these fails SILENTLY.
   * A missing manifest or icon just means the install prompt never appears —
   * no error, no log line, and nobody notices until someone asks why the game
   * cannot be added to a home screen. `/sw.js` is the worst of them: served
   * as the SPA fallback it would be an HTML file registered as a script, and
   * `servesAFile` is written to catch exactly that.
   */
  for (const path of [
    '/manifest.webmanifest',
    '/sw.js',
    // A licence that 404s is not distributed with anything, which is the whole
    // reason this file exists rather than only `docs/licences` (2026-09-09).
    '/third-party.txt',
    '/icon.svg',
    '/icon-180.png',
    '/icon-192.png',
    '/icon-512.png',
    '/icon-maskable-192.png',
    '/icon-maskable-512.png',
    '/og-image.png',
  ]) {
    await servesAFile(base, path);
  }
  console.log('ok  the install surface serves: manifest, worker, icons, preview');

  /*
   * And the worker is STAMPED. The build asserts both substitutions, but the
   * build is not what a phone downloads — a stale edge copy of an older
   * worker would still be a cache name that never changes, which is a phone
   * that never sees another build. The one check that matters lives here,
   * against the file that is actually being served.
   */
  const worker = await get(base, `/sw.js?t=${Date.now()}`);
  if (worker.status !== 200) throw new Error(`GET /sw.js -> ${worker.status}`);
  if (worker.body.includes('__BUILD_SHA__') || worker.body.includes('__PRECACHE_ASSETS__')) {
    throw new Error('the live service worker is unstamped: its cache name would never change');
  }
  console.log('ok  the live service worker is stamped and its precache filled');

  // OWED: the art manifest arrives with the look in Stage 5.
}

/**
 * Assets propagate independently of `version.json` — observed on Ashwake 1's
 * first deploy, where the version matched immediately but a preloaded chunk
 * still 404'd for a few seconds. A single-shot check reports a broken deploy
 * that isn't one, so each file gets its own short retry before it counts as
 * missing.
 */
async function servesAFile(base: string, path: string): Promise<void> {
  let last = '';
  for (let attempt = 1; attempt <= ASSET_ATTEMPTS; attempt++) {
    const res = await fetch(`${base}${path}`, { method: 'HEAD', cache: 'no-store' });
    // A 200 alone proves nothing: the worker's SPA fallback answers 200 with
    // index.html for any path that has no file. None of the paths this is ever
    // pointed at are HTML, so a text/html answer means "missing", not "served".
    const type = res.headers.get('content-type') ?? '';
    if (res.status === 200 && !type.includes('text/html')) return;
    last =
      res.status === 200 ? `200 but ${type || 'no content-type'} (SPA fallback)` : `${res.status}`;
    if (attempt < ASSET_ATTEMPTS) await sleep(ASSET_DELAY_MS);
  }
  throw new Error(`HEAD ${path} -> ${last} after ${ASSET_ATTEMPTS} attempts`);
}

/**
 * The security headers actually reached the edge (2026-09-09).
 *
 * `public/_headers` is a file the platform may or may not honour, and the way
 * to find out is not to read it. Cloudflare applies it to the assets Worker;
 * a typo in a rule name, a directive the parser rejects, or a future move to a
 * different host all fail the same silent way: the file is still in the repo,
 * the header is simply not on the response.
 *
 * Checked here rather than in a unit test for the reason this whole script
 * exists: **green CI is not a deploy.** A test can prove the file says the
 * right thing; only a request can prove a browser will be told it.
 *
 * `connect-src` is singled out because it is the one directive that is a
 * PROMISE rather than hardening: "nothing leaves your phone", enforced by the
 * browser instead of asserted in prose. If that clause is ever dropped, this
 * fails and the deploy fails with it.
 */
const CSP_MUST_CARRY: readonly string[] = [
  "default-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  // The board's glyph worker is started from a blob URL by
  // `troika-three-text`; without this the labels do not draw at all.
  "worker-src 'self' blob:",
  // The promise. One consented outbound request, and nothing else.
  "connect-src 'self' https://",
  /*
   * THE INLINE HASHES (P8.4, 2026-09-10).
   *
   * `vite.config.ts`'s `contentPolicy` plugin computes these from the built
   * page and writes them into `dist/_headers`. The hash VALUE changes with
   * every build, so what is checked is that a hash is there at all: an edge
   * serving the source file rather than the generated one, or a build whose
   * plugin was dropped, would arrive here with the marks unfilled or with
   * `'unsafe-inline'` back — and the page's own floor guard would be refused,
   * which is a blank screen for exactly the oldest browsers it exists to
   * speak to.
   */
  "script-src 'self' 'sha256-",
  "style-src 'self' 'sha256-",
];

/**
 * AND WHAT IT MUST NOT SAY.
 *
 * A browser handed a hash IGNORES `'unsafe-inline'`, so the two together are
 * not belt and braces — they are a policy that reads hardened and enforces
 * nothing about inline code. `'unsafe-eval'` has never been in this policy and
 * the browser-floor guard was rewritten (2026-09-09) to stop needing it.
 */
const CSP_MUST_NOT_CARRY: readonly string[] = ["'unsafe-inline'", "'unsafe-eval'", '__INLINE_'];

const HEADERS_MUST_CARRY: readonly (readonly [string, string])[] = [
  ['x-content-type-options', 'nosniff'],
  ['x-frame-options', 'DENY'],
  ['referrer-policy', 'no-referrer'],
];

async function checkHeaders(base: string): Promise<void> {
  const res = await fetch(`${base}/`, { cache: 'no-store' });
  if (res.status === 403 && res.headers.has('cf-mitigated')) {
    throw new EdgeBlockedError('GET / -> 403 (edge bot challenge, not the app)');
  }
  const csp = res.headers.get('content-security-policy');
  if (csp === null) throw new Error('no Content-Security-Policy on the live page');
  for (const clause of CSP_MUST_CARRY) {
    if (!csp.includes(clause)) throw new Error(`CSP is missing "${clause}": ${csp}`);
  }
  for (const clause of CSP_MUST_NOT_CARRY) {
    if (csp.includes(clause)) throw new Error(`CSP still carries "${clause}": ${csp}`);
  }
  for (const [name, value] of HEADERS_MUST_CARRY) {
    const got = res.headers.get(name);
    if (got !== value) throw new Error(`${name} is ${got ?? 'absent'}, want ${value}`);
  }
  console.log('ok  security headers served');
}

async function verifyAgainst(base: string, expected: string): Promise<void> {
  console.log(`verifying ${base} serves ${expected.slice(0, 7)} ...`);
  await waitForVersion(base, expected);
  await checkAssets(base);
  await checkHeaders(base);
}

async function run(): Promise<void> {
  const expected = expectedSha();
  if (expected === '') throw new Error('no commit to verify against (GITHUB_SHA unset, no git)');
  try {
    await verifyAgainst(BASE, expected);
  } catch (err) {
    if (!(err instanceof EdgeBlockedError) || FALLBACK === null) throw err;
    console.log(`    ${err.message}`);
    console.log('    custom domain unverifiable from this runner — same worker via workers.dev:');
    await verifyAgainst(FALLBACK, expected);
  }
}

try {
  await run();
  console.log('ok  deploy verified');
} catch (err) {
  console.error(
    `FAILED: deploy verification — ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
}
