import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';
import type { IconName } from '@theme/icons';
import { ICON_PATH } from '../ui/icons.gen';

/**
 * A mark the board draws on a hex, as a texture (2026-08-30).
 *
 * Marc: *"no emojis only phosphor icons or assets."* The board printed its
 * marks — `✚ ★ ◈ ❖ ✦ ▦` — as troika TEXT in `cinzel.ttf`, a font this project
 * ships for a wordmark. Whether a wordmark face answers for a heavy cross or a
 * four-point sparkle is a question nobody asked it, and the answer differs by
 * glyph: the marks that rendered did so because Cinzel happens to carry them,
 * and a font subset or a swap would have taken them away silently.
 *
 * An icon is a path, so it is drawn rather than requested. `Path2D` reads the
 * vendored SVG data directly, which is why this is a dozen lines and not a
 * mesh pipeline — and the result is a plane with a texture, which is what the
 * board already draws every other flat thing with.
 *
 * **Cached by everything that changes it**, which is the icon and its two
 * inks. That is at most a handful of textures for a whole session — five
 * destinations in two inks plus a wall — so they are held rather than
 * disposed, the same call `glow.ts` makes for the same reason.
 */

/** Texels per mark. A mark is drawn at about a third of a hex and a hex tops
 *  out at 34 CSS pixels, so 128 is already generous at 2× device pixels. */
const PX = 128;

/** How much of the box the mark fills, leaving room for its own halo. */
const INSET = 0.14;

/**
 * The halo, in texels.
 *
 * The same job `outlineWidth` does for a number: a mark sits on ground whose
 * colour it does not choose, and the palette grades ink against the PANEL
 * rather than against every terrain. A traced outline in the theme's halo
 * colour is what makes one mark legible on four grounds, and it is why the
 * numbers have carried one since Stage 2.
 */
const HALO = PX * 0.055;

const cache = new Map<string, Texture>();

/**
 * The renderer's anisotropy, shared by every mark (2026-09-05).
 *
 * A mark is a texture on a plane lying flat on the ground, so tilting the board
 * squashes its footprint in one screen axis and leaves the other alone — the
 * same shape of sampling problem the GROUND has, and `surfaces.ts` says so in
 * its own opening ("a texture on a prism ... which is also why mipmaps and
 * anisotropy matter and did not before"). It has carried the renderer's cap
 * since 2026-09-02; this file was written beside it and never took the same
 * line, so every mark on the board sampled at anisotropy 1.
 *
 * **This is sharpness, and it is NOT what made a tilted shrine look grey.**
 * That was a transparent sort — see `MARK_ORDER` in `Labels.tsx`, which is the
 * fix — and this was written first, while that was still the hypothesis. It is
 * kept because it is right on its own terms and measured live (this renderer
 * reports 16), not because it fixed the bug: with it in and the sort still
 * wrong, the mark was exactly as grey as before.
 */
let anisotropy = 1;

/**
 * The renderer's cap, once known — called from `HexField` beside the same call
 * for the ground, because `gl.capabilities` is only knowable inside the canvas.
 *
 * Capped at 4 for the reason `surfaces.ts` caps it: a mark is about a hundred
 * device pixels across at the zoom ceiling and higher buys nothing. And
 * `needsUpdate` for the reason `surfaces.ts` learned the hard way — anisotropy
 * is a sampler parameter, three only re-applies those when a texture's version
 * moves, so setting it on an already-uploaded texture without saying so does
 * nothing at all.
 */
export function setMarkAnisotropy(max: number): void {
  const wanted = Math.min(4, Math.max(1, Math.floor(max)));
  if (wanted === anisotropy) return;
  anisotropy = wanted;
  for (const texture of cache.values()) {
    texture.anisotropy = wanted;
    texture.needsUpdate = true;
  }
}

/**
 * One mark, inked and haloed, or null where this browser gives no 2D context
 * or no `Path2D`.
 *
 * Null is a board that draws no mark rather than a board that throws: the
 * destination still stands there as a prop and the hex is still tappable,
 * which is the same bargain `glowTexture` makes.
 */
export function markTexture(icon: IconName, ink: string, halo: string): Texture | null {
  const key = `${icon}|${ink}|${halo}`;
  const held = cache.get(key);
  if (held !== undefined) return held;

  if (typeof Path2D === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = PX;
  canvas.height = PX;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;

  // Phosphor draws in a 256 box; this one is PX, inset so the halo has room.
  const scale = (PX * (1 - INSET * 2)) / 256;
  ctx.translate(PX * INSET, PX * INSET);
  ctx.scale(scale, scale);

  const path = new Path2D(ICON_PATH[icon]);
  // The halo first and UNDER the fill: stroking after would eat into the
  // shape, which is the same reason the draft card's label haloes with four
  // offset shadows rather than with a centred stroke.
  ctx.lineWidth = HALO / scale;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = halo;
  ctx.stroke(path);
  ctx.fillStyle = ink;
  ctx.fill(path);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.needsUpdate = true;
  cache.set(key, texture);
  return texture;
}
