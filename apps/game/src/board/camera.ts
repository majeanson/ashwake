import type { Hex } from '@engine/hex';
import {
  clamp,
  corners,
  fitLayout,
  place,
  zoomCeiling,
  zoomFloor,
  type Layout,
} from '@render/layout';
import type { Orientation } from '@theme/tokens';

/**
 * The camera's arithmetic, kept apart from three.js so it can be tested
 * without a canvas (Stage 2, 2026-08-28).
 *
 * The contract is Ashwake 1's `Renderer` camera, carried over whole: zoom
 * multiplies and is clamped so 1 is always the auto-fit; pan slides by screen
 * pixels; FIT returns to the frame that shows everything; the zoom ceiling is
 * stated in pixels-per-hex, so it RISES as the board grows rather than being a
 * fixed multiple of a shrinking fit. World units are hex radii: a hex has
 * circumradius 1 in the scene, and `fit.size` is how many CSS pixels one of
 * those is worth at zoom 1.
 *
 * The LEAN is Stage 2b's addition (2026-08-28): the camera may lean back
 * (`tilt`) and the board may be turned under it (`yaw`). Both live here rather
 * than in the rig because both change arithmetic the contract depends on —
 * what fits, and where a finger drags to — and neither needs a canvas to be
 * wrong. `FLAT` is the map the board shipped as, and the flat case is still
 * computed by exactly the code it always was.
 */

/** The most pixels a hex may be drawn at — the zoom ceiling, in the unit the
 *  eye actually cares about. Ashwake 1's number. */
export const HEX_PX_MAX = 34;
/** The fewest, past which a board is dots. */
export const HEX_PX_MIN = 6;
export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;
/** Room between the structure and the edge of the viewport, in CSS pixels. */
export const FIT_PADDING = 16;

/** Where the eye stands, and which way the board is turned under it. */
export type Lean = {
  /** Degrees back from straight down. 0 is the map; 35 is Marc's pick. */
  readonly tilt: number;
  /** Degrees the board is turned about the point the camera looks at. */
  readonly yaw: number;
  /**
   * The tallest top on the board, in hex radii. A leaned camera trades board
   * for sky: everything standing on the ground leans INTO the top of the
   * frame, so the fit has to know how tall the tallest thing is, or the far
   * edge of the board is cropped by its own walls.
   */
  readonly tallest: number;
};

/** The board as a map, seen from straight above: what Stage 2 shipped. */
export const FLAT: Lean = { tilt: 0, yaw: 0, tallest: 0 };

export const isFlat = (lean: Lean): boolean => lean.tilt === 0 && lean.yaw === 0;

export type CameraState = {
  /** Multiplier over the fit; 1 is the fit. */
  readonly zoom: number;
  /** Where the viewport centre sits in world units (hex radii), x and z. */
  readonly cx: number;
  readonly cz: number;
};

export type Frame = {
  /** The fit for this board in this viewport. */
  readonly fit: Layout;
  /** The world point the fit puts at the viewport centre. */
  readonly centre: { readonly cx: number; readonly cz: number };
  readonly width: number;
  readonly height: number;
  readonly lean: Lean;
};

const rad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Board plane to screen, at one pixel a unit.
 *
 * The screen's RIGHT axis is the board turned by `yaw`; the screen's DOWN axis
 * is the board's other axis, foreshortened by the tilt; and height climbs the
 * screen by sin(tilt). Every extent, every centre and every drag below is this
 * one mapping, forwards or backwards.
 */
export function screenOf(
  x: number,
  z: number,
  h: number,
  lean: Lean,
): { readonly sx: number; readonly sy: number } {
  const t = rad(lean.tilt);
  const y = rad(lean.yaw);
  return {
    sx: x * Math.cos(y) - z * Math.sin(y),
    sy: (x * Math.sin(y) + z * Math.cos(y)) * Math.cos(t) - h * Math.sin(t),
  };
}

/** The inverse, on the ground plane (h = 0). */
function toBoard(sx: number, sy: number, lean: Lean): { readonly x: number; readonly z: number } {
  const t = rad(lean.tilt);
  const y = rad(lean.yaw);
  const b = sy / Math.cos(t);
  return { x: sx * Math.cos(y) + b * Math.sin(y), z: -sx * Math.sin(y) + b * Math.cos(y) };
}

/**
 * How far one hex reaches past its own centre along each screen axis.
 *
 * A hex is not a circle: turned by a yaw it is anywhere between root-3-over-2
 * and 1 wide. Measuring its six actual corners keeps a turned board as big on
 * screen as it deserves to be, instead of fitting every angle to the worst one.
 */
function hexReach(
  orientation: Orientation,
  lean: Lean,
): { readonly a: number; readonly b: number } {
  const pts = corners(0, 0, 1, orientation);
  let a = 0;
  let b = 0;
  for (let i = 0; i + 1 < pts.length; i += 2) {
    const s = screenOf(pts[i]!, pts[i + 1]!, 0, lean);
    a = Math.max(a, Math.abs(s.sx));
    b = Math.max(b, Math.abs(s.sy));
  }
  return { a, b };
}

/** The frame that shows every anchored cell (never a beacon). */
export function frameFor(
  cells: readonly Hex[],
  width: number,
  height: number,
  orientation: Orientation,
  lean: Lean = FLAT,
): Frame {
  if (isFlat(lean)) {
    const fit = fitLayout(cells, width, height, FIT_PADDING, orientation, HEX_PX_MAX);
    const centre =
      fit.size <= 0
        ? { cx: 0, cz: 0 }
        : { cx: (width / 2 - fit.originX) / fit.size, cz: (height / 2 - fit.originY) / fit.size };
    return { fit, centre, width, height, lean };
  }

  if (cells.length === 0) {
    return {
      fit: { size: 0, originX: width / 2, originY: height / 2, orientation },
      centre: { cx: 0, cz: 0 },
      width,
      height,
      lean,
    };
  }

  const layout: Layout = { size: 1, originX: 0, originY: 0, orientation };
  const reach = hexReach(orientation, lean);
  const sky = lean.tallest * Math.sin(rad(lean.tilt));
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const cell of cells) {
    const p = place(cell, layout);
    const s = screenOf(p.x, p.y, 0, lean);
    minX = Math.min(minX, s.sx - reach.a);
    maxX = Math.max(maxX, s.sx + reach.a);
    // The bottom edge of a hex is ground; its top edge is whatever stands on
    // it, leaning back toward the sky.
    minY = Math.min(minY, s.sy - reach.b - sky);
    maxY = Math.max(maxY, s.sy + reach.b);
  }

  const availW = Math.max(0, width - FIT_PADDING * 2);
  const availH = Math.max(0, height - FIT_PADDING * 2);
  const size = Math.min(HEX_PX_MAX, availW / (maxX - minX), availH / (maxY - minY));
  const centre = toBoard((minX + maxX) / 2, (minY + maxY) / 2, lean);

  return {
    // `originX/Y` keep their flat meaning — where world zero lands on screen —
    // so anything that reads them reads the map, never the lean.
    fit: { size, originX: width / 2, originY: height / 2, orientation },
    centre: { cx: centre.x, cz: centre.z },
    width,
    height,
    lean,
  };
}

/** The world point the fit puts at the viewport centre. */
export const fitCentre = (frame: Frame): { readonly cx: number; readonly cz: number } =>
  frame.centre;

export const zoomMaxOf = (frame: Frame): number =>
  zoomCeiling(frame.fit.size, ZOOM_MAX, HEX_PX_MAX);
export const zoomMinOf = (frame: Frame): number => zoomFloor(frame.fit.size, ZOOM_MIN, HEX_PX_MIN);

/** CSS pixels per world unit at this camera. */
export const pxPerUnit = (frame: Frame, cam: CameraState): number => frame.fit.size * cam.zoom;

export function zoomedBy(frame: Frame, cam: CameraState, factor: number): CameraState {
  const zoom = clamp(cam.zoom * factor, zoomMinOf(frame), zoomMaxOf(frame));
  return { ...cam, zoom };
}

/**
 * A drag: the world moves WITH the finger, so the centre moves against it.
 *
 * Under a lean, "with the finger" stops being "along x and z": the drag is
 * undone through the same screen mapping the fit used, so a board turned 45
 * degrees still slides the way the thumb pushed it, and a tilted one does not
 * creep faster than the finger.
 */
export function pannedBy(frame: Frame, cam: CameraState, dx: number, dy: number): CameraState {
  const px = pxPerUnit(frame, cam);
  if (px <= 0) return cam;
  const moved = toBoard(dx / px, dy / px, frame.lean);
  return { ...cam, cx: cam.cx - moved.x, cz: cam.cz - moved.z };
}

/** The camera that frames everything: zoom 1, centred on the fit. */
export function fitCamera(frame: Frame): CameraState {
  return { zoom: 1, ...fitCentre(frame) };
}

/** Centred on a hex at a zoom, clamped like every other move. */
export function cameraAt(frame: Frame, zoom: number, worldX: number, worldZ: number): CameraState {
  return { zoom: clamp(zoom, zoomMinOf(frame), zoomMaxOf(frame)), cx: worldX, cz: worldZ };
}

export type Eye = {
  /** Offset from the point the camera looks at, in world units. */
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Which way is up for that eye, as a unit vector. */
  readonly upX: number;
  readonly upY: number;
  readonly upZ: number;
};

/**
 * Where the eye stands, and which way is up for it.
 *
 * One expression for every angle including straight down — the case that used
 * to need its own branch in the rig, because a camera looking along its own up
 * vector has no orientation at all. At tilt 0 the offset is straight up and up
 * is the board's own −z, which is exactly the map the board shipped as.
 */
export function eyeOf(lean: Lean, distance: number): Eye {
  const t = rad(lean.tilt);
  const y = rad(lean.yaw);
  return {
    x: Math.sin(t) * Math.sin(y) * distance,
    y: Math.cos(t) * distance,
    z: Math.sin(t) * Math.cos(y) * distance,
    upX: -Math.cos(t) * Math.sin(y),
    upY: Math.sin(t),
    upZ: -Math.cos(t) * Math.cos(y),
  };
}

/** Ease-out, for the flights the game makes on the player's behalf. */
export const easeOut = (t: number): number => 1 - (1 - t) * (1 - t);

export function lerpCamera(from: CameraState, to: CameraState, t: number): CameraState {
  const k = easeOut(clamp(t, 0, 1));
  return {
    zoom: from.zoom + (to.zoom - from.zoom) * k,
    cx: from.cx + (to.cx - from.cx) * k,
    cz: from.cz + (to.cz - from.cz) * k,
  };
}
