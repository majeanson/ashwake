import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import sharp from 'sharp';
import { ASSET_SLOTS } from '../packages/core/src/theme/assets';
import type { AssetId } from '../packages/core/src/theme/tokens';
import { DAYLIGHT } from '../packages/core/src/theme/themes/daylight';
import { SETTLEMENT } from '../packages/core/src/theme/themes/settlement';
import type { Theme } from '../packages/core/src/theme/tokens';
import { measuredLumaOf, readLadder, TERRAINS, tokenLuma } from './ladder';

/**
 * THE COMMITTED ART IS CURRENT — the check `.github/workflows/ci.yml` has owed
 * since 2026-08-29.
 *
 * CI runs `pnpm bake` and grades the FRESH bake. That proves the pipeline
 * works and that a new bake would pass the greyscale guardrail; it proves
 * nothing at all about the PNGs actually in the repository, because the bake
 * overwrites them and the runner then throws the result away. The reason it
 * throws it away is good — `sharp` does not rasterise SVG byte-identically
 * across platforms, so a Linux runner can never diff its bake against a
 * Windows one — but the consequence was a real hole with a real casualty:
 * Ashwake 1 darkened daylight's terrain ladder, never re-baked, and shipped
 * art rendering the old one for months.
 *
 * This is the portable closure. Nothing here rasterises an SVG. It reads the
 * committed bytes, reads the committed record beside them, and reads the live
 * theme, and it asks three questions:
 *
 *   1. **Did the THEME move without a re-bake?** `ladder.json`'s `token`
 *      column is pure arithmetic over `theme/tokens.ts` — no rasteriser — so
 *      it compares exactly against the live theme on any machine. This is the
 *      Ashwake 1 failure, and it is the whole reason the file exists.
 *
 *   2. **Did the ART move without a re-bake?** Re-measure each committed PNG
 *      and compare to the `measured` column. Decoding a PNG is deterministic
 *      where rasterising an SVG is not, so this is a tight comparison rather
 *      than a fuzzy one.
 *
 *   3. **Is every advertised PNG the shape its slot declares?** A slot's
 *      `size` in `theme/assets.ts` against the file's real dimensions. The
 *      build's own manifest scans this directory and tells the client what is
 *      there; a truncated or wrongly-sized file is one the client would fetch
 *      and stretch.
 *
 * Run by `pnpm artcheck`, and by CI BEFORE `pnpm bake` — the order matters,
 * because bake overwrites the very files this grades.
 */

/** The directions `scripts/terrain.ts` bakes. Kept in step with it by hand,
 *  and the mismatch check below is what makes that safe. */
const THEMES: readonly Theme[] = [DAYLIGHT, SETTLEMENT];

/**
 * How far a re-measured PNG may sit from its own record.
 *
 * This is not a rasterisation tolerance — no SVG is drawn here — it is the
 * float-arithmetic slack between two runs of the same mean over the same
 * bytes, plus whatever a libvips version bump might do to that mean. A real
 * staleness is orders of magnitude larger than this: the smallest gap between
 * two adjacent rungs in either direction today is 0.05, so a tolerance three
 * hundred times smaller cannot let one through.
 */
const MEASURED_SLACK = 1e-4;

/** `token` is arithmetic on both sides, so this is float equality with a
 *  nod to the last bit rather than a tolerance with an opinion in it. */
const TOKEN_SLACK = 1e-9;

const assetsDir = fileURLToPath(new URL('../apps/game/public/assets', import.meta.url));
const slotSize = new Map(ASSET_SLOTS.map((s) => [s.id, s.size] as const));

const faults: string[] = [];
const fault = (line: string): void => void faults.push(line);

const ladder = readLadder();

// The ladder and the baker must be talking about the same set of directions.
// A direction added to `THEMES_TO_BAKE` and never baked would otherwise be
// graded by nothing at all, which is the silence this whole file is against.
const recorded = Object.keys(ladder).sort();
const expected = THEMES.map((t) => t.id).sort();
if (recorded.join(',') !== expected.join(',')) {
  fault(
    `ladder.json covers ${recorded.join(', ') || '(nothing)'} but the baker bakes ` +
      `${expected.join(', ')} — run \`pnpm bake:terrain\` and commit the result`,
  );
}

for (const theme of THEMES) {
  const rungs = ladder[theme.id];
  if (rungs === undefined) continue; // Already reported above.

  for (const terrain of TERRAINS) {
    const rung = rungs[terrain];
    if (rung === undefined) {
      fault(`${theme.id}/${terrain}: no rung in ladder.json`);
      continue;
    }

    // 1. The theme, against the record. The Ashwake 1 failure.
    const live = tokenLuma(theme, terrain);
    if (Math.abs(live - rung.token) > TOKEN_SLACK) {
      fault(
        `${theme.id}/${terrain}: the THEME moved and the art did not — ` +
          `tokens now imply luma ${live.toFixed(4)}, the art was baked from ${rung.token.toFixed(4)}. ` +
          `Run \`pnpm bake:terrain\` and commit the PNGs with the palette change.`,
      );
    }

    // 2. The PNG, against the record.
    let seen: number;
    try {
      seen = await measuredLumaOf(theme, terrain);
    } catch {
      fault(`${theme.id}/${terrain}: terrain.${terrain}.png is missing or unreadable`);
      continue;
    }
    if (Math.abs(seen - rung.measured) > MEASURED_SLACK) {
      fault(
        `${theme.id}/${terrain}: the ART moved and its record did not — ` +
          `terrain.${terrain}.png renders at luma ${seen.toFixed(4)}, ladder.json says ` +
          `${rung.measured.toFixed(4)}. Re-bake, or restore the file.`,
      );
    }
  }

  // 3. Every PNG this direction advertises is the shape its slot declares.
  const dir = `${assetsDir}/${theme.id}`;
  let files: readonly string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.png'));
  } catch {
    fault(`${theme.id}: no assets directory at ${dir}`);
    continue;
  }
  for (const file of files) {
    const id = file.slice(0, -'.png'.length) as AssetId;
    const want = slotSize.get(id);
    if (want === undefined) {
      // The build's manifest filters to known ids, so a stray file is not a
      // broken client — but it IS a file nothing will ever fetch, which is
      // this repository's own signature miss wearing a `.png`.
      fault(`${theme.id}/${file}: not a slot in theme/assets.ts — nothing will ever fetch it`);
      continue;
    }
    const meta = await sharp(readFileSync(`${dir}/${file}`)).metadata();
    if (meta.width !== want[0] || meta.height !== want[1]) {
      fault(
        `${theme.id}/${file}: ${meta.width}×${meta.height}, but slot ${id} declares ` +
          `${want[0]}×${want[1]}`,
      );
    }
  }
}

// The ordering guardrail, over the COMMITTED art rather than a fresh bake.
// `scripts/terrain.ts` runs the same check on what it has just drawn; this one
// is the half that survives a bake nobody ran.
for (const theme of THEMES) {
  const rungs = ladder[theme.id];
  if (rungs === undefined) continue;
  const by = (pick: (r: { token: number; measured: number }) => number): string =>
    [...TERRAINS]
      .filter((c) => rungs[c] !== undefined)
      .sort((a, b) => pick(rungs[a]!) - pick(rungs[b]!))
      .join(' < ');
  const tokens = by((r) => r.token);
  const art = by((r) => r.measured);
  if (tokens !== art) {
    fault(
      `${theme.id}: the committed art inverts the greyscale ordering the L* test protects — ` +
        `tokens say ${tokens}, art renders ${art}`,
    );
  }
}

if (faults.length > 0) {
  console.error(`\nthe committed art does not match the theme it was baked from:\n`);
  for (const f of faults) console.error(`  - ${f}`);
  console.error('');
  process.exit(1);
}

const slots = THEMES.reduce((n, t) => {
  try {
    return n + readdirSync(`${assetsDir}/${t.id}`).filter((f) => f.endsWith('.png')).length;
  } catch {
    return n;
  }
}, 0);
console.log(
  `the committed art is current: ${slots} PNGs across ${THEMES.length} directions, ` +
    `${THEMES.length * TERRAINS.length} rungs graded against the live theme.`,
);
