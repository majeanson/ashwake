import { corners } from '@render/layout';
import { ICON_PATH } from './icons.gen';
import { figureCaption, figureLayout, FIGURES, type FigureId, type PlacedCell } from '@view/figure';
import { hex, type Theme } from '@theme/tokens';
import type { Strings } from '@text/Strings';

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
 * a green that no longer exists. Ashwake 1 went further and drew figures from
 * the BAKED tile art; that arrives here when the asset book reaches the chrome,
 * and the shape below is what it plugs into.
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
            const ground =
              cell.ground === 'stone'
                ? theme.stone.fill
                : cell.ground === 'wall'
                  ? theme.wall.fill
                  : theme.terrain[cell.ground].fill;
            const points = corners(cell.x, cell.y, SIZE * 0.94, theme.orientation);
            const path = pairs(points)
              .map(([x, y]) => `${x},${y}`)
              .join(' ');
            return (
              <g key={`${cell.q},${cell.r}`}>
                <polygon points={path} fill={hex(ground)} opacity={cell.faint === true ? 0.4 : 1} />
                {cell.ring !== undefined && (
                  <polygon
                    points={path}
                    fill="none"
                    stroke={hex(ringColour(cell.ring, theme))}
                    strokeWidth={cell.ring === 'ripe' || rarityRing(cell.ring) ? 2.5 : 1.6}
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
                    <path d={ICON_PATH[cell.icon]} fill={hex(toneColour(cell.tone, theme))} />
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
      {spec.cards !== undefined && <FigureCards spec={spec.cards} theme={theme} s={s} />}
      {caption && <figcaption className="note">{label}</figcaption>}
    </figure>
  );
}

/** The stash figure is cards rather than hexes — the one spec with no board. */
function FigureCards({
  spec,
  theme,
  s,
}: {
  readonly spec: NonNullable<(typeof FIGURES)[FigureId]['cards']>;
  readonly theme: Theme;
  readonly s: Strings;
}) {
  return (
    <span style={{ display: 'flex', gap: '0.35rem' }}>
      {spec.map((card, i) => {
        const slot = 'slot' in card;
        return (
          <span
            key={i}
            style={{
              width: '2.6rem',
              height: '3.2rem',
              borderRadius: 4,
              display: 'grid',
              placeItems: 'center',
              fontSize: '0.55rem',
              fontFamily: 'var(--font-label)',
              letterSpacing: 'var(--label-tracking)',
              color: hex(theme.ink.inkDim),
              border: slot
                ? `1px dashed ${hex(theme.ink.panelEdge)}`
                : `1px solid ${hex(theme.terrain[card.colour].fill)}`,
              background: slot ? 'transparent' : hex(theme.terrain[card.colour].fill),
            }}
          >
            {slot ? s.figure.hold : card.held === true ? s.figure.held : ''}
          </span>
        );
      })}
    </span>
  );
}

type Ring = NonNullable<PlacedCell['ring']>;

/** A rarity ring is drawn as thick as a ripe one: on the board it is the
 *  widest stroke a tile can wear, because it is the one that says POWER. */
const rarityRing = (ring: Ring | undefined): boolean => ring === 'magic' || ring === 'unique';

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
