import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import sharp from 'sharp';
import { rngNext, stream, type RngStream } from '../packages/core/src/engine/rng';
import { DAYLIGHT } from '../packages/core/src/theme/themes/daylight';
import { SETTLEMENT } from '../packages/core/src/theme/themes/settlement';
import {
  hex,
  isLight,
  luma,
  type Motif,
  type Pattern,
  type Rgb,
  type Surface,
  type Theme,
} from '../packages/core/src/theme/tokens';

/**
 * Bake a direction's terrain PNGs: the seven hex slots —
 * `terrain.green/yellow/red/blue/wall/stone/ghost` at 414×358, flat-top's own
 * bounding-box ratio and `theme/assets.ts`'s `TERRAIN` size.
 *
 * **Ported into Ashwake 2 on 2026-08-29, and the port is the point.** This
 * body was built without any of the bakers: the terrain PNGs came across as
 * frozen byte-copies and the rest did not come across at all. Frozen art is
 * art that goes stale silently, and it had — Ashwake 1 darkened daylight's
 * terrain ladder on 2026-08-28 to fix "ember has no contrast", never re-baked,
 * and this body inherited PNGs still rendering the OLD ladder. A contrast fix
 * that goes missing twice is the argument for keeping the recipe rather than
 * the loaf.
 *
 * CI runs this baker on every push, which keeps the pipeline from rotting
 * unnoticed and grades the palette through the renderer — the guardrail at the
 * bottom throws if the baked ordering contradicts the L* test's. It does NOT
 * diff the result against the committed PNGs: `sharp` does not rasterise SVG
 * byte-identically across platforms, so a Linux runner never reproduces a
 * Windows bake. **Re-bake when a palette moves — nothing will tell you.**
 *
 * Same spirit as `scripts/icons.ts` and `scripts/social.ts`: one composed
 * SVG per file, rasterised by `sharp`, reading colour straight off the theme
 * object rather than a hand-copied palette, so regenerating after the theme
 * moves is `pnpm bake` and nothing else.
 *
 * Deliberately NOT `bake.ts` reused verbatim: that file's job is a cheap
 * per-frame texture, cached and redrawn at whatever size the board happens
 * to be. This script pays once, offline, for things a live bake never
 * could — organic jitter per moss tuft and per blade of dry grass, radiating
 * cracks instead of a repeating hatch — while still speaking the SAME
 * vocabulary the theme states (`pattern`/`overlay`/`scorch`), so the two
 * never disagree about what a colour IS, only about how much they can
 * afford to spend saying so.
 *
 * THE BAR: a slot this cannot make GOOD stays empty on purpose. Every slot
 * below shipped because it cleared that bar on inspection; none of the seven
 * is a placeholder for "will improve later".
 *
 * No CC0 texture assets were used to seed any layer here (decision of
 * record permits it; Ashwake 1 judged procedural generation — reading the
 * theme's own colours and patterns rather than a stock photo — the better fit
 * for "warm light against darkness" at this size, and skipped the
 * network-fetch/licence-bookkeeping cost the decision explicitly says is
 * optional). See `apps/game/public/assets/README.md`.
 */

/*
 * EVERY direction, not just torchlit (2026-08-25).
 *
 * This script always read colour off a theme object rather than a hand-copied
 * palette — that was the point of it — but it read exactly one, so the two
 * directions added for contrast would have run on the procedural floor while
 * torchlit wore baked art. That is a supported state (`assets.ts`: missing files
 * are the normal case) and it is still the wrong one here, because the whole
 * reason those directions exist is that somebody could not read the board, and
 * shipping them the plainer half of the renderer is a strange way to help.
 *
 * The drawing is unchanged and shared: moss tufts, dry grass, ember glints, ash
 * pits, tide ripples. Only the colours differ, which is exactly what a variant
 * IS. The placeholder is skipped — it is the control, it has no art slots, and
 * baking it would give the greyscale test's reference a coat of paint.
 */
/*
 * And SETTLEMENT, which is why this script had to come back (2026-08-29).
 *
 * Ashwake 2 was built without the bakers: the seven terrain PNGs were carried
 * over as frozen byte-copies and `fx.pop`, `ui.logo` and `ui.runEnd` were not
 * carried over at all, so three declared slots shipped empty. That is a
 * supported state — `theme/assets.ts` treats a missing file as the normal
 * case, and the renderer draws its procedural floor instead — but it left the
 * fourth direction, built on 2026-08-29 (D7), with no way to ever have art:
 * the pipeline that makes it lived only in `../tiles`.
 *
 * Nothing about the drawing changes for it. The whole point of this script is
 * that it reads colour off the theme object rather than a copied palette, so a
 * new direction is a new entry here and nothing else — and it earns its art by
 * passing the guardrail at the bottom, not by being liked.
 *
 * `placeholder`, `torchlit` and `torchlit-bright` are gone (D12, 2026-09-03):
 * two directions ship now, and `daylight` bakes under settlement's own motif
 * rather than the plane's — see `themes/daylight.ts`'s own docblock.
 */
const THEMES_TO_BAKE: readonly Theme[] = [DAYLIGHT, SETTLEMENT];

let T: Theme = SETTLEMENT;
let outDir = '';
const at = (name: string): string => `${outDir}${name}`;

// ---------------------------------------------------------------- geometry

const TW = 414;
const TH = 358;
const TCX = TW / 2;
const TCY = TH / 2;
const TSIZE = TW / 2; // circumradius: flat-top's bounding box is 2*size wide, √3*size tall.

/** Flat-top hex corners — the same winding `render/layout.ts#corners` uses. */
function hexPoints(cx: number, cy: number, size: number): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i);
    pts.push([cx + size * Math.cos(a), cy + size * Math.sin(a)]);
  }
  return pts;
}

const ptsAttr = (pts: readonly (readonly [number, number])[]): string =>
  pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

// -------------------------------------------------------------- randomness

/**
 * A tiny stateful wrapper over `engine/rng.ts`'s pure counter-based stream —
 * fine here (this is a build script, not `src/engine/`) and load-bearing:
 * "deterministic" is WORKPLAN's own word for this script, so every jitter
 * below comes from a named, fixed seed rather than `Math.random`.
 */
function rng(seed: number): { next(): number; range(min: number, max: number): number } {
  let s: RngStream = stream(seed);
  return {
    next(): number {
      const [v, n] = rngNext(s);
      s = n;
      return v;
    },
    range(min: number, max: number): number {
      return min + this.next() * (max - min);
    },
  };
}

// ----------------------------------------------------------------- pieces

const rgba = (c: Rgb, a: number): string =>
  `rgba(${(c >> 16) & 0xff},${(c >> 8) & 0xff},${c & 0xff},${a})`;

/**
 * The layer a drawing needs, or a LOUD failure (2026-08-29).
 *
 * Every slot function below used to ask for its layer as
 * `s.pattern.kind === 'dots' ? s.pattern : null` and skip the layer when the
 * answer was no. That reads as defensive and is the opposite: a direction
 * whose kinds do not match the figures its motif draws loses those layers
 * SILENTLY and bakes a flat tile, which is a worse tile than the procedural
 * fallback the art exists to supersede.
 *
 * It is not hypothetical. `settlement` is the only direction that departs from
 * the plane's kind layout — its MARKET is striped where the plane's brightest
 * ground is dotted — so MARKET matched neither guard and shipped with no
 * texture at all, and QUARRY lost its cut-face overlay the same way. Nothing
 * reported it: the greyscale guardrail at the bottom of this file grades VALUE,
 * and a missing texture barely moves a mean.
 *
 * So a mismatch throws, and says which slot, which direction, and both kinds.
 * The bake is the only place this can be caught, and a build that stops is
 * cheaper than a tile nobody notices is empty.
 */
function need<K extends Pattern['kind']>(
  where: string,
  pattern: Pattern,
  kind: K,
): Extract<Pattern, { kind: K }> {
  if (pattern.kind !== kind) {
    throw new Error(
      `${T.id} ${where}: the ${T.motif} motif draws a '${kind}' here and the direction ` +
        `declares '${pattern.kind}'. A layer the theme states and the maker cannot draw goes ` +
        `MISSING rather than wrong — settlement's MARKET baked with no texture at all for ` +
        `exactly this reason. Either give the layer a kind this motif draws, or teach the ` +
        `motif that kind.`,
    );
  }
  return pattern as Extract<Pattern, { kind: K }>;
}

function clipDef(id: string, inset: number): string {
  const pts = hexPoints(TCX, TCY, TSIZE * (1 - inset));
  return `<clipPath id="${id}"><polygon points="${ptsAttr(pts)}"/></clipPath>`;
}

function fillRect(surface: Surface, w = TW, h = TH): string {
  const to = surface.fillTo ?? surface.fill;
  return (
    `<linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${hex(surface.fill)}"/>` +
    `<stop offset="1" stop-color="${hex(to)}"/>` +
    `</linearGradient>` +
    `<rect width="${w}" height="${h}" fill="url(#fill)"/>`
  );
}

/**
 * The depth pass every slot gets — see `render/bake.ts#paintDepth`'s own doc.
 *
 * Reads the theme's own `sheen`/`shade` and its polarity since 2026-08-25,
 * exactly as the live baker does. The two numbers were hand-typed here and
 * hand-typed there, a hair apart (0.06/0.1 against 0.05/0.08) — close enough
 * that nobody noticed and far enough that a baked tile and a procedural one
 * were never quite the same material.
 */
function depthRect(w = TW, h = TH): string {
  const light = isLight(T);
  const stop = (c: string, o: number): string =>
    `<stop offset="${light ? 1 : 0}" stop-color="${c}" stop-opacity="${o}"/>`;
  return (
    `<linearGradient id="depth" x1="0" y1="0" x2="0" y2="1">` +
    stop('#ffffff', T.board.sheen) +
    `<stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>` +
    `<stop offset="${light ? 0 : 1}" stop-color="#000000" stop-opacity="${T.board.shade}"/>` +
    `</linearGradient>` +
    `<rect width="${w}" height="${h}" fill="url(#depth)"/>`
  );
}

/** The scorch — see `theme/themes/settlement.ts`'s `stone` surface for why. */
function scorchRect(): string {
  const cx = TW * 0.46;
  const cy = TH * 0.57;
  const r = Math.min(TW, TH) * 0.56;
  return (
    `<radialGradient id="scorch" cx="${cx}" cy="${cy}" r="${r}" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#000000" stop-opacity="0.46"/>` +
    `<stop offset="0.4" stop-color="#000000" stop-opacity="0.24"/>` +
    `<stop offset="0.75" stop-color="#000000" stop-opacity="0.08"/>` +
    `<stop offset="1" stop-color="#000000" stop-opacity="0"/>` +
    `</radialGradient>` +
    `<rect width="${TW}" height="${TH}" fill="url(#scorch)"/>`
  );
}

/**
 * Moss tufts (MOSS overlay, richer than the live dot grid): 2–3 overlapping
 * dots per cluster, jittered off a loose grid, so growth reads as clumped
 * rather than gridded. `seed` keeps every colour's jitter its own sequence.
 */
function tuftField(seed: number, pitch: number, ink: Rgb, alpha: number): string {
  const r = rng(seed);
  const parts: string[] = [];
  for (let gy = pitch / 2; gy < TH; gy += pitch) {
    for (let gx = pitch / 2; gx < TW; gx += pitch) {
      const bx = gx + r.range(-pitch * 0.3, pitch * 0.3);
      const by = gy + r.range(-pitch * 0.3, pitch * 0.3);
      const clumps = 2 + Math.floor(r.range(0, 2));
      for (let i = 0; i < clumps; i++) {
        const px = bx + r.range(-4, 4);
        const py = by + r.range(-4, 4);
        const rad = r.range(2.5, 5);
        parts.push(
          `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${rad.toFixed(1)}" fill="${rgba(ink, alpha)}"/>`,
        );
      }
    }
  }
  return parts.join('');
}

/**
 * Dry grass blades (EMBER primary, richer than the live vertical hatch):
 * short strokes of varying length and lean instead of a mechanical rule.
 */
function bladeField(seed: number, pitch: number, ink: Rgb, alpha: number): string {
  const r = rng(seed);
  const parts: string[] = [];
  for (let gy = pitch; gy < TH + pitch; gy += pitch * 1.15) {
    for (let gx = pitch / 2; gx < TW; gx += pitch) {
      const bx = gx + r.range(-pitch * 0.35, pitch * 0.35);
      const len = r.range(10, 22);
      const lean = r.range(-3, 3);
      parts.push(
        `<line x1="${bx.toFixed(1)}" y1="${gy.toFixed(1)}" x2="${(bx + lean).toFixed(1)}" ` +
          `y2="${(gy - len).toFixed(1)}" stroke="${rgba(ink, alpha)}" stroke-width="1.6" stroke-linecap="round"/>`,
      );
    }
  }
  return parts.join('');
}

/** EMBER's polka rounds (Day 2 — Marc: "too much like ash texture; polka
 *  dot it instead"): a near-REGULAR grid of large bright dots, barely
 *  jittered and barely varied — order is the separation from ash's
 *  scattered pits, alongside size and polarity. Still sized from the
 *  theme's own radius the way `ashField` is. */
function glintField(seed: number, pitch: number, ink: Rgb, alpha: number, radius: number): string {
  const r = rng(seed);
  const parts: string[] = [];
  for (let gy = pitch / 2; gy < TH; gy += pitch) {
    for (let gx = pitch / 2; gx < TW; gx += pitch) {
      const px = gx + r.range(-pitch * 0.06, pitch * 0.06);
      const py = gy + r.range(-pitch * 0.06, pitch * 0.06);
      const rad = radius * r.range(0.94, 1.06);
      parts.push(
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${rad.toFixed(1)}" fill="${rgba(ink, alpha * r.range(0.95, 1.05))}"/>`,
      );
    }
  }
  return parts.join('');
}

/** Mottled ash pitting (ASH primary + overlay, one jittered field for both frequencies). */
function ashField(seed: number, pitch: number, ink: Rgb, alpha: number, radius: number): string {
  const r = rng(seed);
  const parts: string[] = [];
  for (let gy = pitch / 2; gy < TH; gy += pitch) {
    for (let gx = pitch / 2; gx < TW; gx += pitch) {
      const px = gx + r.range(-pitch * 0.35, pitch * 0.35);
      const py = gy + r.range(-pitch * 0.35, pitch * 0.35);
      const rad = radius * r.range(0.7, 1.3);
      parts.push(
        `<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${rad.toFixed(1)}" fill="${rgba(ink, alpha * r.range(0.7, 1.15))}"/>`,
      );
    }
  }
  return parts.join('');
}

function rippleField(pitch: number, ink: Rgb, alpha: number, bar: number): string {
  const parts: string[] = [];
  for (let y = pitch / 2; y < TH; y += pitch) {
    parts.push(
      `<rect x="0" y="${(y - bar / 2).toFixed(1)}" width="${TW}" height="${bar}" fill="${rgba(ink, alpha)}"/>`,
    );
  }
  return parts.join('');
}

function rubbleBands(angleDeg: number, a: Rgb, b: Rgb, width: number): string {
  return (
    `<pattern id="bands" width="${width * 2}" height="${width * 2}" patternUnits="userSpaceOnUse" ` +
    `patternTransform="rotate(${angleDeg})">` +
    `<rect width="${width}" height="${width * 2}" fill="${hex(a)}"/>` +
    `<rect x="${width}" width="${width}" height="${width * 2}" fill="${hex(b)}"/>` +
    `</pattern>` +
    `<rect width="${TW}" height="${TH}" fill="url(#bands)"/>`
  );
}

/** Radiating fractures out of the scorch point — SPENT stone's clearest signal. */
function crackLines(seed: number): string {
  const r = rng(seed);
  const cx = TW * 0.46;
  const cy = TH * 0.57;
  const parts: string[] = [];
  const count = 7;
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + r.range(-0.25, 0.25);
    const len = r.range(60, 130);
    const midR = len * r.range(0.4, 0.6);
    const midAngle = angle + r.range(-0.18, 0.18);
    const mx = cx + Math.cos(midAngle) * midR;
    const my = cy + Math.sin(midAngle) * midR;
    const ex = cx + Math.cos(angle) * len;
    const ey = cy + Math.sin(angle) * len;
    const w = r.range(1, 1.8);
    parts.push(
      `<path d="M ${cx.toFixed(1)} ${cy.toFixed(1)} L ${mx.toFixed(1)} ${my.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)}" ` +
        `fill="none" stroke="#0e0b08" stroke-opacity="0.32" stroke-width="${w.toFixed(1)}" stroke-linecap="round"/>`,
    );
  }
  return parts.join('');
}

// ------------------------------------------------- the settlement's figures

/*
 * Everything above this line is WEATHER: moss, dry grass, embers, ash, tide.
 * Everything below it was made by a hand, which is the whole difference
 * between the plane and a place somebody stayed in (`theme/tokens.ts#Motif`).
 *
 * Three rules they all keep, learned from the fields above:
 *
 * 1. **The figure is the silhouette.** A hex is drawn at 34–100 px on a phone,
 *    so a crate is a rounded square with a lit top and not a crate. Detail
 *    below about six file-pixels is a smudge and costs a build for nothing.
 * 2. **Light comes from the theme, never from a constant.** The plane's slots
 *    hard-code `0xf7e6be` and `0xffecc8` for "flame" and "torchlight"; these
 *    take `T.ink.lit`, which is the direction's own lamplight, so a palette
 *    move carries the highlights with it.
 * 3. **A highlight stays under the alpha the plane's do** (0.04–0.07). A
 *    centred label sits on the middle of this tile, and `paint.test` has
 *    already caught one direction putting a third colour under one.
 *
 * They cover more than the hex, unlike the plane's fields: a rotated band that
 * stops at the file edge leaves triangular gaps in the corners once the group
 * is turned, which is visible on a leaned board where the corners are what you
 * see. Cheap to over-draw, and the clip pays for it.
 */

/** How far past the file a rotated field is drawn, so a turn cannot uncover a corner. */
const OVER = Math.max(TW, TH);

/**
 * FARM. A ploughed row: the trench, and the crest beside it that the lamps
 * catch. Jittered per row, because a field is ploughed by somebody walking and
 * a printed rule is the one thing a furrow never looks like.
 */
function furrowField(
  seed: number,
  pitch: number,
  ink: Rgb,
  alpha: number,
  bar: number,
  lit: Rgb,
): string {
  const r = rng(seed);
  const parts: string[] = [];
  for (let y = -OVER; y < TH + OVER; y += pitch) {
    const pts: string[] = [];
    for (let x = -OVER; x <= TW + OVER; x += 46) {
      pts.push(`${x},${(y + r.range(-2.4, 2.4)).toFixed(1)}`);
    }
    const d = `M ${pts.join(' L ')}`;
    parts.push(
      `<path d="${d}" fill="none" stroke="${rgba(ink, alpha)}" stroke-width="${bar.toFixed(1)}" stroke-linecap="round"/>`,
    );
    // The crest, half a bar above the trench it was thrown out of.
    parts.push(
      `<path d="${d}" transform="translate(0,${(-bar * 0.8).toFixed(1)})" fill="none" ` +
        `stroke="${rgba(lit, 0.05)}" stroke-width="${(bar * 0.5).toFixed(1)}"/>`,
    );
  }
  return parts.join('');
}

/** FARM's crop, planted IN the rows rather than scattered over them — which is
 *  the difference between a field and a meadow, and the reason this is not
 *  `tuftField` with a different colour. */
function cropRows(
  seed: number,
  rowPitch: number,
  alongPitch: number,
  ink: Rgb,
  alpha: number,
): string {
  const r = rng(seed);
  const parts: string[] = [];
  for (let y = -OVER; y < TH + OVER; y += rowPitch) {
    for (let x = -OVER; x < TW + OVER; x += alongPitch) {
      const cx = x + r.range(-alongPitch * 0.18, alongPitch * 0.18);
      const cy = y + r.range(-3, 3);
      const clumps = 2 + Math.floor(r.range(0, 2));
      for (let i = 0; i < clumps; i++) {
        parts.push(
          `<circle cx="${(cx + r.range(-5, 5)).toFixed(1)}" cy="${(cy + r.range(-3.5, 3.5)).toFixed(1)}" ` +
            `r="${r.range(3, 5.6).toFixed(1)}" fill="${rgba(ink, alpha)}"/>`,
        );
      }
    }
  }
  return parts.join('');
}

/** MARKET. Awning cloth: the stripe, and the fold-shadow under it that says
 *  the cloth has a thickness. Drawn as horizontal bars and turned by the
 *  theme's own angle, the same convention every band in this file follows. */
function awningStripes(pitch: number, bar: number, ink: Rgb, alpha: number, shade: Rgb): string {
  const parts: string[] = [];
  for (let y = -OVER; y < TH + OVER; y += pitch) {
    parts.push(
      `<rect x="${-OVER}" y="${y.toFixed(1)}" width="${TW + OVER * 2}" height="${bar.toFixed(1)}" fill="${rgba(ink, alpha)}"/>`,
    );
    parts.push(
      `<rect x="${-OVER}" y="${(y + bar).toFixed(1)}" width="${TW + OVER * 2}" ` +
        `height="${(bar * 0.34).toFixed(1)}" fill="${rgba(shade, alpha * 0.5)}"/>`,
    );
  }
  return parts.join('');
}

/** MARKET's goods: stacked crates seen from above, each with the lit top edge
 *  that keeps a dark square from reading as a hole in the ground. Square, and
 *  slightly askew, because that is the one silhouette on this board that no
 *  natural thing makes. */
function crateField(
  seed: number,
  pitch: number,
  ink: Rgb,
  alpha: number,
  size: number,
  lit: Rgb,
): string {
  const r = rng(seed);
  const parts: string[] = [];
  for (let gy = pitch / 2; gy < TH + pitch; gy += pitch) {
    for (let gx = pitch / 2; gx < TW + pitch; gx += pitch) {
      const cx = gx + r.range(-pitch * 0.3, pitch * 0.3);
      const cy = gy + r.range(-pitch * 0.3, pitch * 0.3);
      const s = size * r.range(0.8, 1.35);
      const w = (s * 2).toFixed(1);
      const x = (cx - s).toFixed(1);
      const y = (cy - s).toFixed(1);
      parts.push(
        `<g transform="rotate(${r.range(-14, 14).toFixed(1)} ${cx.toFixed(1)} ${cy.toFixed(1)})">` +
          `<rect x="${x}" y="${y}" width="${w}" height="${w}" rx="${(s * 0.22).toFixed(1)}" fill="${rgba(ink, alpha)}"/>` +
          `<rect x="${x}" y="${y}" width="${w}" height="${(s * 0.44).toFixed(1)}" rx="${(s * 0.18).toFixed(1)}" fill="${rgba(lit, 0.07)}"/>` +
          `</g>`,
      );
    }
  }
  return parts.join('');
}

/** QUARRY. The benches: a cut face is a stack of steps, and a step is a dark
 *  undercut with a lit lip on top of it. This is the layer that says the rock
 *  was TAKEN rather than that it broke. */
function benchLines(pitch: number, ink: Rgb, alpha: number, bar: number, lit: Rgb): string {
  const parts: string[] = [];
  for (let y = -OVER; y < TH + OVER; y += pitch) {
    parts.push(
      `<rect x="${-OVER}" y="${y.toFixed(1)}" width="${TW + OVER * 2}" height="${bar.toFixed(1)}" fill="${rgba(ink, alpha)}"/>`,
    );
    parts.push(
      `<rect x="${-OVER}" y="${(y - bar * 0.9).toFixed(1)}" width="${TW + OVER * 2}" ` +
        `height="${(bar * 0.7).toFixed(1)}" fill="${rgba(lit, 0.055)}"/>`,
    );
  }
  return parts.join('');
}

/** QUARRY's rubble: chips, not pits. Broken stone is angular and ash is not,
 *  which is the whole reason this is a polygon and `ashField` is a circle. */
function chipField(seed: number, pitch: number, ink: Rgb, alpha: number, radius: number): string {
  const r = rng(seed);
  const parts: string[] = [];
  for (let gy = pitch / 2; gy < TH; gy += pitch) {
    for (let gx = pitch / 2; gx < TW; gx += pitch) {
      const cx = gx + r.range(-pitch * 0.34, pitch * 0.34);
      const cy = gy + r.range(-pitch * 0.34, pitch * 0.34);
      const sides = 4 + Math.floor(r.range(0, 3));
      const pts: string[] = [];
      for (let i = 0; i < sides; i++) {
        const a = (Math.PI * 2 * i) / sides + r.range(-0.22, 0.22);
        const rad = radius * r.range(0.55, 1.25);
        pts.push(`${(cx + Math.cos(a) * rad).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`);
      }
      parts.push(
        `<polygon points="${pts.join(' ')}" fill="${rgba(ink, alpha * r.range(0.75, 1.15))}"/>`,
      );
    }
  }
  return parts.join('');
}

/** ROADS. Paving: the course joint, the lit leading edge of the stones under
 *  it, and cross joints STAGGERED course by course — paving is laid to break
 *  its joints, and an aligned grid reads as bathroom tile. */
function cobbleCourses(
  seed: number,
  pitch: number,
  joint: number,
  dark: Rgb,
  darkAlpha: number,
  lit: Rgb,
  litAlpha: number,
): string {
  const r = rng(seed);
  const parts: string[] = [];
  let row = 0;
  for (let y = -OVER; y < TH + OVER; y += pitch, row++) {
    parts.push(
      `<rect x="${-OVER}" y="${y.toFixed(1)}" width="${TW + OVER * 2}" height="${joint.toFixed(1)}" fill="${rgba(dark, darkAlpha)}"/>`,
    );
    parts.push(
      `<rect x="${-OVER}" y="${(y + joint).toFixed(1)}" width="${TW + OVER * 2}" ` +
        `height="${(joint * 0.8).toFixed(1)}" fill="${rgba(lit, litAlpha)}"/>`,
    );
    const stone = pitch * 1.35;
    for (let x = -OVER + (row % 2) * stone * 0.5; x < TW + OVER; x += stone) {
      parts.push(
        `<rect x="${(x + r.range(-stone * 0.16, stone * 0.16)).toFixed(1)}" y="${y.toFixed(1)}" ` +
          `width="${joint.toFixed(1)}" height="${pitch.toFixed(1)}" fill="${rgba(dark, darkAlpha * 0.85)}"/>`,
      );
    }
  }
  return parts.join('');
}

/**
 * Worked-out ground: a pit cut in benches, where the plane cracks open.
 *
 * The plane's spent tile is the aftermath of a burn — a scorch and fractures
 * radiating out of it. A settlement's spent tile is the aftermath of WORK, and
 * the difference is legible: the hollow is stepped down in arcs, the marks run
 * with the benches rather than out from a centre, and the lit lip on each arc
 * says the pit has depth rather than that the ground broke.
 *
 * The scorch itself stays, under its own name, because it is doing a second
 * job: it is the dark that a centred label reads against on the palest ground
 * this direction has.
 */
function pitTerraces(seed: number, lit: Rgb): string {
  const r = rng(seed);
  const cx = TW * 0.46;
  const cy = TH * 0.57;
  const parts: string[] = [];
  for (let ring = 0; ring < 3; ring++) {
    const rad = 46 + ring * 40;
    /*
     * Each bench gets its own centre and its own wobble, and both are the
     * finding rather than decoration. Drawn as true arcs about one point —
     * which is what this was, first pass — a stepped pit reads as a RIPPLE:
     * three concentric circles is the one figure water makes, on the one
     * board where nothing is allowed to look like water except ROADS.
     */
    const ox = cx + r.range(-16, 16);
    const oy = cy + r.range(-13, 13);
    const arcs = 2 + ring;
    for (let i = 0; i < arcs; i++) {
      const from = (Math.PI * 2 * i) / arcs + r.range(0.1, 0.6);
      const span = r.range(0.8, 1.5);
      const pts: string[] = [];
      for (let k = 0; k <= 7; k++) {
        const a = from + (span * k) / 7;
        const rr = rad + r.range(-7, 7);
        pts.push(`${(ox + Math.cos(a) * rr).toFixed(1)},${(oy + Math.sin(a) * rr).toFixed(1)}`);
      }
      const d = `M ${pts.join(' L ')}`;
      parts.push(
        `<path d="${d}" fill="none" stroke="#100c08" stroke-opacity="0.26" ` +
          `stroke-width="${r.range(1.6, 2.8).toFixed(1)}" stroke-linecap="round"/>`,
      );
      // The lit lip of the bench above the cut — depth, not a second line.
      parts.push(
        `<path d="${d}" transform="translate(0,-3)" fill="none" stroke="${rgba(lit, 0.06)}" ` +
          `stroke-width="1.4" stroke-linecap="round"/>`,
      );
    }
  }
  // Tool marks: short cuts running down the face, square to the benches.
  for (let i = 0; i < 9; i++) {
    const a = r.range(0, Math.PI * 2);
    const from = r.range(40, 130);
    const len = r.range(12, 26);
    parts.push(
      `<line x1="${(cx + Math.cos(a) * from).toFixed(1)}" y1="${(cy + Math.sin(a) * from).toFixed(1)}" ` +
        `x2="${(cx + Math.cos(a) * (from + len)).toFixed(1)}" y2="${(cy + Math.sin(a) * (from + len)).toFixed(1)}" ` +
        `stroke="#100c08" stroke-opacity="0.2" stroke-width="1.4" stroke-linecap="round"/>`,
    );
  }
  return parts.join('');
}

// ------------------------------------------------------------------ slots

function wrap(defsAndLayers: string, clipId: string): string {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}" viewBox="0 0 ${TW} ${TH}">` +
    `<defs>${clipDef(clipId, 0.06)}</defs>` +
    `<g clip-path="url(#${clipId})">${defsAndLayers}</g>` +
    `</svg>`
  );
}

/** File-pixel geometry from theme "texture pixel" units — one factor, named. */
const SCALE = 6;

function planeGreen(): string {
  const s = T.terrain.green;
  const primary = need('terrain.green pattern', s.pattern, 'hatch');
  const overlay = need('terrain.green overlay', s.overlay, 'dots');
  const pitch = (primary.bar + primary.gap) * SCALE;
  const bar = primary.bar * SCALE;
  return wrap(
    fillRect(s) +
      `<g transform="rotate(${primary.angleDeg} ${TCX} ${TCY})">${rippleField(pitch, primary.ink, primary.alpha, bar)}</g>` +
      tuftField(101, overlay.pitch * SCALE, overlay.ink, overlay.alpha) +
      depthRect(),
    'clipGreen',
  );
}

/**
 * FARM — planted rows, and a crop growing in them.
 *
 * The theme's own words for this ground, made literal: the hatch is the
 * furrow's axis, so it is drawn as ploughed rows with a lamplit crest, and the
 * dot overlay is the crop, planted ALONG those rows instead of scattered over
 * them. The plane's green is moss, which clumps wherever it likes; this one
 * was sown by somebody walking in a straight line.
 */
function settlementGreen(): string {
  const s = T.terrain.green;
  const rows = need('terrain.green pattern', s.pattern, 'hatch');
  const crop = need('terrain.green overlay', s.overlay, 'dots');
  const pitch = (rows.bar + rows.gap) * SCALE;
  return wrap(
    fillRect(s) +
      `<g transform="rotate(${rows.angleDeg} ${TCX} ${TCY})">` +
      furrowField(111, pitch, rows.ink, rows.alpha, rows.bar * SCALE, T.ink.lit) +
      cropRows(112, pitch, crop.pitch * SCALE, crop.ink, crop.alpha) +
      `</g>` +
      depthRect(),
    'clipGreen',
  );
}

function planeYellow(): string {
  // The roles swapped 2026-08-20 with the theme (Marc: "dotted for ember
  // its clearer"): dots are the pattern now — bright sparks, sized off the
  // theme's radius like ash's are — and the dry-grass blades read off the
  // hatch OVERLAY, a quiet undertone beneath them.
  const s = T.terrain.yellow;
  const primary = need('terrain.yellow pattern', s.pattern, 'dots');
  const overlay = need('terrain.yellow overlay', s.overlay, 'hatch');
  const bladePitch = (overlay.bar + overlay.gap) * SCALE;
  return wrap(
    fillRect(s) +
      bladeField(202, bladePitch, overlay.ink, overlay.alpha) +
      glintField(
        203,
        primary.pitch * SCALE,
        primary.ink,
        primary.alpha,
        primary.radius * (SCALE - 1),
      ) +
      depthRect(),
    'clipYellow',
  );
}

/**
 * MARKET — awnings over stacked goods.
 *
 * **This is the slot that baked EMPTY.** The plane's brightest ground is
 * dotted and this one is striped, so both of the old kind guards missed and
 * MARKET — the ground with the most light on it, the one a player looks at
 * first — shipped as a bare gradient while the procedural fallback drew its
 * stripes correctly the whole time.
 *
 * The stripes are cloth, so they get the fold-shadow that gives cloth a
 * thickness, and the dark overlay is goods rather than grit: square, stacked
 * and lit on top. Square is the point — nothing weather makes on this board is
 * square, so a crate reads as somebody's property at any zoom.
 */
function settlementYellow(): string {
  const s = T.terrain.yellow;
  const cloth = need('terrain.yellow pattern', s.pattern, 'hatch');
  const goods = need('terrain.yellow overlay', s.overlay, 'dots');
  return wrap(
    fillRect(s) +
      `<g transform="rotate(${cloth.angleDeg} ${TCX} ${TCY})">` +
      awningStripes(
        (cloth.bar + cloth.gap) * SCALE,
        cloth.bar * SCALE,
        cloth.ink,
        cloth.alpha,
        goods.ink,
      ) +
      `</g>` +
      // The goods are NOT turned with the awning: a stall's cloth runs one way
      // and what is piled under it does not, and two axes is what keeps this
      // from reading as one printed pattern.
      crateField(
        213,
        goods.pitch * SCALE,
        goods.ink,
        goods.alpha,
        // Half again as big as the plane draws the same dot, and the reason is
        // what the mark IS: a dot's radius describes a grain of something, and
        // a crate is a thing a person could lift. At grain scale the goods
        // read as dirt on the awning. The theme's PITCH still sets how much of
        // the ground they cover, so the direction keeps the say that matters.
        goods.radius * SCALE * 1.5,
        T.ink.lit,
      ) +
      depthRect(),
    'clipYellow',
  );
}

function planeRed(): string {
  const s = T.terrain.red;
  const primary = need('terrain.red pattern', s.pattern, 'dots');
  const overlay = need('terrain.red overlay', s.overlay, 'dots');
  return wrap(
    fillRect(s) +
      ashField(
        303,
        primary.pitch * SCALE,
        primary.ink,
        primary.alpha,
        primary.radius * (SCALE - 1),
      ) +
      ashField(
        304,
        overlay.pitch * SCALE,
        overlay.ink,
        overlay.alpha,
        overlay.radius * (SCALE - 1),
      ) +
      // Mounded rows catching the flame on the ridges — a couple of soft
      // horizontal highlight bands, the direction's own original words for
      // this colour, still true once it had a name.
      `<rect y="118" width="${TW}" height="14" fill="${rgba(0xf7e6be, 0.05)}"/>` +
      `<rect y="226" width="${TW}" height="10" fill="${rgba(0xf7e6be, 0.04)}"/>` +
      depthRect(),
    'clipRed',
  );
}

/**
 * QUARRY — cut faces and rubble.
 *
 * The overlay is the half that went missing here (a hatch where the plane's
 * red is dots over dots), and it is the half that carries the meaning: a cut
 * face is a stack of benches, and benches are what say the stone was TAKEN.
 * The dots become chips rather than pits for the same reason — ash settles
 * round and broken rock does not.
 *
 * No flame bands. The plane's red gets two hard-coded highlight rows for
 * "mounded rows catching the flame"; there is no flame in a settlement, so the
 * light here is the lit lip on each bench, and it comes off `T.ink.lit` rather
 * than out of a constant.
 */
function settlementRed(): string {
  const s = T.terrain.red;
  const rubble = need('terrain.red pattern', s.pattern, 'dots');
  const cuts = need('terrain.red overlay', s.overlay, 'hatch');
  return wrap(
    fillRect(s) +
      `<g transform="rotate(${cuts.angleDeg} ${TCX} ${TCY})">` +
      benchLines((cuts.bar + cuts.gap) * SCALE, cuts.ink, cuts.alpha, cuts.bar * SCALE, T.ink.lit) +
      `</g>` +
      chipField(313, rubble.pitch * SCALE, rubble.ink, rubble.alpha, rubble.radius * (SCALE - 1)) +
      depthRect(),
    'clipRed',
  );
}

function planeBlue(): string {
  const s = T.terrain.blue;
  const primary = need('terrain.blue pattern', s.pattern, 'hatch');
  const overlay = need('terrain.blue overlay', s.overlay, 'hatch');
  return wrap(
    fillRect(s) +
      rippleField(
        (primary.bar + primary.gap) * SCALE,
        primary.ink,
        primary.alpha,
        primary.bar * SCALE,
      ) +
      rippleField(
        (overlay.bar + overlay.gap) * SCALE,
        overlay.ink,
        overlay.alpha,
        overlay.bar * SCALE,
      ) +
      // The specular note — reflected torchlight catching recessed water.
      `<rect y="150" width="${TW}" height="26" fill="${rgba(0xffecc8, 0.05)}"/>` +
      depthRect(),
    'clipBlue',
  );
}

/**
 * ROADS — paving, laid in courses, wet enough to hold the lamplight.
 *
 * Both of this ground's layers are hatches in both fictions, so this is the
 * one settlement slot that lost nothing — and it is still the wrong drawing,
 * because two ripple fields are a tide and a road is not. The dark hatch
 * becomes the joint between courses, the light one becomes the lit leading
 * edge of the stones below it, and the cross joints break course by course
 * the way paving is actually laid.
 */
function settlementBlue(): string {
  const s = T.terrain.blue;
  const sheen = need('terrain.blue pattern', s.pattern, 'hatch');
  const joints = need('terrain.blue overlay', s.overlay, 'hatch');
  return wrap(
    fillRect(s) +
      `<g transform="rotate(${joints.angleDeg} ${TCX} ${TCY})">` +
      cobbleCourses(
        413,
        (joints.bar + joints.gap) * SCALE,
        joints.bar * SCALE,
        joints.ink,
        joints.alpha,
        sheen.ink,
        sheen.alpha * 0.5,
      ) +
      `</g>` +
      // The wet band: one street's worth of lamplight lying on the stone,
      // off the direction's own lit ink rather than the plane's torch.
      `<rect y="150" width="${TW}" height="26" fill="${rgba(T.ink.lit, 0.05)}"/>` +
      depthRect(),
    'clipBlue',
  );
}

/**
 * Blocked ground, in every direction.
 *
 * SHARED between the motifs on purpose, and it is the one surface that can be:
 * a settlement's blocked ground is unbuilt rock, which is the same rock the
 * plane's is. It is the only thing on this board nobody made.
 */
function wallSvg(): string {
  const p = need('wall pattern', T.wall.pattern, 'bands');
  return wrap(rubbleBands(p.angleDeg, p.a, p.b, p.width * (SCALE / 2)) + depthRect(), 'clipWall');
}

/*
 * Spent ground's `overlay` (a 25° hatch, declared by all five directions) is
 * deliberately not drawn by either motif: the scorch and the marks over it are
 * already the two loudest things on this tile, and a third layer under a
 * centred label is what `paint.test` exists to catch. Left declared because
 * the live painter draws it and the two are allowed to differ in RICHNESS —
 * never in which ground this is.
 */
function planeStone(): string {
  const s = T.stone;
  const primary = need('stone pattern', s.pattern, 'dots');
  return wrap(
    fillRect(s) +
      ashField(
        404,
        primary.pitch * SCALE,
        primary.ink,
        primary.alpha,
        primary.radius * (SCALE - 1),
      ) +
      scorchRect() +
      crackLines(405) +
      depthRect(),
    'clipStone',
  );
}

/** Worked-out ground: the same hollow, cut in benches instead of cracked open.
 *  See `pitTerraces` for why the scorch stays under a different fiction. */
function settlementStone(): string {
  const s = T.stone;
  const dust = need('stone pattern', s.pattern, 'dots');
  return wrap(
    fillRect(s) +
      // Dust is dust in both fictions — this layer is `ashField` on purpose.
      ashField(414, dust.pitch * SCALE, dust.ink, dust.alpha, dust.radius * (SCALE - 1)) +
      scorchRect() +
      pitTerraces(415, T.ink.lit) +
      depthRect(),
    'clipStone',
  );
}

function ghostSvg(): string {
  const s = T.ghost;
  return wrap(
    fillRect(s) +
      `<radialGradient id="glow" cx="${TCX}" cy="${TCY}" r="${TSIZE * 0.9}" gradientUnits="userSpaceOnUse">` +
      `<stop offset="0" stop-color="#ffffff" stop-opacity="0.22"/>` +
      `<stop offset="0.6" stop-color="#ffffff" stop-opacity="0.04"/>` +
      `<stop offset="1" stop-color="#ffffff" stop-opacity="0"/>` +
      `</radialGradient>` +
      `<rect width="${TW}" height="${TH}" fill="url(#glow)"/>` +
      depthRect(),
    'clipGhost',
  );
}

// ------------------------------------------------------------------ motifs

/**
 * Which figures each direction's art is drawn from — the table `Motif` names.
 *
 * A motif is a complete set: every slot a direction has, drawn in one
 * vocabulary, so nothing can end up half weather and half street. Where the
 * two genuinely agree the entry is the SAME function rather than a copy —
 * blocked ground is unbuilt rock in both fictions, and a preview is a preview.
 *
 * Adding a direction stays one theme file and one line in `THEMES`, as long as
 * it picks a motif that already exists. Inventing a motif is a bigger thing on
 * purpose: it is a new set of figures, and this table is where the cost of
 * that shows up honestly rather than as a recoloured moss tuft.
 */
type Draw = () => string;

/** The seven files a direction gets. `theme/assets.ts` owns the ids. */
type SlotId =
  | 'terrain.green'
  | 'terrain.yellow'
  | 'terrain.red'
  | 'terrain.blue'
  | 'terrain.wall'
  | 'terrain.stone'
  | 'terrain.ghost';

const MOTIFS: Record<Motif, Record<SlotId, Draw>> = {
  plane: {
    'terrain.green': planeGreen,
    'terrain.yellow': planeYellow,
    'terrain.red': planeRed,
    'terrain.blue': planeBlue,
    'terrain.wall': wallSvg,
    'terrain.stone': planeStone,
    'terrain.ghost': ghostSvg,
  },
  settlement: {
    'terrain.green': settlementGreen,
    'terrain.yellow': settlementYellow,
    'terrain.red': settlementRed,
    'terrain.blue': settlementBlue,
    'terrain.wall': wallSvg,
    'terrain.stone': settlementStone,
    'terrain.ghost': ghostSvg,
  },
};

// -------------------------------------------------------------------- run

type Slot = { readonly id: string; readonly svg: string; readonly terrain: boolean };

for (const theme of THEMES_TO_BAKE) {
  T = theme;
  outDir = fileURLToPath(new URL(`../apps/game/public/assets/${theme.id}/`, import.meta.url));
  mkdirSync(outDir, { recursive: true });
  console.log(`\n--- ${theme.id} · ${theme.motif} ---`);

  const draw = MOTIFS[theme.motif];
  const SLOTS: readonly Slot[] = [
    { id: 'terrain.green', svg: draw['terrain.green'](), terrain: true },
    { id: 'terrain.yellow', svg: draw['terrain.yellow'](), terrain: true },
    { id: 'terrain.red', svg: draw['terrain.red'](), terrain: true },
    { id: 'terrain.blue', svg: draw['terrain.blue'](), terrain: true },
    { id: 'terrain.wall', svg: draw['terrain.wall'](), terrain: false },
    { id: 'terrain.stone', svg: draw['terrain.stone'](), terrain: false },
    { id: 'terrain.ghost', svg: draw['terrain.ghost'](), terrain: false },
    /*
     * `fx.pop` is NOT baked in this body, and the reason is architectural.
     *
     * Ashwake 1 shipped it, and defended it: an audit there called it a
     * redundant radial gradient and it was kept because it carries rays and
     * speckles the procedural fallback does not draw. Both true, and both
     * about Pixi's renderer.
     *
     * Ashwake 2's pop is a different thing. `board/glow.ts` generates ONE
     * white, colour-neutral disc and every direction TINTS it to its own
     * `motion.popColour` through an additive material on an instanced mesh —
     * which is what lets the fade ride a per-instance colour with no
     * transparency, no sorting and no shader. A per-theme, pre-coloured PNG
     * cannot serve that: tinting an already-coloured image is a multiply, and
     * the whole point of the white disc is that it is not one yet.
     *
     * So baking it would ship four unread PNGs — the exact shape this repo
     * keeps getting caught by. `popSvg` stays below, unused, because the
     * decision is the renderer's and could be revisited if the pop ever
     * becomes a sprite again; the slot stays declared in `theme/assets.ts`
     * for the same reason. If Marc wants Ashwake 1's rays back, this line and
     * a consumer in `glow.ts` are the whole change.
     */
  ];

  const terrainLuma: Record<string, number> = {};

  for (const slot of SLOTS) {
    const file = at(`${slot.id}.png`);
    const png = await sharp(Buffer.from(slot.svg)).png({ compressionLevel: 9 }).toBuffer();
    writeFileSync(file, png);
    console.log(`${slot.id}.png written`);

    if (slot.terrain) {
      // Composited over the board's own background, the same near-black every
      // in-play tile actually sits on — a mean over the transparent corners
      // outside the hex clip would understate every colour by the same
      // amount and could still mislead the ordering check below.
      const bg = {
        r: (T.board.background >> 16) & 0xff,
        g: (T.board.background >> 8) & 0xff,
        b: T.board.background & 0xff,
      };
      const stats = await sharp(png).flatten({ background: bg }).stats();
      const [r, g, b] = stats.channels;
      const mean: Rgb =
        (Math.round(r!.mean) << 16) | (Math.round(g!.mean) << 8) | Math.round(b!.mean);
      terrainLuma[slot.id] = luma(mean);
    }
  }

  // The guardrail: the baked art must not invert the ordering the L* test
  // enforces on the raw tokens (theme.test.ts, "separates its four terrains
  // by value, not by hue"). Derived from the theme's own fills rather than
  // hard-coded, so a future palette change re-checks itself.
  const tokenOrder = (['green', 'yellow', 'red', 'blue'] as const)
    .map((c) => {
      const s = T.terrain[c];
      const v = s.fillTo === null ? luma(s.fill) : (luma(s.fill) + luma(s.fillTo)) / 2;
      return [`terrain.${c}`, v] as const;
    })
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);

  const bakedOrder = Object.entries(terrainLuma)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);

  if (tokenOrder.join(',') !== bakedOrder.join(',')) {
    throw new Error(
      `baked terrain PNGs inverted the greyscale ordering the L* test protects: ` +
        `tokens say ${tokenOrder.join(' < ')}, art renders ${bakedOrder.join(' < ')}`,
    );
  }
  console.log(`greyscale ordering holds: ${bakedOrder.join(' < ')}`);
}
