import { describe, expect, it } from 'vitest';
import type { Layout } from '@render/layout';
import type { CellView } from '@render/Renderer';
import { DAYLIGHT } from '@theme/themes/daylight';
import { SETTLEMENT } from '@theme/themes/settlement';
import { depthOf, type AssetId, type Theme } from '@theme/tokens';
import { groundBatches, gutterOf, hexRadiusOf, radiusScaleOf, type GroundBatch } from './ground';

/**
 * THE TWO GUTTERS, and the arithmetic between them (2026-09-08).
 *
 * `board.seam` and `Surface.inset` are the same quantity authored in two
 * places, and honouring the second one literally would silently undo the fix
 * the first one landed — Marc, on a phone, 2026-09-04: *"the contours are too
 * thick."* `gutterOf` reads the DIFFERENCE the authoring expresses rather than
 * its absolute value, and that choice is mine rather than the theme's, which
 * is exactly why it is pinned here: the next person to read
 * `empty: surface(..., { inset: 0.09 })` should find out from a failing test
 * that 0.09 is not the number on the board.
 */

const THEMES: readonly Theme[] = [SETTLEMENT, DAYLIGHT];

describe('the board-wide seam', () => {
  it('is what a built hex is drawn at, in every direction', () => {
    for (const theme of THEMES) {
      expect(hexRadiusOf(theme), theme.id).toBeCloseTo(1 - theme.board.seam, 10);
    }
  });
});

describe('a surface’s own gutter', () => {
  it('adds nothing to built ground — the tuned contour weight is untouched', () => {
    // The whole point of reading the difference: every terrain authors the
    // baseline, so honouring `inset` must not move a single built hex.
    for (const theme of THEMES) {
      for (const colour of ['green', 'yellow', 'red', 'blue'] as const) {
        expect(gutterOf(theme, theme.terrain[colour]), `${theme.id}/${colour}`).toBe(0);
        expect(radiusScaleOf(theme, theme.terrain[colour]), `${theme.id}/${colour}`).toBe(1);
      }
      expect(gutterOf(theme, theme.stone), `${theme.id}/stone`).toBe(0);
      expect(gutterOf(theme, theme.wall), `${theme.id}/wall`).toBe(0);
    }
  });

  it('loosens EMPTY ground by exactly what its direction authors over the baseline', () => {
    for (const theme of THEMES) {
      const extra = theme.empty.inset - theme.terrain.green.inset;
      expect(extra, `${theme.id} stopped authoring a looser empty`).toBeGreaterThan(0);
      expect(gutterOf(theme, theme.empty), theme.id).toBeCloseTo(extra, 10);
      // Drawn smaller than a built hex, never larger.
      expect(radiusScaleOf(theme, theme.empty), theme.id).toBeLessThan(1);
    }
  });

  it('never inverts, however a direction is re-authored', () => {
    // A surface authored TIGHTER than the baseline gets the baseline, not a
    // hex wider than the board's own seam — the grid has one outer edge.
    for (const theme of THEMES) {
      const tighter = { ...theme.empty, inset: 0 };
      expect(gutterOf(theme, tighter), theme.id).toBe(0);
      expect(radiusScaleOf(theme, tighter), theme.id).toBe(1);
    }
  });

  it('is a scale of the shared prism, so no batch needs its own geometry', () => {
    // `radiusScaleOf` is applied as an instance scale in `HexField`, so it must
    // be the RATIO to the shared radius rather than a radius of its own.
    for (const theme of THEMES) {
      const shared = hexRadiusOf(theme);
      const scale = radiusScaleOf(theme, theme.empty);
      expect(scale * shared, theme.id).toBeCloseTo(shared - gutterOf(theme, theme.empty), 10);
    }
  });
});

/**
 * THE MESH KEY SURVIVES THE ART (2026-09-11).
 *
 * The book of PNGs lands a second or two after the board first draws, and a
 * batch whose key changed when it did was a mesh torn down and rebuilt in
 * front of the player — the "full reload" Marc saw on his first placements.
 * So a batch has two identities: `key`, which the mesh is a function of and
 * the art cannot change, and `paint`, which the material is a function of and
 * the art does. This pins both halves over every kind of cell there is.
 */
describe('a batch’s two identities', () => {
  const cell = (over: Partial<CellView>): CellView => ({
    key: '0,0',
    q: 0,
    r: 0,
    kind: 'tile',
    colour: 'green',
    landmark: null,
    claimed: false,
    beacon: false,
    remembered: false,
    shimmer: false,
    rarity: null,
    native: null,
    ripe: false,
    dimmed: false,
    lensed: false,
    targeted: false,
    worth: 0,
    home: false,
    light: 1,
    band: 0,
    legal: false,
    preview: null,
    previewColour: null,
    ...over,
  });

  // One of everything the board can draw, and two natives of one colour so a
  // batch has more than one item in it.
  const cells: readonly CellView[] = [
    cell({ key: '0,0', kind: 'empty', colour: null, native: 'green' }),
    cell({ key: '1,0', q: 1, kind: 'empty', colour: null, native: 'green' }),
    cell({ key: '2,0', q: 2, kind: 'empty', colour: null, native: 'red' }),
    cell({ key: '0,1', r: 1, kind: 'empty', colour: null, native: null }),
    cell({ key: '1,1', q: 1, r: 1, kind: 'tile', colour: 'red' }),
    cell({ key: '2,1', q: 2, r: 1, kind: 'tile', colour: 'blue' }),
    cell({ key: '0,2', r: 2, kind: 'wall', colour: null }),
    cell({ key: '1,2', q: 1, r: 2, kind: 'landmark', colour: null, landmark: 'cache' }),
    cell({ key: '2,2', q: 2, r: 2, kind: 'stone', colour: null }),
  ];
  const LAYOUT: Layout = { size: 1, originX: 0, originY: 0, orientation: 'pointy' };
  const batchesWith = (hasArt: (id: AssetId) => boolean): readonly GroundBatch[] =>
    groundBatches(cells, {
      theme: SETTLEMENT,
      layout: LAYOUT,
      relief: 0.35,
      materials: 1,
      texturePx: 64,
      depth: depthOf(SETTLEMENT),
      hasArt,
    });
  const partition = (batches: readonly GroundBatch[]): Map<string, readonly string[]> =>
    new Map(batches.map((b) => [b.key, b.items.map((i) => i.cell.key).sort()]));

  it('keys the same meshes, holding the same cells, whether the art has loaded or not', () => {
    const before = partition(batchesWith(() => false));
    const after = partition(batchesWith(() => true));
    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [key, items] of before) expect(after.get(key), key).toEqual(items);
  });

  it('paints differently once the art is here, and only where there is a slot for it', () => {
    const before = new Map(batchesWith(() => false).map((b) => [b.key, b.paint]));
    const after = batchesWith(() => true);
    const changed = after.filter((b) => b.paint !== before.get(b.key));
    expect(changed.length, 'no batch noticed the art').toBeGreaterThan(0);
    for (const b of changed) expect(b.asset, b.key).not.toBeNull();
    for (const b of after) if (b.asset === null) expect(b.paint, b.key).toBe(before.get(b.key));
  });

  it('never gives two batches one key in a single call', () => {
    for (const hasArt of [(): boolean => false, (): boolean => true]) {
      const keys = batchesWith(hasArt).map((b) => b.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});
