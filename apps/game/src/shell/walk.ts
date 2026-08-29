import type { CellView } from '@render/Renderer';
import type { Session } from './store';

/**
 * A deterministic opening, and a whole deterministic run (Stage 2b,
 * 2026-08-28; taught to harvest Stage 3, 2026-08-29).
 *
 * Screenshots of a camera angle are only worth comparing if the board under
 * them is the same board. Tapping the canvas is not that: where a ring of taps
 * lands depends on the very angle the shot is meant to be showing, so every
 * angle got its own run, and the two Stage 2 shots in `docs/shots/` differ in
 * their tiles as well as their camera.
 *
 * So: `?place=n` plays the first n turns through the same reducer a finger
 * would. It places on the legal hex the tile is worth most on, and **when it
 * cannot place it harvests**, which is what turns a fixed opening into a fixed
 * RUN — the end screen has no other way to be reached, and a screen that can
 * only be seen by playing for ten minutes is a screen that never gets looked
 * at.
 *
 * It reads only what the board view already offers and decides nothing a rule
 * decides. It is not an AI and is not trying to play well; it is a fixed hand,
 * so that a picture taken twice differs only where the look differs.
 */
export function walk(session: Session, steps: number): void {
  for (let i = 0; i < steps; i++) {
    if (session.get().hud.ended) return;
    if (!step(session)) return;
  }
}

/** Play until the run is over, or give up after `cap` turns. */
export function walkToEnd(session: Session, cap = 400): void {
  for (let i = 0; i < cap; i++) {
    if (session.get().hud.ended) return;
    if (!step(session)) return;
  }
}

/** One turn: place if there is anywhere worth placing, else harvest. Returns
 *  false when the run has nothing left to do, which is not the same as ended. */
function step(session: Session): boolean {
  const before = session.get().state;

  const best = bestLegal(session.get().board.cells);
  if (best !== null) {
    session.dispatch({ type: 'PLACE', hex: best.key });
    if (session.get().state !== before) return true;
  }

  // Out of ground or out of purse: take what is ripe. A run that never
  // harvests never spends and never ends.
  if (session.get().hud.canHarvest) {
    const at = session.get().hud.harvestAt;
    session.dispatch({ type: 'HARVEST', choice: 'tiles', ...(at === null ? {} : { at }) });
    if (session.get().state !== before) return true;
  }

  // A refused action would loop forever; the run has stalled, so stop.
  return false;
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
