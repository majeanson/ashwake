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

/** Degrees to radians. The board authors every angle in degrees — the dials,
 *  the lean, the yaw a label turns back by — and three wants radians, so this
 *  is the one place the conversion is written. It was written out by hand in
 *  three files (2026-09-02); a formula copied is a formula that can be copied
 *  wrong. */
export const rad = (deg: number): number => (deg * Math.PI) / 180;

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

/**
 * The camera moved just far enough to bring a world point back on screen.
 *
 * What the keyboard's marker rides on (2026-08-29). An arrow that walks the
 * marker off the edge of the viewport has moved something nobody can see, and
 * the two obvious fixes are both wrong: re-centring on every press makes the
 * board lurch under a player who is only looking around, and doing nothing
 * loses them the marker entirely. So the camera moves only when it has to, and
 * only by the amount it has to — the same rule a text editor scrolls by.
 *
 * `margin` is how far inside the viewport edge the point must end up, in CSS
 * pixels, so a marker never arrives half under the action bar.
 */
export function nudgeInto(
  frame: Frame,
  cam: CameraState,
  worldX: number,
  worldZ: number,
  margin: number,
): CameraState {
  const px = pxPerUnit(frame, cam);
  if (px <= 0) return cam;
  // `screenOf` is linear, so the difference of two of its answers is the
  // offset between them — no second projection needed.
  const at = screenOf(worldX, worldZ, 0, frame.lean);
  const centre = screenOf(cam.cx, cam.cz, 0, frame.lean);
  const ox = (at.sx - centre.sx) * px;
  const oy = (at.sy - centre.sy) * px;
  const halfW = Math.max(0, frame.width / 2 - margin);
  const halfH = Math.max(0, frame.height / 2 - margin);
  const over = (offset: number, half: number): number =>
    Math.abs(offset) <= half ? 0 : (Math.abs(offset) - half) * Math.sign(offset);
  const overX = over(ox, halfW);
  const overY = over(oy, halfH);
  if (overX === 0 && overY === 0) return cam;
  // A drag of the same size in the opposite direction: the point comes in by
  // exactly as much as it was out.
  return pannedBy(frame, cam, -overX, -overY);
}

/**
 * The fewest pixels a hex may be drawn at when the game frames the board on
 * the player's behalf.
 *
 * Marc, 2026-08-30: *"when pressing FLAT, FIT, etc. make sure we recenter the
 * map not too zoomed out."* FIT was zoom 1 by definition, and zoom 1 is
 * whatever it takes to get every hex on screen at once — which on a board
 * fifteen rings across is a hex the width of a fingernail. So the button that
 * hands the board back was the button that made it unreadable, and it got
 * worse the longer a run ran.
 *
 * `HEX_PX_MIN` (6) is the floor past which a board is dots; this is the floor
 * past which a board is not worth looking at. Between them is the range a
 * player may pinch to on purpose, which is theirs and untouched: this number
 * governs only the moves the game makes by itself.
 */
export const FIT_HEX_PX_MIN = 16;

/**
 * The camera that frames the board: as much of it as stays readable, centred.
 *
 * Zoom 1 is the whole structure, and it is the answer whenever the whole
 * structure is big enough to read. Past that the fit stops shrinking and
 * starts CROPPING, at the smallest hex worth drawing, and then the centre
 * matters: the middle of a grown board is mostly stone already spent.
 * `focus` is where the game is still being played. A caller that has one
 * hands it over, and it is read only in the cropped case, so a board that
 * fits whole is framed exactly as it always was.
 */
export function fitCamera(
  frame: Frame,
  focus?: { readonly cx: number; readonly cz: number },
): CameraState {
  if (frame.fit.size <= 0) return { zoom: 1, ...fitCentre(frame) };
  const readable = FIT_HEX_PX_MIN / frame.fit.size;
  const zoom = clamp(Math.max(1, readable), zoomMinOf(frame), zoomMaxOf(frame));
  const cropped = zoom > 1.0001;
  return { zoom, ...(cropped && focus !== undefined ? focus : fitCentre(frame)) };
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

/**
 * A flick, and where it carries to (Stage 2d, 2026-08-29).
 *
 * A drag that stops dead the instant a finger lifts feels like dragging a
 * sheet of paper across a table; a drag that carries feels like moving a
 * board. Ashwake 1 never had this because a 2D board redrew on every pan and
 * momentum would have meant redrawing all of it for half a second; here the
 * camera transforms and the board is untouched, so it costs a matrix a frame.
 *
 * Velocity is in world units per millisecond, measured over the last few
 * pointer moves rather than the last one — a single sample is dominated by
 * whatever jitter the last event carried, and reads as the board flying off
 * when a finger merely lifted crookedly.
 */

/** How fast a flick decays. Per millisecond, so it is frame-rate independent. */
export const GLIDE_DECAY = 0.0042;

/** Below this the glide is over — a pixel a second is a board that looks stuck. */
export const GLIDE_FLOOR = 0.0004;

/** A flick slower than this was a tap or a stop, not a throw. */
export const GLIDE_MIN = 0.0015;

export type Glide = {
  /** World units per millisecond. */
  readonly vx: number;
  readonly vz: number;
};

/** Whether a lift was a throw at all. */
export const isFlick = (glide: Glide): boolean => Math.hypot(glide.vx, glide.vz) >= GLIDE_MIN;

/**
 * The glide after `ms` of travel, and how far it carried.
 *
 * Exponential decay rather than a fixed number of frames, so a slow phone and
 * a fast one land the board in the same place.
 */
export function glided(
  glide: Glide,
  ms: number,
): { readonly next: Glide; readonly dx: number; readonly dz: number } {
  const keep = Math.exp(-GLIDE_DECAY * ms);
  // The integral of v·e^(-kt) over the step: the distance actually travelled,
  // not the velocity times the step, which would overshoot at low frame rates.
  const travelled = (1 - keep) / GLIDE_DECAY;
  return {
    next: { vx: glide.vx * keep, vz: glide.vz * keep },
    dx: glide.vx * travelled,
    dz: glide.vz * travelled,
  };
}

/** Has the glide come to rest? */
export const isResting = (glide: Glide): boolean => Math.hypot(glide.vx, glide.vz) < GLIDE_FLOOR;

/** The camera moved by a glide step — the world slides, so the centre goes
 *  the other way, exactly as a drag does. */
export const glidedBy = (cam: CameraState, dx: number, dz: number): CameraState => ({
  ...cam,
  cx: cam.cx - dx,
  cz: cam.cz - dz,
});

/* ---- the two-finger gesture ------------------------------------------------ */

/**
 * How far the camera may lean, and why there is a ceiling at all.
 *
 * Zero is the map. The ceiling is READABILITY, not a budget: a hex's colours
 * are the rig's and do not change with the camera — `render/materials.test.ts`
 * grades the top and the shaded side against the board whatever angle they are
 * seen from, so no camera can walk the board out of the contrast budget.
 *
 * What the angle changes is how much of each surface you are looking at, and
 * that is the argument for a limit. Past about here a prism shows more SIDE
 * than top, and the side carries the thinnest margin in the project — torchlit
 * clears the wall floor by 0.070, torchlit-bright by 0.072 — so a board laid
 * nearly flat is a board asking its weakest surface to do most of the work.
 * The far rows compress into each other at the same time, and a pocket three
 * hexes deep stops reading as three hexes.
 *
 * 55 rather than 60 because the number wants a margin of its own: it is a
 * ceiling chosen from arithmetic and it has not been looked at on a phone.
 */
export const TILT_MIN = 0;
export const TILT_MAX = 55;

export const clampTilt = (deg: number): number =>
  Math.min(TILT_MAX, Math.max(TILT_MIN, Number.isFinite(deg) ? deg : TILT_MIN));

/** Yaw is a circle: it wraps rather than clamping, so a turn never hits a wall. */
export const wrapYaw = (deg: number): number => {
  if (!Number.isFinite(deg)) return 0;
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
};

export type Finger = { readonly x: number; readonly y: number };

/**
 * What two fingers just did, as three independent numbers.
 *
 * The maps vocabulary, and the reason it is worth copying is that nobody has
 * to be taught it: pinch to zoom, twist to turn, drag up and down to lean.
 * All three ride the same two pointers at once — no modes, no third control,
 * no screen given up.
 *
 * Pure, and in this file rather than in the rig, for the reason the whole
 * `Lean` model is here: it is arithmetic that has to agree with the fit, the
 * pan and the raycast, and none of it needs a canvas to be wrong.
 *
 * **The tilt is read off the MIDPOINT, not off either finger.** A twist moves
 * both fingers vertically in opposite directions and their midpoint not at
 * all, so measuring one finger would read every rotation as a lean. Dragging
 * up leans the camera back, the way a map does — the hand pushes the horizon
 * away.
 */
export type TwoFinger = {
  /** Multiplier on the zoom: the distance between the fingers, then and now. */
  readonly scale: number;
  /** Degrees the pair rotated, signed, in (-180, 180]. */
  readonly turn: number;
  /** Degrees to add to the tilt. */
  readonly lean: number;
};

/** Pixels of midpoint travel per degree of tilt. Ashwake 1 had no equivalent;
 *  this is set so a comfortable thumb-length drag covers the whole range. */
const PX_PER_DEGREE = 4;

export function twoFinger(
  from: readonly [Finger, Finger],
  to: readonly [Finger, Finger],
): TwoFinger {
  const span = (p: readonly [Finger, Finger]): number =>
    Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  const angle = (p: readonly [Finger, Finger]): number =>
    (Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x) * 180) / Math.PI;
  const midY = (p: readonly [Finger, Finger]): number => (p[0].y + p[1].y) / 2;

  const was = span(from);
  const now = span(to);
  // A zero span is two fingers reported at one point — no scale can be read
  // from it, and 1 is the honest answer rather than an Infinity.
  const scale = was > 0 && now > 0 ? now / was : 1;

  let turn = angle(to) - angle(from);
  // The short way round. Without this a gesture crossing the ±180 seam spins
  // the board a full turn in one frame.
  if (turn > 180) turn -= 360;
  if (turn <= -180) turn += 360;

  return { scale, turn, lean: (midY(from) - midY(to)) / PX_PER_DEGREE };
}

/** Pixels of drag per degree of TURN, with a mouse. Looser than the lean's,
 *  because a yaw wraps and a tilt runs out: a full turn is a screen-and-a-half
 *  of drag, the whole lean a thumb's length. */
const PX_PER_TURN_DEGREE = 6;

/**
 * The desktop's second finger (2026-08-29).
 *
 * A mouse has one pointer, so the whole two-finger vocabulary — twist to turn,
 * drag to lean — was unreachable on a desktop: the board could be panned and
 * zoomed and never angled, and the only way back to a leaned board was the
 * VIEW button somebody else had left it at. The secondary button (and Shift,
 * for a trackpad that makes right-dragging awkward) is the button no browser
 * needs once the board eats its menu, and it carries both channels at once
 * exactly as two fingers do.
 *
 * No deadzone and no latch, unlike `twoFinger`: a mouse held down is actually
 * still, so there is no jitter to refuse and nothing to protect the other
 * channel from. Dragging up leans the camera back, the same way the fingers do.
 */
export const dragOrbit = (
  dx: number,
  dy: number,
): { readonly turn: number; readonly lean: number } => ({
  turn: dx / PX_PER_TURN_DEGREE,
  lean: -dy / PX_PER_DEGREE,
});

/**
 * The deadzones, and why a gesture LATCHES.
 *
 * Two fingers are never perfectly still: a pinch rotates a degree or two and
 * drifts a few pixels, and applying all three every frame makes the board
 * wobble under a gesture that meant only one of them. So each channel has to
 * be asked for before it engages — and once engaged it stays engaged for the
 * rest of the gesture, because a threshold re-tested every frame is a channel
 * that stutters in and out exactly when a player slows down to be precise.
 */
export const TURN_DEADZONE = 8;
export const LEAN_DEADZONE = 3;
export const ZOOM_DEADZONE = 0.06;

/**
 * How far a finger may travel and still have meant a TAP.
 *
 * One number, in one place: it was the literal `8` in `Board.tsx`'s pan slop
 * and again in `HexField.tsx`'s click filter, which is two chances to change
 * one idea and only remember once.
 *
 * **Five rather than eight since 2026-08-29** (Marc: "try to be less sensitive
 * on tile placement vs drag & pinch"). Placement is the only gesture on this
 * board that cannot be undone — a tile placed is a tile spent — while a pan
 * that starts three pixels late costs nothing anybody can feel. So the tie
 * goes to the drag, and the number is set where a deliberate thumb-press still
 * reads as still and a thumb that has begun to travel does not.
 *
 * It is a FEEL number and has not been felt on a phone.
 */
export const TAP_SLOP = 5;
