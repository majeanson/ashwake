import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import sharp from 'sharp';
import { luma, type Rgb, type Theme } from '../packages/core/src/theme/tokens';

/**
 * THE MEASURED LADDER: what the committed terrain art actually renders, and
 * what the theme said when it was baked.
 *
 * `.github/workflows/ci.yml` has carried an admitted hole since 2026-08-29:
 * CI runs `pnpm bake`, which proves the pipeline still WORKS and that a fresh
 * bake passes the greyscale guardrail — but it deliberately does not diff the
 * result against the committed PNGs, because `sharp` does not rasterise SVG
 * byte-identically across platforms and a Linux runner therefore never
 * reproduces a Windows bake. So "the committed art is current" was checked by
 * nothing, and that is not hypothetical: Ashwake 1 darkened daylight's terrain
 * ladder on 2026-08-28, never re-baked, and shipped art rendering the OLD
 * ladder — which this body then inherited and only found by re-baking months
 * later.
 *
 * The closure ci.yml names is the one built here: **a measured ladder derived
 * from the THEME, committed, and graded against the committed PNGs** — which
 * is portable in a way bytes are not. The file has two columns per slot and
 * they catch opposite failures:
 *
 *   `token`      the luma the THEME's own fills imply, pure arithmetic over
 *                `theme/tokens.ts` with no rasteriser anywhere near it. It is
 *                therefore comparable EXACTLY, on any platform. A theme edited
 *                without a re-bake moves the live token and leaves this one
 *                behind, which is precisely the Ashwake 1 failure.
 *
 *   `measured`   the mean luma of the baked PNG, composited over that
 *                direction's own board background. `artcheck` re-derives it by
 *                DECODING the committed bytes rather than by re-rasterising the
 *                SVG — PNG decode is deterministic where SVG rasterisation is
 *                not — so this too compares tightly across platforms. It
 *                catches a PNG replaced, truncated or hand-edited out from
 *                under its own record.
 *
 * Both live in one file written by one function, so the baker and the checker
 * cannot drift into measuring two different things.
 */

/** The four terrains, in the order the ladder file lists them. */
export const TERRAINS = ['green', 'yellow', 'red', 'blue'] as const;

export type Rung = { readonly token: number; readonly measured: number };
/** `{ [themeId]: { [terrain]: Rung } }`, exactly as it is committed. */
type Ladder = Readonly<Record<string, Readonly<Record<string, Rung>>>>;

/** Where the committed ladder lives — beside the art it grades. */
export const LADDER_FILE = fileURLToPath(
  new URL('../apps/game/public/assets/ladder.json', import.meta.url),
);

/** A committed terrain PNG's path, for a direction and a colour. */
const terrainFile = (themeId: string, terrain: string): string =>
  fileURLToPath(
    new URL(`../apps/game/public/assets/${themeId}/terrain.${terrain}.png`, import.meta.url),
  );

/**
 * The luma a direction's own tokens imply for one terrain.
 *
 * Lifted verbatim out of `scripts/terrain.ts`'s guardrail so the two cannot
 * disagree about what "the theme says" means: a flat surface is its fill, and
 * a graded one is the mean of its two ends.
 */
export function tokenLuma(theme: Theme, terrain: (typeof TERRAINS)[number]): number {
  const s = theme.terrain[terrain];
  return s.fillTo === null ? luma(s.fill) : (luma(s.fill) + luma(s.fillTo)) / 2;
}

/**
 * The luma a baked PNG renders at.
 *
 * Composited over the board's own background, the same near-black (or, in
 * daylight, near-white) every in-play tile actually sits on — a mean over the
 * transparent corners outside the hex clip would understate every colour by
 * the same amount and could still mislead the ordering check.
 */
export async function measuredLuma(theme: Theme, png: Buffer): Promise<number> {
  const stats = await sharp(png)
    .flatten({
      background: {
        r: (theme.board.background >> 16) & 0xff,
        g: (theme.board.background >> 8) & 0xff,
        b: theme.board.background & 0xff,
      },
    })
    .stats();
  const [r, g, b] = stats.channels;
  const mean: Rgb = (Math.round(r!.mean) << 16) | (Math.round(g!.mean) << 8) | Math.round(b!.mean);
  return luma(mean);
}

/** The same, for a committed file rather than a buffer in hand. */
export const measuredLumaOf = async (theme: Theme, terrain: string): Promise<number> =>
  measuredLuma(theme, readFileSync(terrainFile(theme.id, terrain)));

/** Read the committed ladder. Throws with the reason if it is not there. */
export function readLadder(): Ladder {
  let raw: string;
  try {
    raw = readFileSync(LADDER_FILE, 'utf8');
  } catch {
    throw new Error(
      `no measured ladder at ${LADDER_FILE} — run \`pnpm bake:terrain\` and commit what it writes`,
    );
  }
  return JSON.parse(raw) as Ladder;
}
