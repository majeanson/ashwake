import { describe, expect, it } from 'vitest';
import type { CellView } from '@render/Renderer';
import type { Motion } from '@theme/tokens';
import { resolveTheme } from '@theme/index';
import { cascadeDelays, cascadeMs, glowPhase, leapPhase, LEAP_MS } from './leap';

/**
 * The pop's arithmetic. "Glorious" is a judgement, but *rises, swells, and is
 * gone* is a curve, and a curve can be held to.
 */

const motion: Motion = resolveTheme('torchlit').motion;

const cell = (q: number, r: number): CellView =>
  ({ key: `${q},${r}`, q, r, kind: 'tile', colour: 'red' }) as unknown as CellView;

describe('the leap', () => {
  it('rises, swells, and is gone', () => {
    const life = LEAP_MS(motion);
    const start = leapPhase(motion, 0, 0);
    const peak = leapPhase(motion, life * 0.5, 0);
    const late = leapPhase(motion, life * 0.9, 0);
    const over = leapPhase(motion, life, 0);

    expect(start.lift).toBe(0);
    expect(peak.lift).toBeGreaterThan(start.lift);
    expect(peak.scale).toBeGreaterThan(1); // it bursts rather than slides
    expect(late.scale).toBeLessThan(peak.scale);
    expect(over.gone).toBe(true);
    expect(over.scale).toBe(0);
  });

  it('is still whole for most of its flight, then leaves', () => {
    // The shrink is the last third only: a tile that starts shrinking at once
    // reads as dissolving, and the thing being drawn is a tile LEAVING.
    expect(leapPhase(motion, LEAP_MS(motion) * 0.6, 0).scale).toBeGreaterThan(1);
    expect(leapPhase(motion, LEAP_MS(motion) * 0.95, 0).scale).toBeLessThan(0.5);
  });

  it('has not started before its own delay', () => {
    const phase = leapPhase(motion, 10, 200);
    expect(phase.lift).toBe(0);
    expect(phase.scale).toBe(1);
    expect(phase.gone).toBe(false);
  });

  it('ripples outward from the pocket the player actually tapped', () => {
    // Not object order: the cascade has to radiate from the point of contact,
    // which is the difference between a cascade and a flicker.
    const cells = [cell(3, 0), cell(0, 0), cell(1, 0), cell(2, 0)];
    const delays = cascadeDelays(cells, '0,0', motion);
    expect(delays[1]).toBe(0); // the tapped hex goes first
    expect(delays[2]).toBeLessThan(delays[3]!); // then by distance
    expect(delays[3]).toBeLessThan(delays[0]!);
  });

  it('gives every cell the same moment when no pocket was named', () => {
    const cells = [cell(0, 0), cell(1, 0), cell(2, 0)];
    // Ties break by index, so the order is stable rather than arbitrary — a
    // board that pops differently on two devices is a board that is guessing.
    expect(cascadeDelays(cells, null, motion)).toEqual([
      0,
      motion.popStaggerMs,
      motion.popStaggerMs * 2,
    ]);
  });

  it('lasts long enough for the last tile in the cascade to finish', () => {
    const tiles = 6;
    const total = cascadeMs(motion, tiles);
    const lastDelay = motion.popStaggerMs * (tiles - 1);
    expect(leapPhase(motion, total, lastDelay).gone).toBe(true);
    // And not so long that the layer lingers after the board is still.
    expect(total).toBeLessThan(lastDelay + LEAP_MS(motion) + 200);
  });

  it('lights fast and fades slow — the asymmetry is the whole effect', () => {
    const quarter = glowPhase(motion, motion.popMs * 0.15, 0);
    const half = glowPhase(motion, motion.popMs * 0.5, 0);
    expect(quarter.strength).toBeCloseTo(motion.popAlpha, 6); // full by 15%
    expect(half.strength).toBeLessThan(quarter.strength);
    expect(glowPhase(motion, motion.popMs, 0).gone).toBe(true);
    expect(glowPhase(motion, 0, 0).strength).toBe(0);
  });

  it('never asks for a negative size or a negative light', () => {
    for (let ms = 0; ms <= 2000; ms += 7) {
      const leap = leapPhase(motion, ms, 120);
      const glow = glowPhase(motion, ms, 120);
      expect(leap.scale).toBeGreaterThanOrEqual(0);
      expect(leap.lift).toBeGreaterThanOrEqual(0);
      expect(glow.strength).toBeGreaterThanOrEqual(0);
    }
  });
});
