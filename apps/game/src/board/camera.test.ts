import { describe, expect, it } from 'vitest';
import { disc } from '@engine/hex';
import {
  cameraAt,
  fitCamera,
  frameFor,
  HEX_PX_MAX,
  lerpCamera,
  pannedBy,
  pxPerUnit,
  zoomMaxOf,
  zoomedBy,
} from './camera';

/**
 * The camera contract, without a canvas: zoom 1 is the fit, the ceiling is
 * stated in pixels per hex, a drag moves the world with the finger.
 */

const PHONE = { width: 390, height: 844 } as const;

describe('the camera', () => {
  it('fits an opening board at the pixel ceiling, centred', () => {
    const frame = frameFor(disc(1), PHONE.width, PHONE.height, 'flat');
    // Seven hexes fit easily, so the fit is capped at HEX_PX_MAX rather than
    // stretched to the viewport.
    expect(frame.fit.size).toBe(HEX_PX_MAX);
    const cam = fitCamera(frame);
    expect(cam.zoom).toBe(1);
    expect(cam.cx).toBeCloseTo(0, 5);
    expect(cam.cz).toBeCloseTo(0, 5);
  });

  it('clamps zoom between the floor and a ceiling that rises with the board', () => {
    const small = frameFor(disc(1), PHONE.width, PHONE.height, 'flat');
    const large = frameFor(disc(24), PHONE.width, PHONE.height, 'flat');
    expect(zoomMaxOf(small)).toBe(4);
    // A big board fits at a few pixels a hex, so 34px per hex is more than four
    // fits away — the ceiling rose. (Under ~25 hexes across, the fit is already
    // over 8.5px and the floor of 4 wins.)
    expect(zoomMaxOf(large)).toBeGreaterThan(4);
    expect(zoomedBy(small, fitCamera(small), 100).zoom).toBe(4);
    expect(zoomedBy(small, fitCamera(small), 0.0001).zoom).toBeLessThanOrEqual(1);
    expect(pxPerUnit(large, { zoom: zoomMaxOf(large), cx: 0, cz: 0 })).toBeCloseTo(HEX_PX_MAX, 6);
  });

  it('pans the world with the finger', () => {
    const frame = frameFor(disc(1), PHONE.width, PHONE.height, 'flat');
    const cam = fitCamera(frame);
    const dragged = pannedBy(frame, cam, 34, -68);
    // 34px right at 34px per hex: the centre moved one hex LEFT in world terms.
    expect(dragged.cx).toBeCloseTo(cam.cx - 1, 6);
    expect(dragged.cz).toBeCloseTo(cam.cz + 2, 6);
  });

  it('flies between two cameras with an ease that lands exactly', () => {
    const frame = frameFor(disc(3), PHONE.width, PHONE.height, 'pointy');
    const from = fitCamera(frame);
    const to = cameraAt(frame, 2, 3, -2);
    expect(lerpCamera(from, to, 0)).toEqual(from);
    expect(lerpCamera(from, to, 1)).toEqual(to);
    expect(lerpCamera(from, to, 2)).toEqual(to);
    const mid = lerpCamera(from, to, 0.5);
    expect(mid.zoom).toBeGreaterThan(from.zoom);
    expect(mid.zoom).toBeLessThan(to.zoom);
  });
});
