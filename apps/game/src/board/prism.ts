import { CylinderGeometry, type BufferGeometry } from 'three';
import type { Orientation } from '@theme/tokens';

/**
 * The hex prism a cell stands as (Stage 2c, 2026-08-29).
 *
 * A six-sided cylinder is the right shape and the wrong geometry in two ways,
 * and both are cheap to correct once, here, rather than worked around wherever
 * a hex is drawn.
 *
 * **The sides are smooth-shaded.** `CylinderGeometry` gives its torso radial
 * normals shared between neighbouring segments, because it is built for
 * cylinders — so a six-segment prism is Gouraud-shaded and reads as a rounded
 * blob under any light, never as six flat faces. The fix is not geometry but a
 * material flag (`flatShading`), and it is stated here because this is the file
 * that knows why it is needed.
 *
 * **The cap UVs are transposed.** The generator writes `u = cosθ/2 + 0.5` and
 * `v = ±sinθ/2 + 0.5` while placing the vertex at `x = r·sinθ, z = r·cosθ` — so
 * `u` runs along the board's +z and `v` along its +x. A texture baked in board
 * space would arrive rotated a quarter turn. `hexPrism` rewrites the cap UVs to
 * the board's own axes, which is the convention `render/paint.ts`'s plans are
 * authored in.
 */

/** Which way the flat of a hex faces, as a rotation of the prism's first face. */
export const thetaStartFor = (orientation: Orientation): number =>
  orientation === 'pointy' ? 0 : Math.PI / 6;

/**
 * Material group order, fixed by `CylinderGeometry`: torso, top cap, bottom
 * cap. Named because a materials array is indexed by it and a bare `1` at the
 * call site is a puzzle.
 */
export const PRISM_SIDE = 0;
export const PRISM_TOP = 1;
export const PRISM_BOTTOM = 2;

/**
 * A hex prism of `radius` and `height`, centred on its own middle.
 *
 * The cap UVs map the circumscribed square in BOARD axes: `u = x/2r + 0.5`,
 * `v = z/2r + 0.5`. A texture drawn with +x right and +z down therefore lands
 * on the top face the way it was drawn, provided it is uploaded with
 * `flipY = false` — `v` here is not flipped, because flipping twice is how a
 * texture ends up mirrored and nobody notices until a glyph is baked into it.
 */
export function hexPrism(radius: number, height: number, orientation: Orientation): BufferGeometry {
  const geometry = new CylinderGeometry(
    radius,
    radius,
    height,
    6,
    1,
    false,
    thetaStartFor(orientation),
  );
  writeCapUvs(geometry, radius);
  return geometry;
}

/**
 * Rewrite the UVs of every cap vertex into board axes.
 *
 * A cap vertex is exactly a vertex whose normal points straight up or straight
 * down — true of the caps and of nothing on the torso, whose normals are all
 * horizontal. Selecting by normal rather than by index arithmetic means this
 * keeps working if three ever changes how many vertices a cap costs.
 */
function writeCapUvs(geometry: BufferGeometry, radius: number): void {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  const span = radius * 2;
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(normal.getY(i)) < 0.9) continue;
    uv.setXY(i, position.getX(i) / span + 0.5, position.getZ(i) / span + 0.5);
  }
  uv.needsUpdate = true;
}
