import type { Motion } from '@theme/tokens';

/**
 * The board when nobody is touching it (Stage 2d, 2026-08-29).
 *
 * Three things breathe: a beacon, an ember, and the torch. All three are pure
 * functions of a clock here, so what they look like can be argued with in a
 * test rather than only in a screenshot, and so the reduced-motion path is a
 * branch at the CALL SITE rather than a second implementation.
 */

/** How long one beacon breath takes. Ashwake 1's number. */
export const BREATH_MS = 2600;

/**
 * A beacon's brightness, 0..1 of its peak.
 *
 * Floored well above zero on purpose: *dim, never dark — a lighthouse in fog,
 * not a strobe.* A beacon is a promise that there is somewhere to go, and a
 * promise that blinks out is a promise a player stops trusting.
 */
export function breath(clock: number): number {
  const wave = 0.5 + 0.5 * Math.sin((clock / BREATH_MS) * Math.PI * 2);
  return 0.35 + 0.65 * wave;
}

/**
 * The pocket POP will take, flashing (Marc, 2026-09-24: _"it was hard to know
 * between two pops, make sure the selected one flashes or something"_).
 *
 * How much of the accent the chosen pocket's ring shows, 0..1, against the
 * board's own ground. Faster than a beacon's breath on purpose — a beacon says
 * "somewhere to go", this says "THIS one", and the two must not read as the
 * same signal — and floored so the ring never vanishes: at its low it is a
 * quarter of the accent, still an outline, never a gap.
 */
export const TARGET_PULSE_MS = 900;
export function targetPulse(clock: number): number {
  const wave = 0.5 + 0.5 * Math.cos((clock / TARGET_PULSE_MS) * Math.PI * 2);
  return 0.25 + 0.75 * wave;
}

/** Still, under reduced motion — the same light, no pulse. */
export const STILL_BREATH = 0.8;

/**
 * How often the breath is repainted (2026-09-02).
 *
 * It used to be every frame, which meant **the board asked for 60fps for the
 * whole of every run**: beacons exist almost always, and one beacon anywhere
 * kept `invalidate()` firing, so every instanced draw and every `<Text>` on the
 * board redrew continuously on a board where nothing had happened. On a phone
 * that is the single biggest thing this renderer spends.
 *
 * 33ms is thirty a second against a 2600ms pulse, so the wave advances by about
 * 1.3% of a cycle between repaints. Nobody can see that; a battery can.
 */
export const BREATH_STEP_MS = 33;

export type Ember = {
  /** Where it started, in hex radii from the board's origin. */
  readonly x: number;
  readonly z: number;
  readonly startedAt: number;
  readonly lifeMs: number;
  /** How far it drifts sideways over its life. */
  readonly driftX: number;
  readonly driftZ: number;
  /** How high it climbs before the heat runs out. */
  readonly rise: number;
  /** How far it sinks back before it fades. */
  readonly sink: number;
  readonly size: number;
  readonly colour: number;
};

type EmberPhase = {
  readonly y: number;
  readonly x: number;
  readonly z: number;
  readonly scale: number;
  readonly strength: number;
  readonly gone: boolean;
};

/**
 * One ember at a moment.
 *
 * The curve is Ashwake 1's and its shape is the whole effect: an eased climb
 * that tops out about halfway — *the thermal updraft running out of heat* —
 * and then a quadratic sink that only ever grows, so an ember settles rather
 * than bouncing. An ember that drifted in a straight line and never came back
 * read as smoke; `emberGravity` is what makes it read as fire.
 */
export function emberPhase(ember: Ember, now: number): EmberPhase {
  const t = (now - ember.startedAt) / ember.lifeMs;
  if (t <= 0 || t >= 1) {
    return { x: ember.x, y: 0, z: ember.z, scale: 0, strength: 0, gone: t >= 1 };
  }

  const climb = 1 - (1 - Math.min(t / 0.45, 1)) ** 2;
  const sink = ember.sink * Math.max(0, (t - 0.3) / 0.7) ** 2;
  const fade = t < 0.12 ? t / 0.12 : (1 - (t - 0.12) / 0.88) ** 1.5;

  return {
    x: ember.x + ember.driftX * t,
    y: ember.rise * climb - sink,
    z: ember.z + ember.driftZ * t,
    scale: ember.size * (1 - 0.3 * t),
    strength: 0.8 * fade,
    gone: false,
  };
}

/**
 * How many embers one spent hex throws, and what they look like.
 *
 * Deterministic from the hex's own coordinates rather than `Math.random`, for
 * the same reason the relief's jitter is: the same world has to look the same
 * twice, and a board that shimmers differently on every draw is a board no
 * screenshot can be compared against.
 */
export function embersFor(
  motion: Motion,
  hex: { readonly x: number; readonly z: number; readonly seed: number },
  startedAt: number,
  colour: number,
  count: number,
): readonly Ember[] {
  const out: Ember[] = [];
  for (let i = 0; i < count; i++) {
    const r = spread(hex.seed, i);
    out.push({
      x: hex.x + (r(0) - 0.5) * 0.6,
      z: hex.z + (r(1) - 0.5) * 0.6,
      startedAt,
      lifeMs: motion.emberLifeMs + r(2) * 200,
      driftX: (r(3) - 0.5) * 1.2,
      driftZ: (r(4) - 0.5) * 1.2,
      rise: 0.5 + r(5) * 0.7,
      sink: motion.emberGravity * (0.7 + r(6) * 0.6),
      size: 0.07 + r(7) * 0.05,
      colour,
    });
  }
  return out;
}

/** A little deterministic noise per hex per ember per axis. */
function spread(seed: number, index: number): (axis: number) => number {
  return (axis) => {
    let h = Math.imul(seed ^ (index * 0x9e3779b9) ^ (axis * 0x85ebca6b), 0xc2b2ae35);
    h = Math.imul(h ^ (h >>> 15), 0x27d4eb2f);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
}
