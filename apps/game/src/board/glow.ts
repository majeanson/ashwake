import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';

/**
 * The pop's light pool, as a texture (Stage 2d, 2026-08-29).
 *
 * One soft white disc, generated rather than shipped: it is a radial gradient,
 * a PNG of it would be bytes spent on something four lines of canvas describe
 * exactly, and every direction tints the same white disc to its own
 * `motion.popColour` rather than needing one each.
 *
 * White and colour-neutral on purpose. The material is ADDITIVE, so the tint
 * is a multiply and a dark tint is the same as a dim one — which is what lets a
 * per-instance colour carry the fade with no transparency, no sorting and no
 * shader.
 */

const PX = 128;

let cached: Texture | null = null;

export function glowTexture(): Texture | null {
  if (cached !== null) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = PX;
  canvas.height = PX;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;

  const gradient = ctx.createRadialGradient(PX / 2, PX / 2, 0, PX / 2, PX / 2, PX / 2);
  // A hot centre that stays hot for a third of the radius, then falls away —
  // a flat linear ramp reads as a smudge rather than as light.
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, PX, PX);

  cached = new CanvasTexture(canvas);
  cached.colorSpace = SRGBColorSpace;
  cached.needsUpdate = true;
  return cached;
}
