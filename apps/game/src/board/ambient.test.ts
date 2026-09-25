import { describe, expect, it } from 'vitest';
import { resolveTheme } from '@theme/index';
import {
  breath,
  BREATH_MS,
  embersFor,
  emberPhase,
  STILL_BREATH,
  targetPulse,
  TARGET_PULSE_MS,
} from './ambient';
import { glided, GLIDE_FLOOR, glidedBy, isFlick, isResting, type Glide } from './camera';

/**
 * The board when nobody is touching it, and the board after a thumb lets go.
 * Both are pure, so both can be argued with here rather than only in a
 * screenshot.
 */

const motion = resolveTheme('torchlit').motion;

describe('a beacon breathing', () => {
  it('is dim, never dark', () => {
    // A lighthouse in fog, not a strobe. A beacon is a promise that there is
    // somewhere to go, and a promise that blinks out stops being trusted.
    let low = 1;
    let high = 0;
    for (let ms = 0; ms <= BREATH_MS * 2; ms += 13) {
      const b = breath(ms);
      low = Math.min(low, b);
      high = Math.max(high, b);
      expect(b).toBeGreaterThan(0.3);
      expect(b).toBeLessThanOrEqual(1);
    }
    expect(low).toBeLessThan(high); // it does breathe
    expect(low).toBeGreaterThanOrEqual(0.35);
  });

  it('comes back to where it started, every cycle', () => {
    expect(breath(0)).toBeCloseTo(breath(BREATH_MS), 9);
    expect(breath(BREATH_MS * 0.5)).toBeCloseTo(breath(BREATH_MS * 1.5), 9);
  });

  it('holds still when motion is not wanted', () => {
    expect(STILL_BREATH).toBeGreaterThan(0.35);
    expect(STILL_BREATH).toBeLessThan(1);
  });
});

describe('an ember', () => {
  const hex = { x: 2, z: -3, seed: 41 };
  const born = embersFor(motion, hex, 0, 0xffaa55, 6);

  it('rises, settles, and goes out', () => {
    const one = born[0]!;
    const early = emberPhase(one, one.lifeMs * 0.2);
    const top = emberPhase(one, one.lifeMs * 0.5);
    const late = emberPhase(one, one.lifeMs * 0.9);

    expect(early.y).toBeGreaterThan(0);
    expect(top.y).toBeGreaterThan(early.y);
    // The updraft runs out of heat and gravity takes it back — an ember that
    // drifts in a straight line and never returns reads as smoke.
    expect(late.y).toBeLessThan(top.y);
    expect(late.strength).toBeLessThan(early.strength);
    expect(emberPhase(one, one.lifeMs).gone).toBe(true);
  });

  it('never sinks below the ground it came from', () => {
    for (const ember of born) {
      for (let ms = 0; ms < ember.lifeMs; ms += 7) {
        expect(emberPhase(ember, ms).y).toBeGreaterThan(-0.2);
      }
    }
  });

  it('throws a different spray from every hex, and the same one twice', () => {
    const again = embersFor(motion, hex, 0, 0xffaa55, 6);
    expect(again).toEqual(born);
    const elsewhere = embersFor(motion, { x: 2, z: -3, seed: 42 }, 0, 0xffaa55, 6);
    expect(elsewhere[0]!.driftX).not.toBe(born[0]!.driftX);
  });

  it('spreads: no two embers from one hex share a path', () => {
    const paths = new Set(born.map((e) => `${e.driftX},${e.rise},${e.lifeMs}`));
    expect(paths.size).toBe(born.length);
  });
});

describe('a flick', () => {
  it('carries, slows, and stops', () => {
    let glide: Glide = { vx: 0.02, vz: -0.01 };
    expect(isFlick(glide)).toBe(true);

    let travelled = 0;
    let frames = 0;
    while (!isResting(glide) && frames < 1000) {
      const step = glided(glide, 16);
      travelled += Math.hypot(step.dx, step.dz);
      glide = step.next;
      frames++;
    }
    expect(frames).toBeLessThan(1000); // it does come to rest
    expect(travelled).toBeGreaterThan(0);
    expect(Math.hypot(glide.vx, glide.vz)).toBeLessThan(GLIDE_FLOOR);
  });

  it('lands in the same place whatever the frame rate', () => {
    // Exponential decay integrated over the step, not velocity times the step
    // — otherwise a slow phone overshoots and a fast one falls short, and the
    // board ends up somewhere different depending on how busy it was.
    const far = (stepMs: number): number => {
      let glide: Glide = { vx: 0.03, vz: 0 };
      let x = 0;
      for (let ms = 0; ms < 4000; ms += stepMs) {
        const step = glided(glide, stepMs);
        x += step.dx;
        glide = step.next;
      }
      return x;
    };
    expect(far(8)).toBeCloseTo(far(33), 3);
  });

  it('ignores a slow lift, which was a stop rather than a throw', () => {
    expect(isFlick({ vx: 0.0002, vz: 0.0002 })).toBe(false);
  });

  it('slides the world with the flick, not against it', () => {
    // The same direction a drag goes: the centre moves against the finger.
    const moved = glidedBy({ zoom: 1, cx: 0, cz: 0 }, 0.5, -0.25);
    expect(moved.cx).toBeCloseTo(-0.5, 9);
    expect(moved.cz).toBeCloseTo(0.25, 9);
  });
});

describe('the chosen pocket flashes', () => {
  it('runs from full accent down to a quarter and back, never to nothing', () => {
    let low = 1;
    let high = 0;
    for (let t = 0; t < TARGET_PULSE_MS; t += 5) {
      const v = targetPulse(t);
      low = Math.min(low, v);
      high = Math.max(high, v);
    }
    expect(high).toBeCloseTo(1, 3);
    expect(low).toBeCloseTo(0.25, 3);
  });

  it('starts at full accent, so a pocket just chosen is lit the moment it is', () => {
    expect(targetPulse(0)).toBe(1);
  });

  // Half a beacon was the first build's own rule; Marc asked for it slower
  // twice (2026-09-24, 1500 then 2000), and what must hold is only that it
  // stays quicker than a beacon's breath.
  it('is faster than a beacon, so the two signals never read as one', () => {
    expect(TARGET_PULSE_MS).toBeLessThan(BREATH_MS);
  });
});
