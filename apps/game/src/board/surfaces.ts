import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace, type Texture } from 'three';
import type { PaintOp } from '@render/paint';
import { bakePlan } from './bakeCanvas';

/**
 * Baked surfaces, kept (Stage 2c, 2026-08-29).
 *
 * A board is a few hundred hexes wearing about twenty distinct surfaces, so the
 * textures are cached by what they are rather than by which cell asked. Ashwake
 * 1 keyed its cache on `${orientation}:${round(size)}:${surfaceKey}` and needed
 * a guard test proving `surfaceKey` had not forgotten a field. Two of those
 * three axes are gone here:
 *
 * - **Size is gone.** A 2D renderer rebaked at every zoom level; a texture on a
 *   prism is baked once and the GPU scales it, which is also why mipmaps and
 *   anisotropy matter and did not before.
 * - **The key is derived**, not hand-listed — `planKey` is generated from the
 *   ops, so a field it forgot is not a thing that can happen.
 *
 * `flipY` is off and the colour space is sRGB, both deliberately: `prism.ts`
 * writes cap UVs in board axes with `v` unflipped, and flipping twice is how a
 * texture ends up mirrored and nobody notices until a glyph is baked into one.
 */

/** 256 is headroom: at the 34px-per-hex zoom ceiling on a dpr-2 phone a hex is
 *  at most 68 device pixels across, and mipmaps carry the rest of the way down. */
export const TEXTURE_PX = 256;

export class SurfaceTextures {
  readonly #cache = new Map<string, Texture | null>();
  readonly #px: number;
  #anisotropy = 1;

  constructor(px: number = TEXTURE_PX) {
    this.#px = px;
  }

  /** The renderer's cap, once known. Higher than 4 buys nothing at this size. */
  setAnisotropy(max: number): void {
    const wanted = Math.min(4, Math.max(1, Math.floor(max)));
    if (wanted === this.#anisotropy) return;
    this.#anisotropy = wanted;
    for (const texture of this.#cache.values()) {
      if (texture !== null) texture.anisotropy = wanted;
    }
  }

  /**
   * The texture for a plan, baked once. `art` is the direction's own bitmap for
   * this slot where it has loaded — part of the key's identity via the plan's
   * `art` op, so a field that gains its PNG gets a new texture rather than the
   * cached procedural one.
   */
  get(key: string, plan: readonly PaintOp[], art: CanvasImageSource | null): Texture | null {
    const found = this.#cache.get(key);
    if (found !== undefined) return found;

    const canvas = bakePlan(plan, this.#px, art);
    const texture = canvas === null ? null : new CanvasTexture(canvas);
    if (texture !== null) {
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = false;
      texture.anisotropy = this.#anisotropy;
      texture.generateMipmaps = true;
      texture.minFilter = LinearMipmapLinearFilter;
      texture.needsUpdate = true;
    }
    this.#cache.set(key, texture);
    return texture;
  }

  dispose(): void {
    for (const texture of this.#cache.values()) texture?.dispose();
    this.#cache.clear();
  }
}
