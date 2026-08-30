import { useId } from 'react';
import { corners } from '@render/layout';
import { figureCaption, figureLayout, FIGURES, type FigureId, type PlacedCell } from '@view/figure';
import { hex, type Theme } from '@theme/tokens';
import type { Strings } from '@text/Strings';
import { useGroundArt, type GroundArt } from '../shell/art';
import { ICON_PATH } from './icons.gen';
import { Tile } from './Tile';

/**
 * A little board, drawn (Stage 3, 2026-08-29).
 *
 * The core deliberately does not draw this. `figureLayout` is pure geometry —
 * it runs the same `place()` the board runs, at the direction's own
 * orientation, and normalises the result to a box — and drawing it was left to
 * the app when the DOM builders came out of `view/` in Stage 1b.
 *
 * **A figure draws in the board's own colours**, from the same theme tokens the
 * board reads, which is the property that stops a diagram of RIPE from showing
 * a green that no longer exists.
 *
 * ## And in the board's own PICTURES, since 2026-08-30
 *
 * Marc: *"in how to play we reuse the same visuals as in game for all."* This
 * file's own docblock has said since Stage 3 that Ashwake 1 drew its figures
 * from the BAKED tile art and that this one would "when the asset book reaches
 * the chrome" — which it did on 2026-08-30, for the hand's cards. So a figure
 * fills each hex with the very PNG the board composites into that ground, and
 * falls back to the flat fill where a direction has none baked. A diagram of a
 * rule that shows a ground the game does not draw is a diagram teaching the
 * wrong alphabet, however right its geometry is.
 *
 * The RINGS are the board's too. `rare` used to draw a star on each tile,
 * because Ashwake 1's 2D board printed one; this board gives a rare tile a ring
 * in its rarity's colour and stands it taller (`board/rings.ts`,
 * `board/relief.ts`), so the figure draws a ring — and draws it at the width
 * the board uses, because a 1.6px hairline on a 21px hex is a ring nobody sees.
 *
 * SVG rather than canvas: it is a dozen polygons, it scales without a
 * resolution decision, and it costs no context.
 */

export type FigureProps = {
  readonly id: FigureId;
  readonly theme: Theme;
  readonly s: Strings;
  /** The manual draws a figure with its caption; a card draws it without. */
  readonly caption?: boolean;
};

const SIZE = 21;

export function Figure({ id, theme, s, caption = false }: FigureProps) {
  const spec = FIGURES[id];
  const layout = figureLayout(spec, theme.orientation, SIZE);
  const label = figureCaption(id, s);
  const art = useGroundArt(theme.id);
  // One id per rendered figure: two figures on one screen would otherwise
  // define the same clip path twice and the second would win for both.
  const clip = useId();

  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {layout.cells.length > 0 && (
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          width={layout.width}
          height={layout.height}
          role="img"
          aria-label={label}
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          {layout.cells.map((cell) => {
            const points = corners(cell.x, cell.y, SIZE * 0.94, theme.orientation);
            const path = pairs(points)
              .map(([x, y]) => `${x},${y}`)
              .join(' ');
            const picture = art[cell.ground];
            const id = `${clip}-${cell.q},${cell.r}`;
            return (
              <g key={`${cell.q},${cell.r}`} opacity={cell.faint === true ? 0.4 : 1}>
                {/* The flat fill is under the art rather than instead of it:
                    it is the fallback for a direction with nothing baked, and
                    it is also what shows through a hex's own transparent
                    surround while the PNG is still loading. */}
                <polygon points={path} fill={hex(groundFill(cell, theme))} />
                {picture !== null && (
                  <>
                    <clipPath id={id}>
                      <polygon points={path} />
                    </clipPath>
                    <image
                      href={picture}
                      x={cell.x - SIZE}
                      y={cell.y - SIZE}
                      width={SIZE * 2}
                      height={SIZE * 2}
                      preserveAspectRatio="xMidYMid slice"
                      clipPath={`url(#${id})`}
                    />
                  </>
                )}
                {cell.ring !== undefined && (
                  <polygon
                    points={path}
                    fill="none"
                    stroke={hex(ringColour(cell.ring, theme))}
                    strokeWidth={ringWidth(cell.ring)}
                  />
                )}
                {/*
                  A MARK is a Phosphor path, drawn into the figure's own SVG at
                  the hex it belongs to (2026-08-30). It was a `<text>` set in
                  the display face, which asked a wordmark font to answer for
                  `✚ ★ ◈` — the same request the board was making of the same
                  font, and the reason both are icons now. The number labels
                  below stay text, because a number IS text.
                */}
                {cell.icon !== undefined && (
                  <g
                    transform={`translate(${cell.x - SIZE * 0.42} ${cell.y - SIZE * 0.42}) scale(${(SIZE * 0.84) / 256})`}
                  >
                    <path
                      d={ICON_PATH[cell.icon]}
                      fill={hex(toneColour(cell.tone, theme))}
                      stroke={hex(theme.ink.halo)}
                      strokeWidth={SIZE * 0.06 * (256 / (SIZE * 0.84))}
                      paintOrder="stroke"
                    />
                  </g>
                )}
                {cell.mark !== undefined && (
                  <text
                    x={cell.x}
                    y={cell.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={SIZE * 0.7}
                    fontFamily="var(--font-display)"
                    fill={hex(toneColour(cell.tone, theme))}
                    stroke={hex(theme.ink.halo)}
                    strokeWidth={SIZE * theme.ink.haloWidth * 0.4}
                    paintOrder="stroke"
                  >
                    {cell.mark}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      )}
      {spec.cards !== undefined && <FigureCards spec={spec.cards} theme={theme} s={s} art={art} />}
      {caption && <figcaption className="note">{label}</figcaption>}
    </figure>
  );
}

/**
 * The stash figure is cards rather than hexes — the one spec with no board.
 *
 * **And they are the REAL cards** (2026-08-30). This drew its own spans in the
 * terrain fill: a rounded rectangle with a word in it, beside a hand that
 * draws a baked hex with its mark and its name on it. Two pictures of one
 * thing, and the one in the manual was the one nobody had looked at since the
 * hand was rebuilt. `Tile` is the hand's own component, so the card in the
 * lesson is now the card under your thumb — including the dashed HOLD slot,
 * which is the whole subject of this figure.
 */
function FigureCards({
  spec,
  theme,
  s,
  art,
}: {
  readonly spec: NonNullable<(typeof FIGURES)[FigureId]['cards']>;
  readonly theme: Theme;
  readonly s: Strings;
  readonly art: GroundArt;
}) {
  return (
    <span className="figure-cards">
      {spec.map((card, i) =>
        'slot' in card ? (
          <span key={i} className="tile hold" aria-hidden="true">
            {s.ui.hold}
          </span>
        ) : (
          <Tile
            key={i}
            colour={card.colour}
            rarity="common"
            theme={theme}
            s={s}
            art={art[card.colour]}
            {...(card.held === true ? { held: true } : {})}
          />
        ),
      )}
    </span>
  );
}

type Ring = NonNullable<PlacedCell['ring']>;

/** What a ground is painted before its picture lands. Stone and wall have
 *  their own fills; the four terrains are the theme's. */
const groundFill = (cell: PlacedCell, theme: Theme) =>
  cell.ground === 'stone'
    ? theme.stone.fill
    : cell.ground === 'wall'
      ? theme.wall.fill
      : theme.terrain[cell.ground].fill;

/**
 * How wide a ring is drawn, at figure scale.
 *
 * The board's own widths are in world units and this is 21 pixels a hex, so
 * they are ported by EYE rather than by number: RIPE and the two rarities are
 * the strokes the board draws thick, and a legal edge is the quiet one. The
 * rarity rings were 1.6 here and invisible — the picture's whole claim is that
 * a rare tile wears one.
 */
const ringWidth = (ring: Ring): number =>
  ring === 'ripe' || ring === 'magic' || ring === 'unique' ? 3 : 1.6;

/** A figure's rings are the board's rings — spent ground wears the quiet edge
 *  every other cell wears, which is what makes SPENT read as "was, and is not". */
const ringColour = (ring: Ring, theme: Theme) =>
  ring === 'ripe'
    ? theme.board.ripeEdge
    : ring === 'legal'
      ? theme.board.legalEdge
      : ring === 'lit'
        ? theme.ink.lit
        : // MAGIC and UNIQUE are the board's own rarity rings (`board/rings.ts`),
          // and the figure draws them because the board does — it drew stars
          // until 2026-08-30, which is a mark this body has never printed.
          ring === 'magic'
          ? theme.ink.magic
          : ring === 'unique'
            ? theme.ink.unique
            : theme.board.edge;

const toneColour = (tone: 'magic' | 'unique' | undefined, theme: Theme) =>
  tone === 'magic' ? theme.ink.magic : tone === 'unique' ? theme.ink.unique : theme.ink.ink;

/** `corners` returns a flat [x, y, ...] list; SVG wants points. */
function pairs(flat: readonly number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) out.push([flat[i]!, flat[i + 1]!]);
  return out;
}
