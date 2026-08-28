import { TUNING } from '@content/tuning';
import { newRun } from '@engine/reduce';
import { NAME } from '@meta/identity';
import { toBoardView } from '@view/view';

/**
 * Stage 1's whole claim, on screen: the app reaches the core through its
 * aliases and a run exists. The board and the chrome are Stages 2 and 3.
 */
export function App() {
  const state = newRun(1, TUNING);
  const board = toBoardView(state);
  return (
    <main style={{ fontFamily: 'system-ui', padding: '1rem' }}>
      <h1>{NAME} 2</h1>
      <p>
        Seed 1 · {board.cells.length} cells on the opening board · tiles in the purse: {state.tiles}
      </p>
    </main>
  );
}
