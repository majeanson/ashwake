import { describe, expect, it } from 'vitest';
import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
  type BufferGeometry,
} from 'three';
import { commitInstances } from './instances';
import { hexPrism } from './prism';

/**
 * The frontier keeps taking taps as the board grows (Marc, on a phone,
 * 2026-08-29: "most of the clicks in the upper tiles don't work").
 *
 * Raycasting is pure arithmetic — no GPU, no canvas — so the bug that ate those
 * taps can be pinned exactly, in node, in a millisecond.
 */

const material = new MeshBasicMaterial();

/** A mesh with `capacity` slots, `count` of them standing where `at` says. */
function fieldOf(geometry: BufferGeometry, at: readonly (readonly [number, number])[]) {
  const mesh = new InstancedMesh(geometry, material, 64);
  const matrix = new Matrix4();
  at.forEach(([x, z], i) => {
    matrix.makeTranslation(x, 0, z);
    mesh.setMatrixAt(i, matrix);
  });
  commitInstances(mesh, at.length);
  mesh.updateMatrixWorld(true);
  return mesh;
}

/** Straight down onto (x, z), the way the board's camera looks at zero tilt. */
function tapAt(mesh: InstancedMesh, x: number, z: number): number | undefined {
  const raycaster = new Raycaster(new Vector3(x, 50, z), new Vector3(0, -1, 0));
  return raycaster.intersectObject(mesh, false)[0]?.instanceId;
}

describe('an instanced field', () => {
  it('answers a tap on the cell it was built with', () => {
    const mesh = fieldOf(hexPrism(0.94, 0.34, 'pointy'), [[0, 0]]);
    expect(tapAt(mesh, 0, 0)).toBe(0);
  });

  it('answers a tap on ground it grew AFTER the first tap', () => {
    // The regression. `InstancedMesh.raycast` measures its bounding sphere on
    // the first ray it is ever given and caches it forever, so a board that has
    // been touched once and then grown has a frontier three will not test —
    // which on a phone reads as the outer tiles going dead mid-run.
    const mesh = fieldOf(hexPrism(0.94, 0.34, 'pointy'), [[0, 0]]);
    expect(tapAt(mesh, 0, 0)).toBe(0); // caches the sphere around one hex

    const far: [number, number] = [0, -12];
    const matrix = new Matrix4().makeTranslation(far[0], 0, far[1]);
    mesh.setMatrixAt(1, matrix);
    commitInstances(mesh, 2);
    mesh.updateMatrixWorld(true);

    expect(tapAt(mesh, ...far)).toBe(1);
    expect(tapAt(mesh, 0, 0)).toBe(0);
  });

  it('stops answering for ground that left the board', () => {
    const mesh = fieldOf(hexPrism(0.94, 0.34, 'pointy'), [
      [0, 0],
      [0, -6],
    ]);
    expect(tapAt(mesh, 0, -6)).toBe(1);
    commitInstances(mesh, 1);
    expect(tapAt(mesh, 0, -6)).toBeUndefined();
  });

  it('misses the seam between two hexes', () => {
    // The seam is not ground, and a tap in it must not be answered by whichever
    // neighbour three happened to test first.
    const mesh = fieldOf(hexPrism(0.8, 0.34, 'pointy'), [
      [0, 0],
      [0, -3],
    ]);
    expect(tapAt(mesh, 0, -1.5)).toBeUndefined();
  });
});

/**
 * The OTHER thing that goes wrong with an instanced mesh here (2026-09-01).
 *
 * `commitInstances` above is the first: a cached bounding sphere that stops
 * answering taps. This is the second, and it cost two wrong diagnoses of the
 * same phone photo — Marc: *"still see some weird block shapes."*
 *
 * `Color.setRGB` writes into the WORKING colour space, which three keeps as
 * linear-sRGB. Hand it a display-space colour and it is treated as if it were
 * already linear, and comes back out lighter and far less saturated. Worse, the
 * wash lands on the SHADING as well as the hue, so a lit solid stops reading as
 * a solid and becomes a flat pale silhouette. That is what happened to the
 * destination props, and it is why they read as blocks.
 *
 * `HexField` and `Pop` write `setRGB` ON PURPOSE and are correct: their
 * materials carry `torchShader.ts`, which replaces `color_fragment` so the tint
 * multiplies in DISPLAY space, and those materials want the raw display numbers
 * in `vColor`. The rule is therefore not "never `setRGB`" but this:
 *
 *   **`setRGB` for a torch tint, `setHex` for a colour.**
 *
 * The props are gone (`DECISIONS.md` D11), so nothing in the board draws a
 * display colour through `instanceColor` today. This stays because the next
 * instanced mesh added here will face the same fork, and nothing else in the
 * repository says which way to take it.
 */
describe('the colour space an instance colour is written in', () => {
  /** Torchlit's own `ink.lit`, a mid gold. */
  const GOLD = 0xc79a4b;

  it('round-trips a display colour through setHex, and not through setRGB', () => {
    expect(new Color().setHex(GOLD).getHexString()).toBe('c79a4b');

    const washed = new Color()
      .setRGB(((GOLD >> 16) & 0xff) / 255, ((GOLD >> 8) & 0xff) / 255, (GOLD & 0xff) / 255)
      .getHexString();
    expect(washed, 'setRGB no longer treats a display colour as linear').not.toBe('c79a4b');
  });
});
