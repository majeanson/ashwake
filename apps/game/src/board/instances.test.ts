import { describe, expect, it } from 'vitest';
import {
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
