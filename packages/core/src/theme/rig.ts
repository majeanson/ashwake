import { linearToSrgb, srgbToLinear, type Orientation, type Rgb } from './tokens';
import { torched } from './torch';

/**
 * The lighting rig, as data (Stage 2c, 2026-08-29).
 *
 * A 3D board shades what a 2D one painted, and the moment a light touches a
 * hex, `contrast.test.ts`'s 4.5:1 stops being a statement about the screen.
 * This file is what keeps it one: the rig is DATA, the exposure it produces on
 * a face is a pure function of that data, and the renderer builds its lights
 * from the same object the budget test measures. The board cannot disagree with
 * the test, because there is nothing for them to disagree about — the same
 * property `fieldGround` and `depthOf` bought Ashwake 1's gallery.
 *
 * **The normalisation rule is the load-bearing idea.** Every rig here is scaled
 * so that a face pointing straight up has an exposure of exactly 1. Then a hex
 * top at full torch renders EXACTLY the colour the direction authored, every
 * existing assertion in `contrast.test.ts` and `theme.test.ts` is literally
 * true of the rendered top face, and the dial's zero is not "the board we
 * happened to ship" but "every face renders as authored". It also means the rig
 * cannot be brightened to flatter a screenshot: more key has to come out of the
 * ambient, so lighting the tops harder is not a thing this file can express.
 *
 * The arithmetic is three's, deliberately. Its lights are physically correct
 * with no legacy scaling, and `BRDF_Lambert` is `diffuse / PI`, so a Lambert
 * surface with no specular lobe leaves exactly
 * `(ambient + sum of intensity * max(0, n . l)) / PI` — analytic, and only
 * analytic because the ground material carries no view-dependent term.
 */

export type Vec3 = readonly [number, number, number];

export type Light = {
  /** Direction TO the light from the surface, unit length. */
  readonly dir: Vec3;
  readonly intensity: number;
};

export type Rig = {
  /** Ambient irradiance, in three's units. */
  readonly ambient: number;
  readonly lights: readonly Light[];
};

/** Straight up — the face the rig is normalised against. */
export const UP: Vec3 = [0, 1, 0];

/**
 * No lighting at all: every face, whatever way it points, renders the colour it
 * was authored as. This is the dial's zero, and it is a defensible board rather
 * than a broken one — it is what a map is.
 */
export const FLAT_RIG: Rig = { ambient: Math.PI, lights: [] };

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const unit = (v: Vec3): Vec3 => {
  const length = Math.hypot(v[0], v[1], v[2]);
  return length === 0 ? v : [v[0] / length, v[1] / length, v[2] / length];
};

/** How much light a face pointing `n` receives, as a multiple of its albedo. */
export const exposure = (rig: Rig, n: Vec3): number =>
  (rig.ambient + rig.lights.reduce((sum, l) => sum + l.intensity * Math.max(0, dot(n, l.dir)), 0)) /
  Math.PI;

/** The same rig, scaled so a face pointing straight up is exposed at exactly 1. */
export function normalised(rig: Rig): Rig {
  const up = exposure(rig, UP);
  if (up <= 0) return FLAT_RIG;
  return {
    ambient: rig.ambient / up,
    lights: rig.lights.map((l) => ({ dir: l.dir, intensity: l.intensity / up })),
  };
}

/**
 * The key and the fill, as fractions of the light a top face receives.
 *
 * A key alone leaves the face opposite it on pure ambient, which reads as a
 * hole rather than as a shaded side; the fill is what makes a turned board show
 * six faces instead of three faces and three silhouettes.
 */
const KEY_SHARE = 0.5;
const FILL_SHARE = 0.12;
const KEY_DIR = unit([0.45, 0.75, 0.5]);
const FILL_DIR = unit([-0.5, 0.4, -0.35]);

/**
 * The rig at a given strength, 0..1, always normalised.
 *
 * At 0 it is `FLAT_RIG`. At 1 the key and fill together carry 62% of a top
 * face's light and the ambient carries the rest, so the darkest facet on the
 * board sits at 38% of a lit top — enough for a prism to read as a solid, and
 * not so much that a side goes to black and takes the silhouette with it.
 */
export function rigFor(strength: number): Rig {
  const d = Math.min(1, Math.max(0, strength));
  if (d === 0) return FLAT_RIG;
  const ambient = Math.PI * (1 - d * (KEY_SHARE + FILL_SHARE));
  return normalised({
    ambient,
    lights: [
      { dir: KEY_DIR, intensity: (Math.PI * d * KEY_SHARE) / dot(UP, KEY_DIR) },
      { dir: FILL_DIR, intensity: (Math.PI * d * FILL_SHARE) / dot(UP, FILL_DIR) },
    ],
  });
}

/**
 * The outward normals of a hex prism's six side faces, in board axes.
 *
 * Flat-shaded, so each face has ONE normal, pointing out along the midpoint of
 * the two corners it spans. `prism.ts` builds the geometry these describe; the
 * budget test walks them to find the darkest face a direction can produce.
 */
export function sideNormals(orientation: Orientation): readonly Vec3[] {
  const thetaStart = orientation === 'pointy' ? 0 : Math.PI / 6;
  return Array.from({ length: 6 }, (_, i) => {
    const theta = thetaStart + (i + 0.5) * (Math.PI / 3);
    return [Math.sin(theta), 0, Math.cos(theta)] as Vec3;
  });
}

/** A colour under an exposure: scale the light, not the code values. */
export function litColour(c: Rgb, e: number): Rgb {
  const channel = (shift: number): number => {
    const linear = srgbToLinear(((c >> shift) & 0xff) / 255) * Math.max(0, e);
    return Math.round(Math.min(1, linearToSrgb(Math.min(1, linear))) * 255) & 0xff;
  };
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

/**
 * **The colour a hex actually renders in.** The board answers to this and so
 * does the budget, which is the whole point of the file.
 */
export const renders = (base: Rgb, tint: Rgb, e: number): Rgb => litColour(torched(base, tint), e);
