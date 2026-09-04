/**
 * The render scale a player can pick for themselves (2026-09-04, Marc, on a
 * phone: *"bad quality pixels"*).
 *
 * `Board.tsx` used to bake this into a module constant, one guess per phone:
 * dense screens (`devicePixelRatio > 2`, most current phones) got capped at
 * 1.5 device pixels per CSS pixel with antialiasing off, everything else got
 * 2. That guess is what looked soft on a dense phone — nobody had looked. The
 * antialias half of that decision cannot become a dial: it is a WebGL context
 * flag, fixed at canvas creation, and the canvas is never allowed to remount
 * (`CLAUDE.md`). The resolution half can, because `@react-three/fiber`
 * re-applies `dpr` with a call to `setPixelRatio` rather than a new context —
 * so this file is only ever the number, never the antialias choice, and the
 * slider that reads it lives beside the camera button, not in `Board.tsx`.
 *
 * `DEFAULT_RENDER_SCALE` reproduces the old guess exactly, so a device that
 * has never touched the slider renders exactly as it did before this landed.
 */

const DEVICE_DPR = typeof devicePixelRatio === 'number' ? devicePixelRatio : 2;

export const MIN_RENDER_SCALE = 1;

/** Past a phone's own pixel ratio there is nothing left to resolve; past 3
 *  there is nothing left worth the fragments on any phone. */
export const MAX_RENDER_SCALE = Math.min(3, Math.max(MIN_RENDER_SCALE, DEVICE_DPR));

export const DEFAULT_RENDER_SCALE =
  DEVICE_DPR > 2 ? 1.5 : Math.min(MAX_RENDER_SCALE, Math.min(2, DEVICE_DPR));

export function clampRenderScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_RENDER_SCALE;
  return Math.min(MAX_RENDER_SCALE, Math.max(MIN_RENDER_SCALE, value));
}
