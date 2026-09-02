import type { Color, InstancedMesh } from 'three';

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

/**
 * A packed `0xRRGGBB` tint, into a `Color`, at a brightness.
 *
 * Three copies of this byte-unpack were written out by hand — twice in
 * `HexField` and once in `Pop` — and one of them runs per instance per frame.
 * It is the kind of arithmetic that is obviously right in each copy and
 * silently drifts between them: an off-by-one shift here reads as a
 * "the board's colours are wrong on the pop layer" bug report.
 *
 * `setRGB` writes into the working space unchanged, which is what lets the
 * torch shader read display-space numbers back out (`torchShader.ts`). That is
 * the whole reason this is not `Color.setHex`.
 *
 * Mutates rather than returns, because it is called in a loop over hundreds of
 * instances and a `Color` per instance is a `Color` per instance.
 */
export function tintInto(target: Color, tint: number, lit: number): void {
  target.setRGB(
    (((tint >> 16) & 0xff) / 255) * lit,
    (((tint >> 8) & 0xff) / 255) * lit,
    ((tint & 0xff) / 255) * lit,
  );
}
