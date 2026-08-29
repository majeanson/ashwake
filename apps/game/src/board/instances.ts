import type { InstancedMesh } from 'three';

/**
 * Publishing a batch of instances (Stage 2c, 2026-08-29).
 *
 * Four lines that must always happen together, and one of them is a bug fix
 * that cost a phone session.
 *
 * **`InstancedMesh` caches its bounding sphere forever.** `raycast` tests that
 * sphere before it tests a single instance:
 *
 *     if ( this.boundingSphere === null ) this.computeBoundingSphere();
 *     if ( raycaster.ray.intersectsSphere( _sphere ) === false ) return;
 *
 * — and `computeBoundingSphere` only ever runs on that first null. So the
 * sphere is measured on whatever the board looked like the FIRST time a finger
 * touched it, and every cell the board grows after that sits outside it and
 * silently stops answering taps. On a game whose whole shape is a board growing
 * outward from home, that means the frontier — the only place you can actually
 * play — goes dead partway through a run, and nothing reports an error because
 * from three's side nothing went wrong.
 *
 * `frustumCulled={false}` does not save you: it turns off culling, not the
 * raycast's own sphere test.
 *
 * Nulling the bounds is cheaper than recomputing them here, because three then
 * recomputes lazily on the next raycast rather than on every view change — and
 * a view changes far more often than it is tapped.
 */
export function commitInstances(mesh: InstancedMesh, count: number): void {
  mesh.count = count;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor !== null) mesh.instanceColor.needsUpdate = true;
  mesh.boundingSphere = null;
  mesh.boundingBox = null;
}
