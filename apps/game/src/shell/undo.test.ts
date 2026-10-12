import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { TUNING } from '@content/tuning';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { replayTo } from '@meta/replay';
import { createSession, type Session } from './store';
import { walk } from './walk';

/**
 * UNDO (2026-10-12, a stranger: _"un undo ça serait clutch aussi"_).
 *
 * The mechanism is that a placement is a pure function of the state before it,
 * so taking one back is keeping that state. What is worth testing is not that
 * (it is one assignment) but the three promises around it: the board it gives
 * back is the one the player had, it never reaches across money or a claim,
 * and the film a replay folds is the board on screen.
 */

const session = (seed = 3, undoSteps?: number): Session =>
  createSession({
    seed,
    theme: resolveTheme(null),
    strings: stringsFor(pickLocale(['en'])),
    ...(undoSteps === undefined ? {} : { tuning: { ...TUNING, undoSteps } }),
  });

const legal = (s: Session) => s.get().board.cells.find((c) => c.legal)!;

describe('undo', () => {
  it('gives back exactly the state before the placement', () => {
    const s = session();
    walk(s, 3);
    const before = s.get().state;
    s.dispatch({ type: 'PLACE', hex: legal(s).key });
    expect(s.get().state).not.toBe(before);
    expect(s.get().undoable).toBe(true);

    s.undo();
    expect(s.get().state).toBe(before);
    expect(s.get().undoable).toBe(false);
    expect(s.get().hud.placements).toBe(before.placements);
  });

  it('is silent when there is nothing to take back', () => {
    const s = session();
    const at = s.get().state;
    s.undo();
    expect(s.get().state).toBe(at);
  });

  it('takes back one tile and no more (undoSteps is 1)', () => {
    const s = session();
    walk(s, 2);
    const first = s.get().state;
    s.dispatch({ type: 'PLACE', hex: legal(s).key });
    const second = s.get().state;
    s.dispatch({ type: 'PLACE', hex: legal(s).key });
    s.undo();
    expect(s.get().state).toBe(second);
    s.undo();
    expect(s.get().state).toBe(second);
    expect(second).not.toBe(first);
  });

  it('can be switched off with the dial', () => {
    const s = session(3, 0);
    walk(s, 2);
    s.dispatch({ type: 'PLACE', hex: legal(s).key });
    expect(s.get().undoable).toBe(false);
  });

  it('survives picking up another card, which is not a decision', () => {
    const s = session();
    walk(s, 2);
    s.dispatch({ type: 'PLACE', hex: legal(s).key });
    expect(s.get().undoable).toBe(true);
    s.dispatch({ type: 'SELECT', index: 1 });
    expect(s.get().undoable).toBe(true);
  });

  it('never reaches back across a pop, a spend or a stash', () => {
    // Walk until a pocket is ripe, place once, pop it: the door must close.
    const s = session();
    for (let i = 0; i < 40 && !s.get().hud.canHarvest; i++) walk(s, 1);
    expect(s.get().hud.canHarvest, 'no pocket ever ripened').toBe(true);
    s.dispatch({ type: 'PLACE', hex: legal(s).key });
    expect(s.get().undoable).toBe(true);
    const at = s.get().hud.harvestAt;
    s.dispatch({ type: 'HARVEST', choice: 'tiles', ...(at === null ? {} : { at }) });
    expect(s.get().undoable).toBe(false);
  });

  it('is closed for a placement that claimed something', () => {
    // Seed 122 reaches destinations quickly (see tourTarget.test): the first
    // placement whose receipt is not null must not be one that can be undone.
    const s = session(122);
    let claimed = 0;
    for (let i = 0; i < 40 && !s.get().hud.ended; i++) {
      const cell = s.get().board.cells.find((c) => c.legal);
      if (cell === undefined) break;
      s.dispatch({ type: 'PLACE', hex: cell.key });
      if (s.get().said !== null) {
        claimed++;
        expect(s.get().undoable, 'a claim was left undoable').toBe(false);
      }
    }
    expect(claimed, 'seed 122 never claimed anything, so this proved nothing').toBeGreaterThan(0);
  });

  it('cuts the film back with the board, so a replay folds to what is on screen', () => {
    const s = session();
    walk(s, 4);
    s.dispatch({ type: 'PLACE', hex: legal(s).key });
    s.dispatch({ type: 'SELECT', index: 1 });
    s.undo();
    const film = s.replay();
    expect(replayTo(film, film.moves.length)).toEqual(s.get().state);
  });

  it('forgets on a new run', () => {
    const s = session();
    walk(s, 2);
    s.dispatch({ type: 'PLACE', hex: legal(s).key });
    s.restart(7, null);
    expect(s.get().undoable).toBe(false);
  });
});
