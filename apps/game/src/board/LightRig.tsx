import type { Rig } from '@theme/rig';

/**
 * The lights, built from the rig the budget test measures (Stage 2c,
 * 2026-08-29).
 *
 * There is nothing here to decide. `theme/rig.ts` says what the lighting IS —
 * an ambient level and a list of directions and intensities, normalised so a
 * face pointing up is exposed at exactly 1 — and this component is the two
 * dozen characters that turn that into three.js objects. That is deliberate:
 * the moment a light is authored here instead, the board renders something the
 * core cannot predict and `render/materials.test.ts` is measuring fiction.
 *
 * **The rig turns with the camera.** The board is fixed in world space and the
 * camera orbits it by `yaw`, so the lights ride the same rotation — the lit
 * faces stay the lit faces when the board is turned, a turned board is not
 * suddenly darker, and the budget does not have to quantify over the yaw.
 */

/** Far enough that it reads as a direction. Only the direction is used. */
const DISTANCE = 100;

export type LightRigProps = {
  readonly rig: Rig;
  /** Degrees the board is turned under the camera. */
  readonly yaw: number;
};

export function LightRig({ rig, yaw }: LightRigProps) {
  return (
    <group rotation={[0, (yaw * Math.PI) / 180, 0]}>
      <ambientLight intensity={rig.ambient} />
      {rig.lights.map((light, i) => (
        <directionalLight
          // The rig is a fixed-length list per strength, so the index is a
          // stable identity here rather than the usual React smell.
          key={i}
          position={[light.dir[0] * DISTANCE, light.dir[1] * DISTANCE, light.dir[2] * DISTANCE]}
          intensity={light.intensity}
        />
      ))}
    </group>
  );
}
