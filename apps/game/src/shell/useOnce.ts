import { useRef } from 'react';

/**
 * Build a thing exactly once per mounted component, during the first render
 * (2026-09-02).
 *
 * ## Why not `useMemo`
 *
 * Because `useMemo` does not promise it. React may drop a memo at any time,
 * and under StrictMode it **double-invokes the factory on purpose** — that is
 * how StrictMode catches side effects hiding in render. `App` built its whole
 * session inside one: minting a world seed, WRITING it to `localStorage`,
 * reading the run off the disk, registering callbacks, and — with `?place=n`
 * or `?end=1` — walking the reducer through an entire scripted run. In dev
 * that all happened twice.
 *
 * ## Why not `useState`
 *
 * StrictMode double-invokes lazy state initialisers too, for the same reason.
 *
 * ## Why not an effect
 *
 * Because an effect runs after the first render, and the thing being built is
 * what the first render draws. `App`'s `startedFrom` states the same
 * constraint from the other side: an effect would run after the effects that
 * READ it, and on an `?end=1` boot the run is already over by then.
 *
 * ## So: a ref, guarded
 *
 * A ref survives StrictMode's second render of the same component instance, so
 * the guard sees a value and the maker is not called again. This is the one
 * shape that actually runs once, and it is the shape `startedFrom` already
 * uses; the point of naming it is that the exception below can be argued in
 * one place instead of at every line that touches the result.
 *
 * **It is still a side effect in render, and that is still not free.** What it
 * is now is a side effect that happens once, said out loud, rather than one
 * behind a promise `useMemo` never made.
 */
export function useOnce<T>(make: () => T): T {
  const held = useRef<T | null>(null);
  /*
   * `react-hooks/refs` forbids reading a ref during render, and it is right
   * about the reason: a value React cannot see change must not decide what is
   * drawn. This value never changes — that is the whole contract — so there is
   * nothing for React to miss.
   *
   * Disabled HERE, once, rather than at the dozen call sites that would each
   * have to make the same argument. What comes out of this function is an
   * ordinary value.
   */
  held.current ??= make();
  // eslint-disable-next-line react-hooks/refs
  return held.current;
}
