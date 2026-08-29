import { describe, expect, it } from 'vitest';
import { disc } from '@engine/hex';
import { corners, place } from '@render/layout';
import {
  cameraAt,
  clampTilt,
  eyeOf,
  fitCamera,
  FLAT,
  frameFor,
  HEX_PX_MAX,
  lerpCamera,
  pannedBy,
  pxPerUnit,
  screenOf,
  TILT_MAX,
  TILT_MIN,
  twoFinger,
  wrapYaw,
  zoomMaxOf,
  zoomedBy,
  type Finger,
  type Frame,
  type Lean,
} from './camera';

const UNIT = { size: 1, originX: 0, originY: 0, orientation: 'pointy' } as const;

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

/**
 * The lean (Stage 2b): the camera leans back and the board turns under it.
 * Every one of these is a way the contract could quietly break at an angle —
 * a cropped far edge, a drag that no longer follows the thumb, a board that
 * fits the map and not the picture.
 */
describe('the lean', () => {
  const TILTS: readonly Lean[] = [
    { tilt: 35, yaw: 0, tallest: 0.7 },
    { tilt: 45, yaw: 0, tallest: 0.7 },
    { tilt: 35, yaw: 45, tallest: 1.2 },
    { tilt: 55, yaw: 30, tallest: 1.2 },
  ];

  /** Where a world point lands on screen, in CSS pixels from the top left. */
  function pixelOf(frame: Frame, x: number, z: number, h: number): { x: number; y: number } {
    const cam = fitCamera(frame);
    const px = pxPerUnit(frame, cam);
    const centre = screenOf(cam.cx, cam.cz, 0, frame.lean);
    const point = screenOf(x, z, h, frame.lean);
    return {
      x: frame.width / 2 + (point.sx - centre.sx) * px,
      y: frame.height / 2 + (point.sy - centre.sy) * px,
    };
  }

  it('stands the eye where the angle says, straight down included', () => {
    // Straight down: above the board, with the board's own −z as up. This is
    // the case that used to need its own branch, because a camera looking
    // along its up vector has no orientation at all.
    const top = eyeOf(FLAT, 200);
    expect([top.x, top.y, top.z]).toEqual([0, 200, 0]);
    expect(top.upX).toBeCloseTo(0, 12);
    expect(top.upY).toBeCloseTo(0, 12);
    expect(top.upZ).toBeCloseTo(-1, 12);

    // Flat on: level with the board, with the world's up as up.
    const side = eyeOf({ tilt: 90, yaw: 0, tallest: 0 }, 200);
    expect(side.y).toBeCloseTo(0, 9);
    expect(side.z).toBeCloseTo(200, 9);
    expect(side.upY).toBeCloseTo(1, 12);

    // Turned a quarter turn from overhead: the board's −x is up the screen.
    const turned = eyeOf({ tilt: 0, yaw: 90, tallest: 0 }, 200);
    expect(turned.y).toBeCloseTo(200, 9);
    expect(turned.upX).toBeCloseTo(-1, 12);
    expect(turned.upZ).toBeCloseTo(0, 12);

    // The eye is always `distance` away, whatever the angle.
    for (const lean of TILTS) {
      const eye = eyeOf(lean, 200);
      expect(Math.hypot(eye.x, eye.y, eye.z)).toBeCloseTo(200, 9);
      expect(Math.hypot(eye.upX, eye.upY, eye.upZ)).toBeCloseTo(1, 12);
    }
  });

  it('keeps the whole board on screen at every angle, walls and all', () => {
    for (const lean of TILTS) {
      const cells = disc(4);
      const frame = frameFor(cells, PHONE.width, PHONE.height, 'pointy', lean);
      expect(frame.fit.size).toBeGreaterThan(0);
      for (const cell of cells) {
        // Six corners, at the floor and at the top of the tallest thing that
        // could stand there — the fit reserves sky for all of it.
        const c = place(cell, UNIT);
        const pts = corners(c.x, c.y, 1, 'pointy');
        for (let i = 0; i + 1 < pts.length; i += 2) {
          for (const h of [0, lean.tallest]) {
            const p = pixelOf(frame, pts[i]!, pts[i + 1]!, h);
            expect(p.x).toBeGreaterThanOrEqual(-0.001);
            expect(p.x).toBeLessThanOrEqual(PHONE.width + 0.001);
            expect(p.y).toBeGreaterThanOrEqual(-0.001);
            expect(p.y).toBeLessThanOrEqual(PHONE.height + 0.001);
          }
        }
      }
    }
  });

  it('gives back room the taller the board stands', () => {
    // A wide viewport, so height is what binds and the sky the walls need is
    // paid for out of the fit rather than out of the padding.
    const short = frameFor(disc(6), 2000, 400, 'pointy', { tilt: 45, yaw: 0, tallest: 0 });
    const tall = frameFor(disc(6), 2000, 400, 'pointy', { tilt: 45, yaw: 0, tallest: 4 });
    expect(tall.fit.size).toBeLessThan(short.fit.size);
  });

  it('drags with the thumb after the board has been turned', () => {
    const flat = frameFor(disc(1), PHONE.width, PHONE.height, 'pointy');
    const cam = { zoom: 1, cx: 0, cz: 0 };
    // Straight down, a drag right moves the centre one hex left in world x.
    expect(pannedBy(flat, cam, HEX_PX_MAX, 0).cx).toBeCloseTo(-1, 6);

    // Turned a quarter turn, that same drag moves it along z instead: the
    // finger still pushes the board the way it points.
    const turned = frameFor(disc(1), PHONE.width, PHONE.height, 'pointy', {
      tilt: 0,
      yaw: 90,
      tallest: 0,
    });
    const sideways = pannedBy(turned, cam, pxPerUnit(turned, cam), 0);
    expect(sideways.cx).toBeCloseTo(0, 6);
    expect(sideways.cz).toBeCloseTo(1, 6);
  });

  it('drags further up a foreshortened board, because the screen is shorter', () => {
    const lean: Lean = { tilt: 60, yaw: 0, tallest: 0 };
    const frame = frameFor(disc(1), PHONE.width, PHONE.height, 'pointy', lean);
    const cam = fitCamera(frame);
    const px = pxPerUnit(frame, cam);
    // At 60° the board is half as tall on screen, so a drag of one hex's worth
    // of pixels has to cover two hexes of board — anything else creeps.
    expect(pannedBy(frame, cam, 0, px).cz).toBeCloseTo(cam.cz - 2, 6);
  });

  it('is exactly the old map at zero, by the old code path', () => {
    const before = frameFor(disc(3), PHONE.width, PHONE.height, 'pointy');
    const flat = frameFor(disc(3), PHONE.width, PHONE.height, 'pointy', FLAT);
    expect(flat.fit).toEqual(before.fit);
    expect(fitCamera(flat)).toEqual(fitCamera(before));
  });
});

describe('two fingers', () => {
  const at = (ax: number, ay: number, bx: number, by: number): [Finger, Finger] => [
    { x: ax, y: ay },
    { x: bx, y: by },
  ];

  it('reads a pinch as a scale and nothing else', () => {
    // Same midpoint, same angle, twice the span.
    const g = twoFinger(at(90, 100, 110, 100), at(80, 100, 120, 100));
    expect(g.scale).toBeCloseTo(2, 5);
    expect(g.turn).toBeCloseTo(0, 5);
    expect(g.lean).toBeCloseTo(0, 5);
  });

  it('reads a twist as a turn and nothing else', () => {
    // A quarter turn about the midpoint: the span and the midpoint are both
    // untouched, so neither the zoom nor the lean may move.
    const g = twoFinger(at(90, 100, 110, 100), at(100, 90, 100, 110));
    expect(g.turn).toBeCloseTo(90, 5);
    expect(g.scale).toBeCloseTo(1, 5);
    expect(g.lean).toBeCloseTo(0, 5);
  });

  it('reads a two-finger drag as a lean, and up leans BACK', () => {
    // Both fingers up by 40px: the midpoint rises, the span and angle hold.
    const g = twoFinger(at(90, 200, 110, 200), at(90, 160, 110, 160));
    expect(g.lean).toBeGreaterThan(0);
    expect(g.scale).toBeCloseTo(1, 5);
    expect(g.turn).toBeCloseTo(0, 5);
    // And down leans forward again, by the same amount.
    const back = twoFinger(at(90, 160, 110, 160), at(90, 200, 110, 200));
    expect(back.lean).toBeCloseTo(-g.lean, 5);
  });

  it('measures the lean off the MIDPOINT, so a twist is not a lean', () => {
    // The failure this guards: a twist moves each finger vertically, hard, in
    // opposite directions. Reading either one alone would report a big lean
    // for a gesture that meant a turn.
    const g = twoFinger(at(90, 100, 110, 100), at(100, 60, 100, 140));
    expect(Math.abs(g.turn)).toBeGreaterThan(45);
    expect(g.lean).toBeCloseTo(0, 5);
  });

  it('turns the SHORT way across the seam', () => {
    // atan2 flips sign at ±180. Without the wrap this reads as a full spin in
    // a single frame — the board snapping round under two barely-moved fingers.
    const g = twoFinger(at(0, 0, -100, -1), at(0, 0, -100, 1));
    expect(Math.abs(g.turn)).toBeLessThan(5);
  });

  it('answers 1 rather than Infinity for two fingers at one point', () => {
    const g = twoFinger(at(50, 50, 50, 50), at(50, 50, 60, 50));
    expect(g.scale).toBe(1);
    expect(Number.isFinite(g.lean)).toBe(true);
  });
});

describe('the lean, bounded', () => {
  it('keeps the tilt inside the range the material budget was graded at', () => {
    expect(clampTilt(-20)).toBe(TILT_MIN);
    expect(clampTilt(999)).toBe(TILT_MAX);
    expect(clampTilt(35)).toBe(35);
    // A NaN out of a degenerate gesture must not become the camera's angle.
    expect(clampTilt(Number.NaN)).toBe(TILT_MIN);
  });

  it('wraps the yaw rather than stopping it', () => {
    // A turn has no ends: a player spinning the board past north keeps going.
    expect(wrapYaw(0)).toBe(0);
    expect(wrapYaw(370)).toBeCloseTo(10, 5);
    expect(wrapYaw(-10)).toBeCloseTo(350, 5);
    expect(wrapYaw(Number.NaN)).toBe(0);
  });
});
