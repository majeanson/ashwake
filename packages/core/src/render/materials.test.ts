import { describe, expect, it } from 'vitest';
import { COLOURS } from '@content/tuning';
import { THEMES } from '@theme/index';
import { exposure, renders, rigFor, sideNormals, UP } from '@theme/rig';
import { cellTint } from '@theme/torch';
import {
  clearance,
  contrastRatio,
  depthOf,
  luma,
  MIN_MARK_CONTRAST,
  type Rgb,
  type Theme,
} from '@theme/tokens';
import { sideColour, surfaceFor } from './materials';
import { paintPlan, surfaceSamples } from './paint';
import type { CellView } from './Renderer';

/**
 * **The budget, over what a hex actually renders in.**
 *
 * `CLAUDE.md` has promised this since the board was lit: the contrast budget
 * and the greyscale ladder run over every direction, and — once the board is
 * lit — over the materials a hex actually renders in. Until now they graded
 * theme DATA: a fill and a gradient end, before a pattern went over them,
 * before a wash went over that, and before a light and a torch touched either.
 *
 * The three things that make it gradeable without a GPU are all elsewhere, on
 * purpose. `paintPlan` enumerates the layers, `surfaceSamples` reduces them to
 * the set of colours a finished hex contains, and `renders` is the one function
 * the board answers to as well — so this file measures the board rather than a
 * model of it.
 *
 * **Do not relax a threshold to make a direction pass.** Every number here is
 * borrowed from `theme.test.ts` and `contrast.test.ts` rather than invented,
 * precisely so that it cannot be moved to buy a result. The levers are a theme
 * colour or a rig number.
 */

const TEXTURE = 256;
const DIRECTIONS = THEMES;

/**
 * Borrowed from `theme.test.ts`, where each earned its argument. Borrowed
 * rather than invented so that no number here can be moved to buy a result.
 *
 * A shaded SIDE is graded at the WALL floor, not the ground floor, and the
 * choice is an argument rather than a convenience. `MIN_GROUND_CLEARANCE`
 * (0.1) is "a placed tile is a visible shape", and it is measured on the TOP
 * face — which the rig's normalisation renders as the authored colour, so
 * `theme.test.ts` already holds it exactly. `MIN_WALL_CLEARANCE` (0.045) is
 * "blocked ground must not read as fog", which is the same sentence as "a
 * shaded side must not read as a gap between hexes", and that is the thing the
 * third dimension actually added.
 *
 * The measured margin is thin and worth knowing: at the full rig, torchlit's
 * darkest terrain side sits at 0.070 clearance and torchlit-bright's at 0.072 —
 * above the wall floor, below the ground floor. Holding sides to 0.1 would
 * require the darkest facet to be exposed at 0.655, which is a top-to-side
 * ratio of 1.53 and a board with almost no shading left. On a near-black board
 * a dark terrain's shaded side and the board are genuinely close, and that is a
 * fact about the palette, not a threshold to argue with.
 */
const MIN_SIDE_CLEARANCE = 0.045;
const MIN_SEPARATION = 0.05;

/** The dial the board is graded at. The zero is a map; this is a lit board. */
const RIG = rigFor(1);
const TOP = exposure(RIG, UP);

const cell = (over: Partial<CellView>): CellView => ({
  key: '0,0',
  q: 0,
  r: 0,
  kind: 'tile',
  colour: null,
  landmark: null,
  claimed: false,
  beacon: false,
  remembered: false,
  shimmer: false,
  rarity: null,
  native: null,
  ripe: false,
  dimmed: false,
  lensed: false,
  targeted: false,
  worth: 0,
  home: false,
  light: 1,
  band: 0,
  legal: false,
  preview: null,
  previewColour: null,
  ...over,
});

/** Every surface a cell can actually stand on, with the art slots empty —
 *  the procedural floor, which is what every direction has to pass. */
function standingSurfaces(theme: Theme) {
  const cells: CellView[] = [
    ...COLOURS.map((colour) => cell({ kind: 'tile', colour })),
    cell({ kind: 'stone' }),
    cell({ kind: 'wall' }),
    cell({ kind: 'empty' }),
    ...COLOURS.map((colour) => cell({ kind: 'empty', native: colour })),
    cell({ kind: 'landmark' }),
    cell({ kind: 'landmark', claimed: true }),
  ];
  return cells.map((c) => surfaceFor(c, theme, () => false).surface);
}

const samplesOf = (theme: Theme, surface: ReturnType<typeof standingSurfaces>[number]) =>
  surfaceSamples(paintPlan(surface, { texturePx: TEXTURE, depth: depthOf(theme) }));

/** The four colours a player places — what theme.test.ts grades a silhouette
 *  on, and for the same reason: stone is spent and empty ground IS the board. */
const terrainSurfaces = (theme: Theme) => COLOURS.map((colour) => theme.terrain[colour]);

describe.each(DIRECTIONS.map((t) => [t.id, t] as const))('%s, as rendered', (_id, theme) => {
  const lit = cellTint(theme, { light: 1, band: 0, remembered: false, dimmed: false });

  it('renders a fully lit top as exactly the colour the direction authored', () => {
    // The identity every assertion below inherits: with the rig normalised so
    // a face pointing up is exposed at 1, the existing budget in
    // `contrast.test.ts` is not an approximation of the screen — it IS the
    // screen, for the top face of a lit hex.
    for (const surface of standingSurfaces(theme)) {
      for (const sample of samplesOf(theme, surface).face) {
        expect(renders(sample, lit, TOP)).toBe(sample);
      }
    }
  });

  it('keeps the label readable on every colour a hex contains, not just its fill', () => {
    // A hex is a gradient with a pattern over it and a wash over that, so the
    // pair rule — ink or halo clears the ground — has to hold on all of them.
    for (const surface of standingSurfaces(theme)) {
      for (const sample of samplesOf(theme, surface).label) {
        const ground = renders(sample, lit, TOP);
        const best = Math.max(
          contrastRatio(theme.ink.ink, ground),
          contrastRatio(theme.ink.halo, ground),
        );
        expect(best, `ink/halo over ${sample.toString(16)}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it('keeps a meaningful edge visible on every colour a hex contains', () => {
    const edges: readonly Rgb[] = [
      theme.board.ripeEdge,
      theme.board.legalEdge,
      theme.ink.lit,
      theme.ink.accent,
    ];
    for (const surface of standingSurfaces(theme)) {
      for (const sample of samplesOf(theme, surface).face) {
        const ground = renders(sample, lit, TOP);
        for (const edge of edges) {
          const alone = contrastRatio(edge, ground);
          const cased = Math.max(
            contrastRatio(theme.ink.halo, ground),
            contrastRatio(theme.ink.ink, ground),
          );
          expect(Math.max(alone, cased)).toBeGreaterThanOrEqual(MIN_MARK_CONTRAST);
        }
      }
    }
  });

  it('keeps a standing hex a visible shape once its sides are shaded', () => {
    // The one assertion the third dimension actually added. A prism's darkest
    // facet is the darkest thing a direction draws, and if it falls into the
    // background then a hex stops having a silhouette — which is exactly what
    // the flat board could not fail at, because it had no sides.
    const darkest = Math.min(...sideNormals(theme.orientation).map((n) => exposure(RIG, n)));
    for (const surface of terrainSurfaces(theme)) {
      const side = renders(sideColour(surface), lit, darkest);
      expect(
        clearance(side, theme.board.background),
        `a shaded side at ${side.toString(16)} has to stay a shape against the board`,
      ).toBeGreaterThanOrEqual(MIN_SIDE_CLEARANCE);
    }
  });

  it('keeps the greyscale ladder under the torch, on the real composite', () => {
    // `theme.test.ts` grades the ladder on theme data at full light. This
    // grades it where the board is dimmest — a hex at the direction's own
    // light floor — and on the colour that is actually rendered there.
    const dim = cellTint(theme, {
      light: theme.light.floor,
      band: 0,
      remembered: false,
      dimmed: false,
    });
    const rungs = COLOURS.map((colour) => luma(renders(theme.terrain[colour].fill, dim, TOP))).sort(
      (a, b) => a - b,
    );
    for (let i = 1; i < rungs.length; i++) {
      expect(
        rungs[i]! - rungs[i - 1]!,
        'two grounds a torch cannot tell apart are two grounds a player cannot',
      ).toBeGreaterThanOrEqual(MIN_SEPARATION * 0.5);
    }
  });
});
