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
  texture.needsUpdate = true;
  cache.set(key, texture);
  return texture;
}
