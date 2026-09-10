import { lazy, Suspense, type ComponentType } from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootStrings } from '../shell/locale';
import { isStaleChunk, showFailure } from '../shell/failure';
import { Boundary } from './Boundary';

/**
 * THE STALE-CHUNK LOOP (`PASS.md` P8.1).
 *
 * P8 asks *"is there a state this game can reach where the only exit is
 * clearing site data?"* and P8.1 is the candidate: `Board` is `lazy()`, so an
 * `index.html` that survived a deploy asks for hashed chunk names the new build
 * does not serve, the import rejects, and the panel's CONTINUE re-enters it.
 *
 * ## What is NOT broken, measured before any of this was written
 *
 * **RELOAD escapes.** `public/sw.js` answers navigations network-first with a
 * 2.5 second timeout and falls back to the cached shell only after that — so a
 * reload fetches the new `index.html`, with the new chunk names, whenever the
 * network answers at all promptly. The worst state P8 was written to worry
 * about is therefore not reachable on a working line, and that row's second
 * option — *"the worker's navigation handling is made to guarantee the mismatch
 * cannot happen"* — is substantially already true.
 *
 * On a line slower than 2.5s the cached shell answers instead and the loop IS
 * reachable. That half is a real hole, it wants a decision rather than a patch,
 * and both options are written up in `NEXT.md` §1 unbuilt, exactly as P8.1
 * instructs.
 *
 * ## What these tests pin
 *
 * The mechanism, and the one thing that could be fixed without a decision: a
 * button that provably cannot work is worse than its absence.
 */

/**
 * A BROWSER WITH WebGL, which jsdom is not.
 *
 * The panel splits on `!boardAlive && webglMissing()`, and a stale chunk means
 * the board never drew — so without a probe that answers yes, every failure in
 * jsdom takes the no-WebGL branch, which offers only RELOAD. The first run of
 * this file failed on exactly that, and the detour is worth keeping: **in a
 * browser that genuinely has no WebGL, a stale-chunk failure is reported as
 * "this browser needs WebGL".** A misdiagnosis, and a harmless one — such a
 * browser cannot play either way — noted at P8.3 rather than fixed.
 */
const withWebgl = (): void => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ({ getExtension: () => null }) as unknown as never,
  );
};

const flush = async (): Promise<void> => {
  await act(async () => {
    await Promise.resolve();
  });
};

const STALE = 'Failed to fetch dynamically imported module: /assets/Board-OLD.js';

afterEach(() => {
  document.getElementById('boot-failure')?.remove();
  vi.restoreAllMocks();
});

describe('what a stale chunk is', () => {
  /*
   * Every browser words it differently and none of them uses a distinct error
   * type, so the message is all there is. Broad on purpose: a false positive
   * costs one hidden button on a failure that needed a reload anyway.
   */
  it('recognises how each engine words it', () => {
    for (const message of [
      STALE,
      'Importing a module script failed.',
      'error loading dynamically imported module: /assets/Board-OLD.js',
    ]) {
      expect(isStaleChunk(new Error(message)), message).toBe(true);
    }
  });

  it('does not mistake an ordinary crash for one', () => {
    for (const message of ['Cannot read properties of null', 'three is not a function']) {
      expect(isStaleChunk(new Error(message)), message).toBe(false);
    }
    expect(isStaleChunk('a string nobody threw deliberately')).toBe(false);
  });
});

describe('the loop itself', () => {
  /**
   * THE MECHANISM: `lazy` CACHES ITS REJECTION.
   *
   * React calls the loader once and keeps the settled promise, so a second
   * mount re-throws the stored error **without touching the network**. That is
   * why continuing cannot work for this class, and it is asserted by counting
   * loader calls, because from the outside both attempts look identical — the
   * panel's repeat counter is the only thing that moves.
   *
   * The boundary is reset directly here rather than through the button, since
   * the button is gone for exactly this reason and the mechanism is the claim.
   */
  it('re-throws on a remount without retrying the import', async () => {
    withWebgl();
    let loads = 0;
    // Rejecting rather than `async` + `throw`, which lint reads as an async
    // function with nothing to await — and it is right: what `lazy` needs is a
    // rejected promise, and saying so directly is what a browser hands it.
    const Missing = lazy((): Promise<{ default: ComponentType }> => {
      loads += 1;
      return Promise.reject(new Error(STALE));
    });

    const { rerender } = render(
      <Boundary>
        <Suspense fallback={null}>
          <Missing />
        </Suspense>
      </Boundary>,
    );
    await flush();
    expect(loads, 'the import was never attempted').toBe(1);
    expect(document.getElementById('boot-failure'), 'no panel came up').not.toBeNull();

    // A fresh boundary around the same lazy component is what CONTINUE amounts
    // to: the tree mounts again, and the loader is not consulted.
    rerender(
      <Boundary key="again">
        <Suspense fallback={null}>
          <Missing />
        </Suspense>
      </Boundary>,
    );
    await flush();
    expect(loads, 'a retry would mean React had not cached the rejection').toBe(1);
  });
});

describe('what the panel offers', () => {
  /*
   * `Boundary`'s own docblock states the rule: *"a button that says CONTINUE
   * has to continue into something."* A stale chunk is the case that breaks it,
   * so the panel stops offering one — while keeping RELOAD, which is the exit
   * that works, and the report, which is worth having.
   *
   * This is the assertion that fails without the fix.
   */
  it('withholds CONTINUE for a stale chunk, and keeps RELOAD', () => {
    withWebgl();
    showFailure(bootStrings(), new Error(STALE));
    const panel = document.getElementById('boot-failure');
    expect(panel, 'no panel').not.toBeNull();
    expect(
      panel?.querySelector('[data-crash="continue"]'),
      'CONTINUE was offered for a failure it provably cannot fix',
    ).toBeNull();
    expect(panel?.querySelector('[data-crash="reload"]'), 'RELOAD went missing').not.toBeNull();
    expect(panel?.querySelector('[data-crash="send"]'), 'the report went missing').not.toBeNull();
  });

  it('still offers CONTINUE for an ordinary crash', () => {
    withWebgl();
    showFailure(bootStrings(), new Error('Cannot read properties of null'), () => undefined);
    const panel = document.getElementById('boot-failure');
    expect(
      panel?.querySelector('[data-crash="continue"]'),
      'CONTINUE was withheld from a survivable error',
    ).not.toBeNull();
  });

  /**
   * And the counter is what a player has instead of an explanation — P8.6.
   *
   * The panel counts repeats rather than stacking, which is right, and the
   * count is the only evidence that a loop is happening at all.
   */
  it('counts a repeat rather than stacking a second panel', () => {
    withWebgl();
    showFailure(bootStrings(), new Error(STALE));
    const first = document.getElementById('boot-failure-count')?.textContent ?? '';
    showFailure(bootStrings(), new Error(STALE));
    expect(document.querySelectorAll('#boot-failure').length, 'a second panel stacked').toBe(1);
    const second = document.getElementById('boot-failure-count')?.textContent ?? '';
    expect(first, 'the count said nothing').not.toBe('');
    expect(second, 'the count did not move on a repeat').not.toBe(first);
  });
});
