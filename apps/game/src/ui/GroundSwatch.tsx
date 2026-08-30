import { corners } from '@render/layout';
import type { Colour } from '@content/tuning';
import { hex, type Theme } from '@theme/tokens';
import type { GroundArt } from '../shell/art';

/**
 * A ground, or a ring, at the size a legend row wants it (2026-08-30).
 *
 * Marc: *"in how to play we reuse the same visuals as in game for all."* The
 * legend drew a ground as a rounded SQUARE of `theme.terrain[c].fill`, and a
 * board edge as a square with a border. The board draws neither of those
 * things: a ground is a baked, textured HEX, and an edge is a ring around one.
 * A legend whose alphabet is drawn in a different hand from the board's is
 * teaching a second alphabet.
 *
 * Same geometry as the board and the figures — `corners()` from
 * `render/layout.ts`, at the direction's own orientation — so a legend swatch
 * turns with the board when a facing changes, and nothing here decides what a
 * hex looks like.
 *
 * Not `Swatch`, which is a different thing with a confusable name: that one is
 * a whole DIRECTION shown as a palette strip in the appearance picker. This is
 * one ground.
 *
 * The art is allowed to be absent — a direction with nothing baked is a
 * supported state — which is why the flat fill is painted UNDER the picture
 * rather than instead of it.
 */

const SIZE = 11;

export type GroundSwatchProps = {
  readonly theme: Theme;
  /** A ground to fill, or absent for a ring drawn around nothing. */
  readonly ground?: Colour | 'stone' | 'wall' | undefined;
  /** A ring colour, for the two rows that are about an EDGE. */
  readonly ring?: number | undefined;
  readonly art?: GroundArt | undefined;
};

export function GroundSwatch({ theme, ground, ring, art }: GroundSwatchProps) {
  const w = SIZE * 2;
  const points = corners(w / 2, w / 2, SIZE * 0.94, theme.orientation);
  const path = pairs(points)
    .map(([x, y]) => `${x},${y}`)
    .join(' ');
  const picture = ground === undefined ? null : (art?.[ground] ?? null);
  const clip = `ground-${ground ?? 'edge'}-${theme.id}`;

  return (
    <svg
      className="legend-swatch"
      viewBox={`0 0 ${w} ${w}`}
      width={w}
      height={w}
      aria-hidden="true"
    >
      {ground !== undefined && <polygon points={path} fill={hex(fillOf(ground, theme))} />}
      {picture !== null && (
        <>
          <clipPath id={clip}>
            <polygon points={path} />
          </clipPath>
          <image
            href={picture}
            x={0}
            y={0}
            width={w}
            height={w}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clip})`}
          />
        </>
      )}
      {ring !== undefined && (
        <polygon points={path} fill="none" stroke={hex(ring)} strokeWidth={2.5} />
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
