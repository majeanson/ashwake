import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RESTORE_MS, watchContext } from './gl';

/**
 * A CONTEXT THAT COMES BACK, AND ONE THAT DOES NOT (`PASS.md` P8.3).
 *
 * `watchContext` has been in the build since 2026-09-02 and nothing has ever
 * run it. What it does is small and entirely about timing, which is exactly
 * what a docblock cannot prove: the loss must be cancelled or the browser never
 * offers a restore; a restore must redraw or `frameloop="demand"` leaves a
 * recovered board blank; and — since today — a restore that never arrives must
 * become a sentence rather than a black rectangle under a working HUD.
 *
 * Fake timers, because the whole subject is a four-second wait.
 */

const canvasWithLoss = (): HTMLCanvasElement => document.createElement('canvas');

/** The event the browser sends, and the only thing about it that matters. */
function lose(canvas: HTMLCanvasElement): Event {
  const event = new Event('webglcontextlost', { cancelable: true });
  canvas.dispatchEvent(event);
  return event;
}

describe('watching a lost context', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /*
   * The one line the whole feature rests on. A `webglcontextlost` that is not
   * cancelled is permanent: no `webglcontextrestored` is ever fired, whatever
   * the device does afterwards.
   */
  it('cancels the loss, which is what asks for the context back', () => {
    const canvas = canvasWithLoss();
    watchContext(canvas, vi.fn(), vi.fn());
    expect(lose(canvas).defaultPrevented, 'the loss was not cancelled').toBe(true);
  });

  it('redraws when it comes back, because a demand-driven board would not', () => {
    const canvas = canvasWithLoss();
    const redraw = vi.fn();
    watchContext(canvas, redraw, vi.fn());
    lose(canvas);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    expect(redraw).toHaveBeenCalledTimes(1);
  });

  it('tells the player when it never comes back', () => {
    const canvas = canvasWithLoss();
    const onLost = vi.fn();
    watchContext(canvas, vi.fn(), onLost);
    lose(canvas);

    // Not a moment early: a panel over a blink is worse than no panel.
    vi.advanceTimersByTime(RESTORE_MS - 1);
    expect(onLost, 'the panel came up while a restore was still plausible').not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onLost, 'a board that never came back said nothing').toHaveBeenCalledTimes(1);
  });

  it('says nothing at all when the context comes back in time', () => {
    const canvas = canvasWithLoss();
    const onLost = vi.fn();
    watchContext(canvas, vi.fn(), onLost);
    lose(canvas);
    vi.advanceTimersByTime(RESTORE_MS - 1);
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    vi.advanceTimersByTime(RESTORE_MS * 2);
    expect(onLost, 'a recovered board raised a panel about being lost').not.toHaveBeenCalled();
  });

  /*
   * A phone can lose the context repeatedly while it is under pressure. Each
   * loss restarts the wait rather than stacking a second timer, so a board that
   * flickers through three losses and recovers says nothing.
   */
  it('restarts the wait on a second loss rather than stacking one', () => {
    const canvas = canvasWithLoss();
    const onLost = vi.fn();
    watchContext(canvas, vi.fn(), onLost);
    lose(canvas);
    vi.advanceTimersByTime(RESTORE_MS - 1);
    lose(canvas);
    vi.advanceTimersByTime(RESTORE_MS - 1);
    expect(onLost).not.toHaveBeenCalled();
    canvas.dispatchEvent(new Event('webglcontextrestored'));
    vi.advanceTimersByTime(RESTORE_MS * 2);
    expect(onLost, 'a flickering board that recovered still raised a panel').not.toHaveBeenCalled();
  });

  /*
   * The `<Canvas>` is never unmounted (`CLAUDE.md`), so this teardown has no
   * caller today — which is the reason to pin it rather than to drop it: a
   * pending timer that outlives its listeners would fire a panel about a board
   * that no longer exists.
   */
  it('drops a pending wait when it is torn down', () => {
    const canvas = canvasWithLoss();
    const onLost = vi.fn();
    const stop = watchContext(canvas, vi.fn(), onLost);
    lose(canvas);
    stop();
    vi.advanceTimersByTime(RESTORE_MS * 2);
    expect(onLost).not.toHaveBeenCalled();
  });
});
