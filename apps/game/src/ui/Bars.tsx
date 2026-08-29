/**
 * Label, bar, number — a breakdown you can read at a glance (Stage 4,
 * 2026-08-29).
 *
 * Ashwake 1 printed its points distribution as three columns of bare numbers,
 * and the thing a player actually wants from it — *which of these was big* —
 * took arithmetic to see. A bar answers that before it is read.
 *
 * The bar is proportional to the LARGEST row rather than to the total, because
 * the question is which source beat the others; scaled to the total, six of
 * seven rows are slivers and the chart says nothing. Rows worth nothing still
 * appear, so the shape of the list never jumps between two runs.
 *
 * Colour is a caller's choice and always a CSS variable, never a literal — a
 * chart drawn in colours the board does not use is an illustration of the game
 * instead of the game.
 */

export type Bar = {
  readonly label: string;
  readonly value: number;
  /** A CSS colour, normally `var(--tile-green)` and friends. Defaults to ink. */
  readonly paint?: string | undefined;
};

export function Bars({
  rows,
  heading,
}: {
  readonly rows: readonly Bar[];
  readonly heading?: string;
}) {
  const top = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="bars">
      {heading !== undefined && <h3 className="fact-label">{heading}</h3>}
      {rows.map((row) => (
        <div key={row.label} className="bar-row">
          <span className="fact-label bar-name">{row.label}</span>
          <span className="bar-track">
            {/* Presentational: the number beside it is what a screen reader
                reads, so the bar itself is not announced twice. */}
            <span
              className="bar-fill"
              aria-hidden="true"
              style={{
                width: `${(row.value / top) * 100}%`,
                ...(row.paint === undefined ? {} : { background: row.paint }),
              }}
            />
          </span>
          <span className="fact-value bar-value">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
