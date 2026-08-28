import type { Hex } from '@engine/hex';
import { clamp, fitLayout, zoomCeiling, zoomFloor, type Layout } from '@render/layout';
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
  readonly width: number;
  readonly height: number;
};

/** The frame that shows every anchored cell (never a beacon). */
export function frameFor(
  cells: readonly Hex[],
  width: number,
  height: number,
  orientation: Orientation,
): Frame {
  const fit = fitLayout(cells, width, height, FIT_PADDING, orientation, HEX_PX_MAX);
  return { fit, width, height };
}

/** The world point the fit puts at the viewport centre. */
export function fitCentre(frame: Frame): { readonly cx: number; readonly cz: number } {
  const { fit, width, height } = frame;
  if (fit.size <= 0) return { cx: 0, cz: 0 };
  return { cx: (width / 2 - fit.originX) / fit.size, cz: (height / 2 - fit.originY) / fit.size };
}

export const zoomMaxOf = (frame: Frame): number =>
  zoomCeiling(frame.fit.size, ZOOM_MAX, HEX_PX_MAX);
export const zoomMinOf = (frame: Frame): number => zoomFloor(frame.fit.size, ZOOM_MIN, HEX_PX_MIN);

/** CSS pixels per world unit at this camera. */
export const pxPerUnit = (frame: Frame, cam: CameraState): number => frame.fit.size * cam.zoom;

export function zoomedBy(frame: Frame, cam: CameraState, factor: number): CameraState {
  const zoom = clamp(cam.zoom * factor, zoomMinOf(frame), zoomMaxOf(frame));
  return { ...cam, zoom };
}

/** A drag: the world moves WITH the finger, so the centre moves against it. */
export function pannedBy(frame: Frame, cam: CameraState, dx: number, dy: number): CameraState {
  const px = pxPerUnit(frame, cam);
  if (px <= 0) return cam;
  return { ...cam, cx: cam.cx - dx / px, cz: cam.cz - dy / px };
}

/** The camera that frames everything: zoom 1, centred on the fit. */
export function fitCamera(frame: Frame): CameraState {
  return { zoom: 1, ...fitCentre(frame) };
}

/** Centred on a hex at a zoom, clamped like every other move. */
export function cameraAt(frame: Frame, zoom: number, worldX: number, worldZ: number): CameraState {
  return { zoom: clamp(zoom, zoomMinOf(frame), zoomMaxOf(frame)), cx: worldX, cz: worldZ };
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
