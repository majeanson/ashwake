import {
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  TorusGeometry,
  type BufferGeometry,
} from 'three';
import type { LandmarkReward } from '@engine/state';

/**
 * The SHAPES things standing on the ground take (Stage 2d, 2026-08-29).
 *
 * Named for what it describes rather than for the component that draws it:
 * `props.ts` beside `Props.tsx` differ only in case, which Windows cannot
 * tell apart — the same trap `pop.ts` set beside `Pop.tsx` an hour earlier.
 *
 * Marc: *"map shrines, etc. cuter and more nice."* A landmark was a flat glyph
 * printed on a hex top — `✚ ★ ◈ ❖ ✦` — which is what a 2D board could do. On a
 * lit, leaning, three-dimensional board the same information can be a THING:
 * something built, standing up, catching the key light and throwing a side into
 * shadow. That reads at any zoom, survives a screenshot at arm's length, and
 * says *someone was here* in a way a printed mark cannot.
 *
 * **The glyph stays the authority on MEANING.** `LANDMARK_GLYPH` still says
 * what each kind IS, the manual and the figures still draw it, and a prop is
 * additive: it is how a destination looks on the board, not what it means. A
 * player who learns `◈` from a card must find `◈` in the manual, and does.
 *
 * Primitives rather than modelled meshes, deliberately. Five landmark kinds
 * modelled properly is an art commission and a megabyte; five built out of a
 * cone, a torus, a cylinder and two polyhedra is a few hundred triangles and
 * ships tonight. They are silhouettes, and at the size a hex is drawn on a
 * phone the silhouette is the whole information — the same argument the
 * `glyphs` pattern kind makes about fields.
 */

/**
 * How tall a prop stands, in hex radii, before the relief lifts its ground.
 *
 * Sized by looking. The first pass was 0.42 tall and a third of a hex wide,
 * which is what a prop looks like when it is designed against a hex rather
 * than against a SCREEN: at the 34px-per-hex zoom ceiling that is a mark about
 * six pixels across, and six pixels is a smudge. A destination has to be the
 * thing you can see from across the board — that is what makes it a
 * destination — so it stands most of a hex tall and half of one wide.
 */
export const PROP_HEIGHT = 0.72;

/** How wide. Half a hex: enough to read, not so much that it hides the ground
 *  it stands on or the number printed there. */
const R = 0.5;

/**
 * The shape each destination takes.
 *
 * - **cache** — a squat drum, the thing you open. Low and wide: a cache is
 *   found rather than travelled to, and should not tower over the ground.
 * - **site** — a spire. It is the thing you can see from far away, which is
 *   what makes it a destination at all.
 * - **shrine** — a ring standing on edge. Shrines wake and re-arm across runs,
 *   and a ring is the one silhouette that reads as a THRESHOLD rather than as
 *   an object.
 * - **territory** — a faceted stone. It is ground being claimed, so it is the
 *   most rock-like of the five.
 * - **find** — a small sharp crystal, the only one that is not architecture,
 *   because a find is not a place someone built.
 */
export function propGeometry(reward: LandmarkReward): BufferGeometry {
  switch (reward) {
    case 'cache':
      return new CylinderGeometry(R * 0.9, R, PROP_HEIGHT * 0.55, 8);
    case 'site':
      return new ConeGeometry(R * 0.8, PROP_HEIGHT, 6);
    case 'shrine': {
      const ring = new TorusGeometry(R * 0.72, R * 0.16, 8, 14);
      // Standing on edge: a torus is born lying flat, and a threshold you
      // could step over is a threshold nobody notices.
      ring.rotateX(Math.PI / 2);
      ring.translate(0, PROP_HEIGHT * 0.55, 0);
      return ring;
    }
    case 'territory':
      return new IcosahedronGeometry(R * 0.82, 0);
    case 'find':
      return new OctahedronGeometry(R * 0.6, 0);
  }
}

/**
 * How high a prop's own middle sits above the ground it stands on.
 *
 * The geometries are built around their own centres — except the shrine, which
 * is already translated — so each needs its own offset to LAND rather than sink
 * halfway in. A prop half-buried in its hex is a prop that reads as a decal.
 */
export function propRise(reward: LandmarkReward): number {
  switch (reward) {
    case 'cache':
      return PROP_HEIGHT * 0.275;
    case 'site':
      return PROP_HEIGHT * 0.5;
    case 'shrine':
      return 0;
    case 'territory':
      return R * 0.7;
    case 'find':
      return R * 0.55;
  }
}

/** The five kinds, so a caller can build one mesh per kind and no more. */
export const REWARDS: readonly LandmarkReward[] = ['cache', 'site', 'shrine', 'territory', 'find'];
