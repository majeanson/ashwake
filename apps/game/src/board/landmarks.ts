import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  OctahedronGeometry,
  TorusGeometry,
  type BufferGeometry,
} from 'three';
import type { LandmarkReward } from '@engine/state';
import type { Motif } from '@theme/tokens';

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
 * **The mark stays the authority on MEANING.** `LANDMARK_ICON` still says
 * what each kind IS, the manual and the figures still draw it, and a prop is
 * additive: it is how a destination looks on the board, not what it means. A
 * player who learns a shrine's mark from a card must find the same mark in the
 * manual, and does — the same one file draws all three since 2026-08-30.
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
export function propGeometry(reward: LandmarkReward, motif: Motif = 'plane'): BufferGeometry {
  if (motif === 'settlement') return settlementGeometry(reward);
  switch (reward) {
    case 'cache':
      return new CylinderGeometry(R * 0.9, R, PROP_HEIGHT * 0.55, 8);
    case 'site':
      return new ConeGeometry(R * 0.8, PROP_HEIGHT, 6);
    case 'shrine': {
      const ring = new TorusGeometry(R * 0.72, R * 0.16, 8, 14);
      /*
       * A ring lying LEVEL, floating a third of a hex over its ground.
       *
       * The comment here used to say "standing on edge", and the code has
       * never done that: three builds a torus in the XY plane — already
       * upright — so this `rotateX` lays it down rather than stands it up.
       * Measured rather than argued (`landmarks.test.ts`): the ring is 0.88
       * wide and 0.16 tall, which is a disc, not a doorway.
       *
       * It stays laid down, and the reason arrived after it was written: the
       * camera came off its rail on 2026-08-29 and the board now turns
       * through every yaw. An upright ring is a doorway at one angle and a
       * vertical line at ninety degrees from it, and there is no per-instance
       * billboard here to save it. A level ring reads the same from every
       * direction the board can be turned to — and a lit ring hanging over
       * ground that re-arms between runs is a fair picture of a shrine.
       *
       * Whether it should stand up once something turns it to face the
       * camera is a look question for Marc, not a bug to fix quietly.
       */
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
 * The same five destinations, in a place somebody stayed (2026-08-29).
 *
 * The props were built for the plane: a drum you open, a spire on the horizon,
 * a threshold, a rock being claimed, a crystal. On a board where every ground
 * names what it is FOR, three of those are the wrong object — a settlement
 * does not leave its valuables in a drum on the ground, and the thing you can
 * see from across a town is a tower.
 *
 * Three change and two do not, and the two that do not are the argument that
 * this is a reading rather than a redecoration:
 *
 * - **cache** — a strongbox. Square, lidded, and the only prop with corners:
 *   nothing weather makes on this board is square, which is exactly why the
 *   settlement's art uses that silhouette for goods as well
 *   (`scripts/terrain.ts#crateField`).
 * - **site** — a tower, not a spire. Same job — the thing visible from across
 *   the board — done the way a town does it: it stands taller than anything
 *   else here and it is round, because a spire is a rock formation and a
 *   tower was built.
 * - **territory** — a boundary post, square in section. Ground being claimed
 *   is a fence line here, not a stone; a settlement marks its edges with
 *   something a person drove into the earth.
 * - **shrine** — UNCHANGED. A ring standing on edge is an arch, and an arch is
 *   a threshold in both fictions. Changing it would cost the one silhouette on
 *   the board that already reads as a way through.
 * - **find** — UNCHANGED, for the reason it was chosen: a find is not a place
 *   somebody built, and that stays true of a settlement. It is the one thing
 *   here nobody put where it is.
 *
 * `LANDMARK_ICON` is still the authority on MEANING in both motifs — the
 * manual, the figures and the legend do not move, and a player who learns a
 * mark from a card finds the same mark in the manual whichever direction they
 * are playing.
 */
function settlementGeometry(reward: LandmarkReward): BufferGeometry {
  switch (reward) {
    case 'cache':
      return new BoxGeometry(R * 1.5, PROP_HEIGHT * 0.46, R * 1.2);
    case 'site':
      // Slightly taller than the plane's spire and narrower: a tower reads by
      // being the tallest thing in town, which a cone gets from its base.
      return new CylinderGeometry(R * 0.44, R * 0.54, PROP_HEIGHT * 1.05, 8);
    case 'shrine': {
      const ring = new TorusGeometry(R * 0.72, R * 0.16, 8, 14);
      ring.rotateX(Math.PI / 2);
      ring.translate(0, PROP_HEIGHT * 0.55, 0);
      return ring;
    }
    case 'territory':
      return new CylinderGeometry(R * 0.26, R * 0.32, PROP_HEIGHT * 0.74, 4);
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
export function propRise(reward: LandmarkReward, motif: Motif = 'plane'): number {
  if (motif === 'settlement') {
    switch (reward) {
      // Built things sit ON the ground, all of them: the plane's stone and
      // crystal are half-buried on purpose, because they grew there, and
      // nothing a person put down is.
      case 'cache':
        return PROP_HEIGHT * 0.23;
      case 'site':
        return PROP_HEIGHT * 0.525;
      case 'shrine':
        return 0;
      case 'territory':
        return PROP_HEIGHT * 0.37;
      case 'find':
        return R * 0.55;
    }
  }
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
