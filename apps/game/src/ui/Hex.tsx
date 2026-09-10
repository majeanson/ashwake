import { corners } from '@render/layout';
import type { Colour } from '@content/tuning';
import { hex, type Theme } from '@theme/tokens';

/**
 * One hex, drawn the way the board draws one (2026-08-30).
 *
 * Marc: *"in how to play we reuse the same visuals as in game for all"*, and
 * then *"make sure unselected card tiles blend in with the game, no border,
 * only the selected one."* Both asks end here.
 *
 * The chrome used to draw a ground three different ways: a rounded SQUARE in
 * the legend, a flat polygon in the figures, and an `<img>` in the hand. The
 * board draws one thing — a hex, filled with its baked art, sometimes ringed —
 * so that is what this is, and the legend, the figures and the hand all ask it
 * for the same picture.
 *
 * **The RING is why this exists rather than an `<img>`.** A rare tile's rarity
 * was carried by the card's BORDER, which is a rounded rectangle around a
 * hexagon and is also the border Marc asked to take away. On the board, rarity
 * is a ring around the hex itself (`board/rings.ts`), so a card wearing one is
 * the card agreeing with the board rather than inventing a second language for
 * the same fact.
 *
 * Geometry from `render/layout.ts`'s own `corners()`, at the direction's
 * orientation, so a hex here turns when the board's facing does and nothing in
 * the chrome decides what a hex looks like. The box is exactly the hex's
 * bounding box, so a caller sizes it with CSS and gets no letterboxing.
 *
 * The art is allowed to be absent — a direction with nothing baked is a
 * supported state — which is why the flat fill is painted UNDER the picture
 * rather than instead of it.
 */

/**
 * The hex's circumradius in the SVG's own units. The box is derived from it,
 * and every caller scales the whole thing with CSS.
 *
 * Exported because a ring's width is a BOARD number: `board/rings.ts` draws in
 * hex radii, so a caller wanting the board's own stroke multiplies by this
 * rather than guessing a pixel count that drifts from it.
 */
export const HEX_R = 50;
const R = HEX_R;

type HexProps = {
  readonly theme: Theme;
  /** A ground to fill, or absent for a ring drawn around nothing. */
  readonly ground?: Colour | 'stone' | 'wall' | undefined;
  /** The baked picture for this ground, or null where none is baked. */
  readonly art?: string | null | undefined;
  /** A ring colour, from the theme. */
  readonly ring?: number | undefined;
  /** How wide the ring is drawn, in the same units as `R`. */
  readonly ringWidth?: number | undefined;
  /** Distinguishes this drawing's clip path from every other on the page. */
  readonly id: string;
  readonly className?: string | undefined;
};

export function Hex({ theme, ground, art, ring, ringWidth = 6, id, className }: HexProps) {
  // A hex is not square: flat-top is wide, pointy-top is tall. The box is the
  // real bounding box so a caller's width and height mean what they say.
  const pointy = theme.orientation === 'pointy';
  const halfW = pointy ? (Math.sqrt(3) / 2) * R : R;
  const halfH = pointy ? R : (Math.sqrt(3) / 2) * R;
  // Inset by half the stroke, so a ring is drawn inside the box rather than
  // clipped by it.
  const inset = ring === undefined ? 0 : ringWidth / 2;
  const points = pairs(corners(halfW, halfH, R - inset, theme.orientation))
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
  const picture = art === undefined || art === '' ? null : art;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${halfW * 2} ${halfH * 2}`}
      aria-hidden="true"
      focusable="false"
    >
      {ground !== undefined && <polygon points={points} fill={hex(fillOf(ground, theme))} />}
      {picture !== null && (
        <>
          <clipPath id={id}>
            <polygon points={points} />
          </clipPath>
          <image
            href={picture}
            x={0}
            y={0}
            width={halfW * 2}
            height={halfH * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${id})`}
          />
        </>
      )}
      {ring !== undefined && (
        <polygon points={points} fill="none" stroke={hex(ring)} strokeWidth={ringWidth} />
      )}
    </svg>
  );
}

const fillOf = (ground: Colour | 'stone' | 'wall', theme: Theme) =>
  ground === 'stone'
    ? theme.stone.fill
    : ground === 'wall'
      ? theme.wall.fill
      : theme.terrain[ground].fill;

function pairs(flat: readonly number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i]!, flat[i + 1]!]);
  return out;
}
