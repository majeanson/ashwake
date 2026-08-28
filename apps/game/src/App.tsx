import { pickLocale } from '@content/locale';
import { TUNING } from '@content/tuning';
import { newRun } from '@engine/reduce';
import { NAME } from '@meta/identity';
import { stringsFor } from '@text/index';
import { toBoardView } from '@view/view';

/**
 * Stage 1's whole claim, on screen: the app reaches the core through its
 * aliases, a run exists, and — since Stage 1b — it speaks the device's
 * language. The board and the chrome are Stages 2 and 3; the LANGUAGE row
 * that overrides this pick arrives with SETTINGS in Stage 3.
 */
export function App() {
  const strings = stringsFor(pickLocale(navigator.languages));
  const state = newRun(1, TUNING);
  const board = toBoardView(state);
  return (
    <main lang={strings.locale} style={{ fontFamily: 'system-ui', padding: '1rem' }}>
      <h1>{NAME} 2</h1>
      <p>{strings.tagline}</p>
      <p>
        {strings.locale} · seed 1 · {board.cells.length} · {state.tiles}
      </p>
    </main>
  );
}
