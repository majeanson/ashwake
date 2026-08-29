import { mix, type Depth, type Pattern, type Rgb, type Surface } from '@theme/tokens';

/**
 * How a surface is painted, as data (Stage 2c, 2026-08-29).
 *
 * Ashwake 1 baked a `Surface` straight onto a 2D canvas (`../tiles/src/render/
 * bake.ts`). Every number and every layer of that file is here, and none of the
 * canvas is: this half says WHAT to draw, `apps/game/src/board/bakeCanvas.ts`
 * says how, and the two are separated for three reasons.
 *
 * 1. **`packages/core` may not touch the DOM**, and a canvas is the DOM. That
 *    rule was tightened in Stage 1b precisely because two view files were
 *    quietly calling `createElement`.
 * 2. **A plan can be read by a test.** `surfaceSamples` walks a plan and returns
 *    every colour the finished hex actually contains — which is what the
 *    contrast budget has to grade once a hex is a material and not a swatch.
 *    A canvas would have to be rasterised and sampled to answer the same
 *    question, and not in vitest.
 * 3. **A key derived from the plan cannot forget a field.** Ashwake 1's
 *    `surfaceKey` hand-listed the seven properties that change the pixels and
 *    carried a guard test because forgetting one would hand two different
 *    surfaces the same cached texture. `planKey` is generated from the ops, so
 *    the bug class is structural rather than watched.
 *
 * The layer order is Ashwake 1's, unchanged, and the comment that earned each
 * one travels with it.
 */

/** A stop on a gradient: where, what colour, and how opaque. */
export type Stop = {
  /** 0..1 along the gradient. */
  readonly at: number;
  readonly colour: Rgb;
  readonly alpha: number;
};

/** One mark inside a repeating tile, in tile-local pixels. */
export type Mark =
  | {
      readonly shape: 'rect';
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
      readonly colour: Rgb;
      readonly alpha: number;
    }
  | {
      readonly shape: 'disc';
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
      readonly colour: Rgb;
      readonly alpha: number;
    }
  | {
      readonly shape: 'poly';
      readonly points: readonly (readonly [number, number])[];
      readonly colour: Rgb;
      readonly alpha: number;
    };

/** A repeating tile, as geometry. The interpreter draws it and repeats it. */
export type PatternTile = {
  readonly w: number;
  readonly h: number;
  readonly marks: readonly Mark[];
};

/**
 * One layer of paint. A closed union on purpose — the interpreter is a switch
 * with no default, so a new kind of paint is a type error at every consumer
 * rather than a layer that silently does not draw.
 */
export type PaintOp =
  /** Flat colour over the whole face. */
  | { readonly op: 'fill'; readonly colour: Rgb }
  /** Top to bottom. Every direction handed down describes light from above,
   *  and a gradient the other way reads as a hole. */
  | { readonly op: 'gradient'; readonly from: Rgb; readonly to: Rgb }
  /** The direction's own art for this slot, at a fraction of its strength. */
  | { readonly op: 'art'; readonly alpha: number }
  | { readonly op: 'pattern'; readonly tile: PatternTile; readonly angleDeg: number }
  /** A vertical wash of translucent stops — the depth gloss. */
  | { readonly op: 'wash'; readonly stops: readonly Stop[] }
  /** A radial blot, positioned in fractions of the face. */
  | {
      readonly op: 'blot';
      readonly cx: number;
      readonly cy: number;
      readonly r: number;
      readonly stops: readonly Stop[];
    };

/**
 * The hex size Ashwake 1's pattern units were authored against — its zoom
 * ceiling, and the size every direction's `bar`, `gap`, `pitch` and `radius`
 * was eyeballed at.
 *
 * The units themselves are CSS pixels of a hex drawn at that size: `bake.ts`
 * multiplied them by its OVERSAMPLE and drew into a canvas oversampled by the
 * same factor, so the two cancelled. That means a Stage 1 pattern was a FIXED
 * SCREEN density — it stayed the same absolute size while the hex grew, which
 * is correct for a renderer that rebakes at every zoom level and wrong for one
 * that bakes a texture once and lets the GPU scale it. Here a pattern is a
 * property of the material, so the density is stated per hex radius instead and
 * the reference size is what converts the authored numbers into it.
 */
export const REFERENCE_HEX_PX = 34;

/**
 * Texture pixels per authored pattern unit, for a texture spanning the hex's
 * circumscribed square — two radii across, which is what `prism.ts` maps onto
 * the top face.
 */
export const patternScale = (texturePx: number): number => texturePx / 2 / REFERENCE_HEX_PX;

/** What the surface is being painted for, beyond the surface itself. */
export type PaintOpts = {
  /** The square texture's side, in pixels. */
  readonly texturePx: number;
  /** The direction's depth wash, already resolved by `depthOf`. */
  readonly depth: Depth;
  /**
   * The direction's own art for this surface, where it has loaded.
   *
   * Two shapes, which is Ashwake 1's precedence — **asset beats pattern beats
   * fill** — stated as data. A placed tile's art `replaces` the procedural
   * layers: the PNG was baked with the direction's own depth already in it
   * (`scripts/terrain.ts`), so painting a pattern and a wash over it would be
   * saying the same thing twice. A native field's art does not: it goes on at a
   * fraction of a tile's strength UNDER the pattern, because the ghost is the
   * MATERIAL layer and the equalised marks are the READABLE one.
   */
  readonly art?: { readonly alpha: number; readonly replaces: boolean } | undefined;
};

/**
 * Every layer of one surface, in the order it is painted.
 *
 * Ghost first, patterns over it (Ashwake 1, 2026-08-27). A native field's ghost
 * is the MATERIAL layer and its pattern is the READABLE one; drawn last, a PNG
 * at 0.42–0.62 alpha halved the very marks `fieldDots` equalises — the channel
 * that says "this ground is native to MOSS" at all.
 */
export function paintPlan(surface: Surface, opts: PaintOpts): readonly PaintOp[] {
  const ops: PaintOp[] = [
    surface.fillTo === null
      ? { op: 'fill', colour: surface.fill }
      : { op: 'gradient', from: surface.fill, to: surface.fillTo },
  ];

  if (opts.art !== undefined && opts.art.alpha > 0) {
    ops.push({ op: 'art', alpha: opts.art.alpha });
    // Art that replaces says everything the procedural layers would have, and
    // says it better — that is the whole reason a slot is worth painting.
    if (opts.art.replaces) return ops;
  }

  const scale = patternScale(opts.texturePx);
  for (const pattern of [surface.pattern, surface.overlay]) {
    const tile = patternTile(pattern, scale);
    if (tile !== null) {
      ops.push({
        op: 'pattern',
        tile,
        angleDeg: 'angleDeg' in pattern ? pattern.angleDeg : 0,
      });
    }
  }

  ops.push(depthWash(opts.depth));
  if (surface.scorch) ops.push(SCORCH);
  return ops;
}

/**
 * A whisper of material under every surface. Fill and pattern say WHAT a
 * surface is; this is the one thing that makes it read as a physical thing in a
 * lit room rather than a flat swatch, and every surface pays it.
 *
 * The highlight goes where the light comes from and the shade opposite it. On a
 * dark direction that is top-lit. A pale direction is a DRAWING rather than a
 * lit room — the paper is already the brightest thing, so the wash that models
 * a cell has to be the dark one, and a black smear at the foot of a vellum hex
 * reads as grime rather than as shadow. Same gradient, ends swapped, and the
 * polarity is DERIVED (`isLight`) so a direction cannot disagree with its own
 * colours.
 */
function depthWash(depth: Depth): PaintOp {
  const light = { at: 0, colour: 0xffffff, alpha: depth.sheen };
  const dark = { at: 0, colour: 0x000000, alpha: depth.shade };
  const [top, bottom] = depth.light ? [dark, light] : [light, dark];
  return {
    op: 'wash',
    stops: [
      { ...top, at: 0 },
      { at: 0.5, colour: 0xffffff, alpha: 0 },
      { ...bottom, at: 1 },
    ],
  };
}

/**
 * The scorch: a soft dark blot, off the hex's own centre so it reads as where
 * the burst SAT rather than as a printed mark. `terrain.stone` is the only
 * surface that ever asks for it.
 */
const SCORCH: PaintOp = {
  op: 'blot',
  cx: 0.46,
  cy: 0.56,
  r: 0.5,
  stops: [
    { at: 0, colour: 0x000000, alpha: 0.32 },
    { at: 0.5, colour: 0x000000, alpha: 0.13 },
    { at: 1, colour: 0x000000, alpha: 0 },
  ],
};

/**
 * A pattern's repeating tile, as geometry.
 *
 * Stripes are authored as vertical bars and rotated into place by the
 * interpreter, because a rotated pattern transform is exact at any angle and a
 * hand-drawn diagonal is not.
 */
export function patternTile(pattern: Pattern, scale: number): PatternTile | null {
  switch (pattern.kind) {
    case 'none':
      return null;

    case 'hatch': {
      const bar = Math.max(1, Math.round(pattern.bar * scale));
      const pitch = Math.max(bar + 1, Math.round((pattern.bar + pattern.gap) * scale));
      return {
        w: pitch,
        h: pitch,
        marks: [
          {
            shape: 'rect',
            x: 0,
            y: 0,
            w: bar,
            h: pitch,
            colour: pattern.ink,
            alpha: pattern.alpha,
          },
        ],
      };
    }

    case 'dots': {
      const pitch = Math.max(2, Math.round(pattern.pitch * scale));
      const radius = Math.max(0.5, pattern.radius * scale);
      return {
        w: pitch,
        h: pitch,
        marks: [
          {
            shape: 'disc',
            cx: pitch / 2,
            cy: pitch / 2,
            r: radius,
            colour: pattern.ink,
            alpha: pattern.alpha,
          },
        ],
      };
    }

    /**
     * A repeating symbol: a second channel that says which ground this is
     * without depending on hue. Flat silhouettes, no stroke, no detail —
     * at the size a field is painted only the outline survives, and the
     * outline is the whole information. The grid is offset row by row so a
     * field reads as texture rather than as graph paper.
     */
    case 'glyphs': {
      const pitch = Math.max(4, Math.round(pattern.pitch * scale));
      const size = Math.max(1, pattern.size * scale);
      const at = (cx: number, cy: number): Mark =>
        glyphMark(pattern.shape, cx, cy, size, pattern.ink, pattern.alpha);
      return {
        w: pitch * 2,
        h: pitch * 2,
        marks: [
          at(pitch / 2, pitch / 2),
          at(pitch + pitch / 2, pitch / 2),
          at(0, pitch + pitch / 2),
          at(pitch, pitch + pitch / 2),
          at(pitch * 2, pitch + pitch / 2),
        ],
      };
    }

    case 'bands': {
      // Rubble is not a tint of anything: bands REPLACE the fill rather than
      // ink over it, so both stripes are opaque.
      const width = Math.max(1, Math.round(pattern.width * scale));
      return {
        w: width * 2,
        h: width * 2,
        marks: [
          { shape: 'rect', x: 0, y: 0, w: width, h: width * 2, colour: pattern.a, alpha: 1 },
          { shape: 'rect', x: width, y: 0, w: width, h: width * 2, colour: pattern.b, alpha: 1 },
        ],
      };
    }
  }
}

function glyphMark(
  shape: 'circle' | 'triangle' | 'square' | 'diamond',
  cx: number,
  cy: number,
  size: number,
  colour: Rgb,
  alpha: number,
): Mark {
  switch (shape) {
    case 'circle':
      return { shape: 'disc', cx, cy, r: size, colour, alpha };
    case 'square':
      return { shape: 'rect', x: cx - size, y: cy - size, w: size * 2, h: size * 2, colour, alpha };
    case 'triangle':
      return {
        shape: 'poly',
        points: [
          [cx, cy - size],
          [cx + size, cy + size],
          [cx - size, cy + size],
        ],
        colour,
        alpha,
      };
    case 'diamond':
      return {
        shape: 'poly',
        points: [
          [cx, cy - size],
          [cx + size, cy],
          [cx, cy + size],
          [cx - size, cy],
        ],
        colour,
        alpha,
      };
  }
}

/**
 * A key that changes whenever the pixels would.
 *
 * Derived from the plan rather than hand-listed from the surface, which is the
 * point: Ashwake 1's `surfaceKey` enumerated seven fields and needed a test to
 * prove it had not forgotten one, because a key that forgets a field hands two
 * different surfaces the same cached texture.
 */
export const planKey = (plan: readonly PaintOp[]): string => JSON.stringify(plan);

/**
 * **Every colour the finished hex actually contains.**
 *
 * The answer to "what colour does a hex render in" is not one colour. A hex is
 * a gradient with a pattern over it, an overlay over that and a wash over the
 * lot, so the label that has to be readable on it has to be readable on all of
 * them. This enumerates the set: both gradient ends, each pattern ink composited
 * where it lands, and both ends of the depth wash over each. That set is what
 * the contrast budget grades once a hex is a material rather than a swatch.
 *
 * The pattern inks are composited at their own alpha over the ground they cover,
 * because an ink at 16% over ash is not the ink and is not the ash.
 */
export type SurfaceSamples = {
  /**
   * **Where a centred label actually sits.** The fill or both gradient ends,
   * plus any opaque pattern that replaces the ground rather than inking over
   * it — and deliberately NOT the depth wash, because the wash is zero at the
   * middle of the face by construction (its transparent stop is at 0.5) and a
   * label is anchored there.
   *
   * These carry the reading bar. Grading prose against the wash's extremes
   * would fail a hex that reads perfectly well, at the top edge of a face where
   * no prose is ever drawn.
   */
  readonly label: readonly Rgb[];
  /**
   * **Everywhere on the face**: those grounds, the wash over them at both ends,
   * and every ink a translucent pattern lays over part of the surface.
   *
   * These carry the MARK bar. An edge rides the hex's boundary, where the wash
   * is at full strength, and a hatch bar covers a fraction of the area under a
   * digit — both are marks, and the mark bar is what marks are graded at.
   */
  readonly face: readonly Rgb[];
};

export function surfaceSamples(plan: readonly PaintOp[]): SurfaceSamples {
  let grounds: Rgb[] = [0x000000];
  let inks: Rgb[] = [];
  const wash: Stop[] = [];

  for (const op of plan) {
    switch (op.op) {
      case 'fill':
        grounds = [op.colour];
        break;
      case 'gradient':
        grounds = [op.from, op.to];
        break;
      case 'pattern': {
        // An opaque mark IS the ground where it lands — rubble is not a tint of
        // anything. A translucent one is an ink over whatever it covers.
        const opaque = op.tile.marks.filter((m) => m.alpha >= 1).map((m) => m.colour);
        const inked = op.tile.marks
          .filter((m) => m.alpha < 1)
          .flatMap((mark) => grounds.map((ground) => mix(ground, mark.colour, mark.alpha)));
        inks = [...inks, ...inked];
        grounds = [...grounds, ...opaque];
        break;
      }
      case 'wash':
      case 'blot':
        for (const stop of op.stops) if (stop.alpha > 0) wash.push(stop);
        break;
      case 'art':
        // The art is a photograph this layer cannot predict, so it contributes
        // no sample. The budget grades the procedural floor, which is what
        // ships when a slot is empty and what every direction has to pass.
        break;
    }
  }

  const face = new Set<Rgb>([...grounds, ...inks]);
  for (const colour of [...grounds, ...inks]) {
    for (const stop of wash) face.add(mix(colour, stop.colour, stop.alpha));
  }

  return { label: [...new Set(grounds)], face: [...face] };
}

/**
 * The ground alone — the plan with none of its material on.
 *
 * This is what the `?materials=` dial's zero paints, and it is deliberately a
 * PLAN rather than a separate code path in the renderer: the board bakes a
 * texture and reads a tint the same way at either setting, so turning the dial
 * changes how a hex is painted and nothing about how it is drawn. One path is
 * one set of bugs.
 */
export const flatPlan = (surface: Surface): readonly PaintOp[] => [
  surface.fillTo === null
    ? { op: 'fill', colour: surface.fill }
    : { op: 'gradient', from: surface.fill, to: surface.fillTo },
];
