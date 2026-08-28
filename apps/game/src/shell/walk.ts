import type { CellView } from '@render/Renderer';
import type { Session } from './store';

/**
 * A deterministic opening (Stage 2b, 2026-08-28).
 *
 * Screenshots of a camera angle are only worth comparing if the board under
 * them is the same board. Tapping the canvas is not that: where a ring of taps
 * lands depends on the very angle the shot is meant to be showing, so every
 * angle got its own run, and the two Stage 2 shots in `docs/shots/` differ in
 * their tiles as well as their camera.
 *
 * So: `?place=n` plays the first n placements through the same reducer a
 * finger would, choosing the legal hex the tile is worth most on and breaking
 * ties by coordinate. It reads only what the board view already offers, it
 * decides nothing a rule decides, and it is off unless asked for. It is not an
 * AI and is not trying to play well — it is a fixed hand, so that a picture
 * taken twice differs only where the look differs.
 */
export function walk(session: Session, steps: number): void {
  for (let i = 0; i < steps; i++) {
    const best = bestLegal(session.get().board.cells);
    if (best === null) return;
    const before = session.get().state;
    session.dispatch({ type: 'PLACE', hex: best.key });
    // A refused placement would loop forever; the run has stalled, so stop.
    if (session.get().state === before) return;
  }
}

/** Worth first, then the northmost, then the westmost — a total order, so the
 *  same board plays the same way on every device and every run. */
function bestLegal(cells: readonly CellView[]): CellView | null {
  let best: CellView | null = null;
  for (const cell of cells) {
    if (!cell.legal) continue;
    if (best === null || better(cell, best)) best = cell;
  }
  return best;
}

function better(cell: CellView, than: CellView): boolean {
  const a = cell.preview ?? 0;
  const b = than.preview ?? 0;
  if (a !== b) return a > b;
  if (cell.r !== than.r) return cell.r < than.r;
  return cell.q < than.q;
}
