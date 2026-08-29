import { describe, expect, it } from 'vitest';
import { THEMES } from './index';
import {
  exposure,
  FLAT_RIG,
  litColour,
  normalised,
  renders,
  rigFor,
  sideNormals,
  UP,
  type Rig,
  type Vec3,
} from './rig';
import { cellTint, torched } from './torch';

/**
 * The rig's contract. Every one of these is a way the board could quietly stop
 * rendering the colours the palette was graded for.
 */

const DIALS = [0, 0.25, 0.5, 0.75, 1] as const;
const DIRECTIONS = Object.values(THEMES);

const darkest = (rig: Rig, normals: readonly Vec3[]): number =>
  Math.min(...normals.map((n) => exposure(rig, n)));

describe('the lighting rig', () => {
  it('exposes a face pointing up at exactly 1, at every strength', () => {
    for (const dial of DIALS) expect(exposure(rigFor(dial), UP)).toBeCloseTo(1, 12);
  });

  it('is the authored colour at zero, whichever way a face points', () => {
    expect(rigFor(0)).toEqual(FLAT_RIG);
    for (const n of [UP, ...sideNormals('pointy'), [0, -1, 0] as Vec3]) {
      expect(exposure(FLAT_RIG, n)).toBeCloseTo(1, 12);
    }
  });

  it('renders a colour as itself at full torch on a lit top', () => {
    // The identity the whole budget rests on: a hex top, fully lit, IS the
    // colour the direction authored. Nothing to re-derive, nothing to relax.
    for (const theme of DIRECTIONS) {
      for (const colour of ['green', 'yellow', 'red', 'blue'] as const) {
        const fill = theme.terrain[colour].fill;
        const tint = cellTint(theme, { light: 1, band: 0, remembered: false, dimmed: false });
        expect(renders(fill, tint, exposure(rigFor(1), UP))).toBe(fill);
      }
    }
  });

  it('carves the sides — a facet is darker than the top it stands under', () => {
    const rig = rigFor(1);
    const sides = sideNormals('pointy');
    const dark = darkest(rig, sides);
    expect(dark).toBeLessThan(1);
    // Enough contrast between a top and the darkest side that a prism reads as
    // a solid, and not so much that a side goes to black with the silhouette.
    expect(1 / dark).toBeGreaterThanOrEqual(1.6);
    expect(dark).toBeGreaterThan(0.25);
    for (const n of sides) expect(exposure(rig, n)).toBeGreaterThan(0);
  });

  it('has no term the torch also has — no falloff lives in the rig', () => {
    // The no-double-counting rule, as an assertion: every light is a
    // DIRECTION and an intensity. A position, a distance or a decay would be
    // spatial falloff, which is `cell.light`'s job and only its job.
    for (const dial of DIALS) {
      for (const light of rigFor(dial).lights) {
        expect(Math.hypot(...light.dir)).toBeCloseTo(1, 12);
        expect(light.intensity).toBeGreaterThan(0);
        expect(Object.keys(light).sort()).toEqual(['dir', 'intensity']);
      }
    }
  });

  it('normalises a rig that was not, and survives a dead one', () => {
    const loud: Rig = { ambient: 9, lights: [{ dir: UP, intensity: 4 }] };
    expect(exposure(normalised(loud), UP)).toBeCloseTo(1, 12);
    expect(normalised({ ambient: 0, lights: [] })).toEqual(FLAT_RIG);
  });

  it('turns the light down without turning the colour', () => {
    // Half the light is not half the code value: the scale happens in linear
    // light, which is the only place halving means halving.
    const grey = 0x808080;
    expect(litColour(grey, 1)).toBe(grey);
    expect(litColour(grey, 0)).toBe(0x000000);
    expect(litColour(0xffffff, 4)).toBe(0xffffff);
  });
});

describe('the torch', () => {
  it('multiplies in display space, as Ashwake 1 tinted', () => {
    // A linear multiply by 0.5 would land near 0xbc; the operator the field
    // lift thresholds were graded against lands on half the code value.
    expect(torched(0xffffff, 0x808080)).toBe(0x808080);
    expect(torched(0x804020, 0xffffff)).toBe(0x804020);
    expect(torched(0xffffff, 0x000000)).toBe(0x000000);
  });

  it('fades toward the board, never toward black', () => {
    for (const theme of DIRECTIONS) {
      const dark = cellTint(theme, { light: 0, band: 0, remembered: false, dimmed: false });
      // An unlit hex fades INTO the board. Fading to black would show the page
      // through the board and turn distance into holes.
      expect(dark).toBe(theme.board.background);
    }
  });

  it('lifts a contour band, and steps a lensed cell back', () => {
    for (const theme of DIRECTIONS) {
      const base = { light: 0.5, remembered: false, dimmed: false };
      const flat = cellTint(theme, { ...base, band: 0 });
      const raised = cellTint(theme, { ...base, band: 3 });
      expect(raised).not.toBe(flat);
      const dimmed = cellTint(theme, { ...base, band: 0, dimmed: true });
      expect(dimmed).not.toBe(flat);
    }
  });
});
