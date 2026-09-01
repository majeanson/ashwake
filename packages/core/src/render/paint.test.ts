import { describe, expect, it } from 'vitest';
import { COLOURS } from '@content/tuning';
import { resolveTheme, THEMES } from '@theme/index';
import { depthOf, isLight, luma, surface, type Surface } from '@theme/tokens';
import { surfaceFor } from './materials';
import type { CellView } from './Renderer';
import { paintPlan, patternScale, planKey, REFERENCE_HEX_PX, surfaceSamples } from './paint';

/**
 * The paint plan: the layers, in order, with Ashwake 1's numbers — and a key
 * that cannot forget a field, which is the bug class this shape retires.
 */

const TEXTURE = 256;
const DIRECTIONS = THEMES;
const opts = (theme: (typeof DIRECTIONS)[number], ghostAlpha?: number) => ({
  texturePx: TEXTURE,
  depth: depthOf(theme),
  ...(ghostAlpha === undefined ? {} : { art: { alpha: ghostAlpha, replaces: false } }),
});

const kinds = (plan: ReturnType<typeof paintPlan>): string[] => plan.map((op) => op.op);

describe('a paint plan', () => {
  it('lays its layers in Ashwake 1 order', () => {
    for (const theme of DIRECTIONS) {
      // Ground, then the pattern, then the overlay, then the wash. A scorch
      // goes last, and stone is the only surface that ever asks for one — the
      // placeholder, which is the greyscale test's control rather than a
      // direction, asks for none.
      expect(kinds(paintPlan(theme.stone, opts(theme))).at(-1)).toBe(
        theme.stone.scorch ? 'blot' : 'wash',
      );
      expect(theme.wall.scorch).toBe(false);
      expect(kinds(paintPlan(theme.wall, opts(theme))).at(-1)).toBe('wash');
      for (const colour of COLOURS) {
        const plan = kinds(paintPlan(theme.terrain[colour], opts(theme)));
        expect(plan.at(-1)).toBe('wash');
        expect(plan[0] === 'fill' || plan[0] === 'gradient').toBe(true);
      }
    }
  });

  it('puts the ghost UNDER the patterns, never over them', () => {
    // Ashwake 1, 2026-08-27: a PNG at 0.42-0.62 alpha drawn last halved the
    // very marks `fieldDots` equalises — the channel that says which ground
    // this is at all. The ghost is the MATERIAL layer; the pattern is the
    // READABLE one.
    for (const theme of DIRECTIONS) {
      const plan = kinds(paintPlan(theme.terrain.green, opts(theme, 0.5)));
      const art = plan.indexOf('art');
      const pattern = plan.indexOf('pattern');
      expect(art).toBeGreaterThanOrEqual(0);
      if (pattern >= 0) expect(art).toBeLessThan(pattern);
    }
  });

  it('turns the wash the right way up for the direction', () => {
    for (const theme of DIRECTIONS) {
      const wash = paintPlan(theme.wall, opts(theme)).find((op) => op.op === 'wash');
      expect(wash).toBeDefined();
      if (wash?.op !== 'wash') return;
      const top = wash.stops[0]!;
      // A dark direction is a lit room and takes its highlight from above. A
      // pale one is a DRAWING — the paper is already the brightest thing, so
      // the wash that models a cell has to be the dark one, or a black smear
      // at the foot of a vellum hex reads as grime rather than as shadow.
      expect(top.colour).toBe(isLight(theme) ? 0x000000 : 0xffffff);
      expect(wash.stops.at(-1)!.colour).toBe(isLight(theme) ? 0xffffff : 0x000000);
      expect(wash.stops[1]!.alpha).toBe(0);
    }
  });

  it('scales a pattern to the hex rather than to the screen', () => {
    // Ashwake 1's units were CSS pixels of a hex at its zoom ceiling, and its
    // canvas grew with the hex — so a pattern was a fixed SCREEN density,
    // right for a renderer that rebakes per zoom and wrong for one that bakes
    // once. Here the density belongs to the material.
    expect(patternScale(TEXTURE)).toBeCloseTo(TEXTURE / 2 / REFERENCE_HEX_PX, 12);
    expect(patternScale(512)).toBeCloseTo(patternScale(256) * 2, 12);
  });

  it('changes its key whenever any field would change the pixels', () => {
    const theme = resolveTheme('torchlit');
    const base: Surface = theme.terrain.green;
    const keyOf = (s: Surface): string => planKey(paintPlan(s, opts(theme)));
    const original = keyOf(base);

    const moved: Surface[] = [
      { ...base, fill: base.fill ^ 0x010101 },
      { ...base, fillTo: base.fillTo === null ? 0x123456 : null },
      { ...base, alpha: base.alpha * 0.5 },
      { ...base, scorch: !base.scorch },
      { ...base, pattern: { kind: 'dots', ink: 0x123456, alpha: 0.3, radius: 2, pitch: 7 } },
      {
        ...base,
        overlay: { kind: 'hatch', angleDeg: 45, ink: 0x654321, alpha: 0.2, bar: 1, gap: 4 },
      },
    ];
    for (const s of moved) {
      // `alpha` and `inset` do not reach the plan — a 3D hex takes its
      // transparency from the material and its gutter from the prism radius —
      // so those two are allowed to leave the key alone. Everything that is
      // PAINTED must move it.
      if (s.alpha !== base.alpha) continue;
      expect(keyOf(s), JSON.stringify(s.pattern ?? s.fill)).not.toBe(original);
    }
    expect(keyOf(base)).toBe(original);
  });

  it('samples every colour the finished hex contains, not just its fill', () => {
    for (const theme of DIRECTIONS) {
      for (const colour of COLOURS) {
        const s = theme.terrain[colour];
        const { label, face } = surfaceSamples(paintPlan(s, opts(theme)));
        // The ground a centred label sits on is the fill and its ends, and
        // nothing else — the wash is transparent at the middle of the face by
        // construction, which is where a label is anchored.
        expect(label).toContain(s.fill);
        if (s.fillTo !== null) expect(label).toContain(s.fillTo);
        expect(label.length).toBe(s.fillTo === null ? 1 : 2);
        // The face carries more: the wash at both ends and every ink a pattern
        // lays over part of it. That is the whole reason a budget cannot grade
        // a swatch.
        expect(face.length).toBeGreaterThan(label.length);
        for (const sample of face) {
          expect(luma(sample)).toBeGreaterThanOrEqual(0);
          expect(luma(sample)).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('counts an opaque pattern as ground and a translucent one as ink', () => {
    // Rubble is not a tint of anything: a `bands` pattern REPLACES what it
    // covers, so a label can sit wholly on it. A hatch or a dot inks over the
    // ground and covers a fraction of a digit, so it is a mark.
    const theme = resolveTheme('torchlit');
    const opaque = surfaceSamples(
      paintPlan({ ...surface(0x404040), pattern: theme.wall.pattern }, opts(theme)),
    );
    const inked = surfaceSamples(
      paintPlan(
        {
          ...surface(0x404040),
          pattern: { kind: 'dots', ink: 0xffffff, alpha: 0.4, radius: 2, pitch: 7 },
        },
        opts(theme),
      ),
    );
    expect(theme.wall.pattern.kind).toBe('bands');
    expect(opaque.label.length).toBeGreaterThan(1);
    expect(inked.label).toEqual([0x404040]);
    expect(inked.face).toContain(0x8c8c8c);
  });

  it('lets a slot own art replace the procedural layers outright', () => {
    // Asset beats pattern beats fill. A tile PNG was baked with the
    // direction's own depth already in it, so painting a pattern and a wash
    // over it would say the same thing twice.
    for (const theme of DIRECTIONS) {
      const plan = kinds(
        paintPlan(theme.terrain.green, {
          texturePx: TEXTURE,
          depth: depthOf(theme),
          art: { alpha: 1, replaces: true },
        }),
      );
      expect(plan.at(-1)).toBe('art');
      expect(plan).not.toContain('pattern');
      expect(plan).not.toContain('wash');
    }
  });

  it('reads a plain surface with no pattern as one colour plus its wash', () => {
    const flat = surface(0x808080);
    const plan = paintPlan(flat, opts(resolveTheme('torchlit')));
    expect(kinds(plan)).toEqual(['fill', 'wash']);
    expect(surfaceSamples(plan).label).toContain(0x808080);
  });
});

describe('which surface a cell wears', () => {
  const cell = (over: Partial<CellView>): CellView => ({
    key: '0,0',
    q: 0,
    r: 0,
    kind: 'empty',
    colour: null,
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

  const never = () => false;

  /**
   * Amended 2026-09-01, and the amendment is the point.
   *
   * This used to assert that a claimed destination IS `theme.stone` — the very
   * surface a popped tile wears. So on a board that fills with spent ground as
   * a run goes on, the hex you walked all that way to reach became the same hex
   * as everything around it. Marc, for the third time in this class (the prop
   * and the glyph were the first two, both 2026-08-29): *"symbols used on used
   * shrines, sites, caches, etc. [should be] the same as when they are
   * highlighted and active, just grey and look deactivated instead."*
   *
   * A spent destination keeps the ground a destination stands on and changes
   * only its INK. What is asserted now is that pair: same base, quieter mark.
   */
  it('keeps a claimed destination standing on a destination ground, greyed', () => {
    const theme = resolveTheme('torchlit');
    const spent = surfaceFor(cell({ kind: 'landmark', claimed: true }), theme, never).surface;
    const live = surfaceFor(cell({ kind: 'landmark' }), theme, never).surface;

    // Not the surface a popped tile wears. That was the bug.
    expect(spent).not.toBe(theme.stone);
    expect(spent.fill, 'a spent destination stopped being a place').toBe(live.fill);

    expect(spent.pattern.kind).toBe('dots');
    expect(live.pattern.kind).toBe('dots');
    if (spent.pattern.kind !== 'dots' || live.pattern.kind !== 'dots') return;
    // Same vocabulary, quieter and in the spent voice — the one the claimed
    // prop and the claimed glyph already speak.
    expect(spent.pattern.alpha).toBeLessThan(live.pattern.alpha);
    expect(spent.pattern.ink).toBe(theme.ink.inkDim);
  });

  it('says less for a shimmer than for a destination', () => {
    const theme = resolveTheme('torchlit');
    const shimmer = surfaceFor(cell({ kind: 'landmark', shimmer: true }), theme, never).surface;
    const found = surfaceFor(cell({ kind: 'landmark' }), theme, never).surface;
    // Same vocabulary, quieter — and the label rule withholds the glyph, so
    // the alpha is the whole difference between "come here" and "something
    // is here".
    expect(shimmer.pattern.kind).toBe('dots');
    expect(found.pattern.kind).toBe('dots');
    if (shimmer.pattern.kind !== 'dots' || found.pattern.kind !== 'dots') return;
    expect(shimmer.pattern.alpha).toBeLessThan(found.pattern.alpha);
    expect(shimmer.alpha).toBeLessThan(found.alpha);
  });

  it('fades a beacon by the direction own number', () => {
    const theme = resolveTheme('torchlit');
    expect(surfaceFor(cell({ kind: 'landmark', beacon: true }), theme, never).surface.alpha).toBe(
      theme.board.beaconFade,
    );
  });

  it('shows stone rather than nothing for a tile with no colour', () => {
    const theme = resolveTheme('torchlit');
    expect(surfaceFor(cell({ kind: 'tile' }), theme, never).surface).toBe(theme.stone);
  });

  it('gives native ground a field, and plain ground the empty fill', () => {
    for (const theme of DIRECTIONS) {
      expect(surfaceFor(cell({}), theme, never).surface).toBe(theme.empty);
      for (const colour of COLOURS) {
        const field = surfaceFor(cell({ native: colour }), theme, never);
        // `fieldGround` never returns a patternless field: the equalised marks
        // ARE how a field says which ground it is native to.
        expect(field.surface.pattern.kind).not.toBe('none');
      }
    }
  });
});
