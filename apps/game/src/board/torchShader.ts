import type { Material } from 'three';

/**
 * The torch, on the GPU (Stage 2c, 2026-08-29).
 *
 * `@theme/torch`'s `cellTint` says what tint a cell wears and `torched` says
 * what applying it means: a per-channel multiply **in display space**, because
 * that is what Pixi's sprite tint did and what `theme.light.floor` and
 * `MIN_LIT_FIELD_LIFT` were graded against.
 *
 * `instanceColor` cannot do that on its own. three multiplies it into the
 * albedo in the LINEAR working space (`color_fragment` is `diffuseColor *=
 * vColor`), and a linear multiply by 0.42 is about a display multiply by 0.70 —
 * a materially brighter board than the thresholds were set for. With a texture
 * on the face you cannot pre-compensate per instance either, because the
 * correction would depend on the texel.
 *
 * So one chunk is replaced: decode the albedo to display space, multiply by the
 * tint there, encode back. Two `pow` per ground fragment, paid for several
 * times over by the GGX lobe that left with `meshStandardMaterial`.
 *
 * Three facts this leans on, all verified against three r183 rather than
 * assumed:
 *
 * - `sRGBTransferOETF` / `sRGBTransferEOTF` are injected into every fragment
 *   shader by `WebGLProgram` (line 774), so they need no import.
 * - `USE_COLOR` — and therefore `vColor` — is defined whenever instancing
 *   colour is on, not only when `material.vertexColors` is (line 735).
 * - `map_fragment` runs before `color_fragment`, so by the time this replaces
 *   it the albedo already carries the baked surface.
 *
 * `customProgramCacheKey` is shared, so all ~20 ground materials compile one
 * program between them rather than one each.
 */

const CHUNK = /* glsl */ `
  diffuseColor.rgb = sRGBTransferEOTF(
    vec4( sRGBTransferOETF( vec4( diffuseColor.rgb, 1.0 ) ).rgb * vColor.rgb, 1.0 )
  ).rgb;
`;

const CACHE_KEY = 'ashwake:torch';

/** Make this material apply its instance tint the way the palette was graded. */
export function withTorch<T extends Material>(material: T): T {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', CHUNK);
  };
  material.customProgramCacheKey = () => CACHE_KEY;
  return material;
}
