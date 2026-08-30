/**
 * The shape of a run: every harvest, in order, as a column (Stage 4,
 * 2026-08-29).
 *
 * Gate D's question is whether a run has an ARC — whether the big moment lands
 * late — and `hud.summary.biggestAt` answers it as a number. This is the same
 * answer as a picture, which is the form a player recognises: a rising
 * staircase is a run that built to something, a flat row is a plateau, a spike
 * at the left is a run that peaked early and coasted.
 *
 * SVG rather than canvas because it is a dozen rectangles that must scale with
 * the text around them, and it inherits `currentColor` so it cannot disagree
 * with the direction it is drawn in. The tallest bar is the run's biggest
 * harvest, and it is tinted with the accent so the eye finds WHEN rather than
 * how much.
 */

/** Wide enough to read a long run's shape, short enough not to own the screen. */
const H = 40;
const GAP = 1;

export function Arc({
  points,
  label,
}: {
  readonly points: readonly number[];
  readonly label: string;
}) {
  /*
   * Fewer than two harvests is not a SHAPE (2026-08-29, Marc, with a picture:
   * "shape of the run is not working").
   *
   * It drew one bar at full width and full height — every point is the biggest
   * point when there is only one — so a run with a single scoring pop showed a
   * solid gold rectangle captioned THE SHAPE OF THE RUN. Not a bug in the
   * drawing: a chart of one number is a lie however it is drawn, and the honest
   * answer is to say nothing. The numbers above it already say what happened.
   */
  if (points.length < 2) return null;
  const top = Math.max(...points, 1);
  const best = points.indexOf(top);
  const w = 100 / points.length;

  return (
    <figure className="arc">
      <svg
        className="arc-chart"
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
      >
        {points.map((p, i) => {
          // A floor of one unit, so a harvest that scored nothing is still a
          // harvest that happened rather than a gap in the run.
          const h = Math.max(1, (p / top) * H);
          return (
            <rect
              key={i}
              x={i * w}
              y={H - h}
              width={Math.max(0.5, w - GAP)}
              height={h}
              className={i === best ? 'arc-bar arc-best' : 'arc-bar'}
            />
          );
        })}
      </svg>
      <figcaption className="fact-label">{label}</figcaption>
    </figure>
  );
}
