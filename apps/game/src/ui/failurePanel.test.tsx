import { afterEach, describe, expect, it, vi } from 'vitest';
import { bootStrings } from '../shell/locale';
import { showBoardLost, showFailure } from '../shell/failure';

/**
 * THE PANEL'S TWO UNEXERCISED CLASSES (`PASS.md` P8.3).
 *
 * The no-WebGL split has been in `failure.ts` since Stage 4 and nothing has
 * ever run it: every other test either has a board alive or stubs a context in.
 * It is also the branch that has now been WRONG twice, in the two other rows of
 * this item — a stale chunk (P8.1) and an offline second visit (P8.5) both
 * reach it, because "the board never drew" is true of all three and the probe
 * cannot tell them apart. So what it says here is pinned before P8.3 goes near
 * the wording.
 *
 * The second class is today's: a board that had a context and lost it for good.
 *
 * jsdom is a browser with no WebGL, which for once is the fixture rather than
 * the obstacle — `webglMissing()` answers honestly and no stub is needed.
 */

const s = bootStrings();

const panel = (): HTMLElement | null => document.getElementById('boot-failure');
const sentence = (): string => panel()?.querySelector('p')?.textContent ?? '';
const buttons = (): string[] =>
  [...(panel()?.querySelectorAll('[data-crash]') ?? [])].map(
    (el) => (el as HTMLElement).dataset['crash'] ?? '',
  );

/** A browser that HAS WebGL, so the no-WebGL branch stops swallowing every case. */
const withWebgl = (): void => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ({ getExtension: () => null }) as unknown as never,
  );
};

afterEach(() => {
  panel()?.remove();
  vi.restoreAllMocks();
});

describe('a browser with no WebGL', () => {
  it('is told that, and offered the only button that is not a lie', () => {
    showFailure(s, new Error('Cannot read properties of null'));
    expect(sentence(), 'a WebGL-less browser was told something broke').toBe(s.ui.crash.noWebgl);
    /*
     * RELOAD alone. There is no game underneath to continue into, and the
     * message already says everything a report could: the device cannot draw.
     */
    expect(buttons()).toEqual(['reload']);
  });
});

describe('a board that lost its context for good', () => {
  /*
   * The sentence is the point of this class existing. `broke` says *"Something
   * broke. Your run is saved. CONTINUE if the game still works underneath"* —
   * and nothing broke, the game DOES work underneath, and continuing is the
   * one thing that cannot help. `boardLost` says what happened and what to do.
   */
  it('says what happened rather than that something broke', () => {
    withWebgl();
    showBoardLost();
    expect(sentence()).toBe(s.ui.crash.boardLost);
  });

  it('withholds CONTINUE, and keeps RELOAD and the report', () => {
    withWebgl();
    showBoardLost();
    expect(
      buttons(),
      'CONTINUE would hand back a black rectangle with a working HUD on it',
    ).toEqual(['reload', 'send', 'copy']);
  });

  /*
   * And the class is not a catch-all: an ordinary crash on a device that CAN
   * draw still gets the survivable sentence and a way back in. Without this,
   * a classifier that answered `board-lost` too eagerly would look green.
   */
  it('does not swallow an ordinary crash', () => {
    withWebgl();
    showFailure(s, new Error('Cannot read properties of null'), () => undefined);
    expect(sentence()).toBe(s.ui.crash.broke);
    expect(buttons()).toContain('continue');
  });
});
