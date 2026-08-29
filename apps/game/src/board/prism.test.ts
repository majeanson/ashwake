import { describe, expect, it } from 'vitest';
import { hexPrism, PRISM_BOTTOM, PRISM_SIDE, PRISM_TOP, thetaStartFor } from './prism';

/**
 * The prism's contract, without a canvas: six faces, caps mapped in board axes,
 * and the material groups in the order a materials array is indexed by.
 */

const capsOf = (geometry: ReturnType<typeof hexPrism>) => {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  const out: { x: number; y: number; z: number; u: number; v: number }[] = [];
  for (let i = 0; i < position.count; i++) {
    if (Math.abs(normal.getY(i)) < 0.9) continue;
    out.push({
      x: position.getX(i),
      y: position.getY(i),
      z: position.getZ(i),
      u: uv.getX(i),
      v: uv.getY(i),
    });
  }
  return out;
};

describe('the hex prism', () => {
  it('maps its cap texture in board axes rather than the generator ones', () => {
    const geometry = hexPrism(1, 0.34, 'pointy');
    const caps = capsOf(geometry);
    expect(caps.length).toBeGreaterThan(0);
    for (const cap of caps) {
      // u follows +x and v follows +z: a texture drawn in board space lands on
      // the face the way it was drawn. The generator ties u to z and v to x.
      expect(cap.u).toBeCloseTo(cap.x / 2 + 0.5, 6);
      expect(cap.v).toBeCloseTo(cap.z / 2 + 0.5, 6);
    }
  });

  it('keeps every cap uv inside the texture', () => {
    for (const orientation of ['pointy', 'flat'] as const) {
      for (const cap of capsOf(hexPrism(1, 0.34, orientation))) {
        expect(cap.u).toBeGreaterThanOrEqual(0);
        expect(cap.u).toBeLessThanOrEqual(1);
        expect(cap.v).toBeGreaterThanOrEqual(0);
        expect(cap.v).toBeLessThanOrEqual(1);
      }
    }
  });

  it('stands as tall as it was asked to, on the floor it was centred on', () => {
    const geometry = hexPrism(1, 0.5, 'pointy');
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.max.y - box.min.y).toBeCloseTo(0.5, 6);
    expect(box.max.y).toBeCloseTo(0.25, 6);
  });

  it('groups its faces as side, top, bottom — the order a materials array reads', () => {
    const geometry = hexPrism(1, 0.34, 'pointy');
    expect(geometry.groups.map((g) => g.materialIndex)).toEqual([
      PRISM_SIDE,
      PRISM_TOP,
      PRISM_BOTTOM,
    ]);
  });

  it('turns the flat of the hex to face the orientation the theme asked for', () => {
    expect(thetaStartFor('pointy')).toBe(0);
    expect(thetaStartFor('flat')).toBeCloseTo(Math.PI / 6, 12);
  });
});
