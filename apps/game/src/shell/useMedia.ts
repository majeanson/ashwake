import { useCallback, useSyncExternalStore } from 'react';

/**
 * What the DEVICE is asking for, and kept up to date (2026-08-29).
 *
 * Three preferences reach this game from the OS rather than from its own
 * settings — reduced motion, the light/dark scheme, and more contrast — and all
 * three can change while a page is open: a phone crossing sunset flips its
 * scheme, and someone who turns motion down mid-run has almost certainly turned
 * it down BECAUSE of what is on screen.
 *
 * So a `change` listener rather than a sample. `CLAUDE.md`'s one-page rule is
 * the reason it matters here more than it would elsewhere: the only reloads
 * this game allows are the service-worker update and the boot-failure panel, so
 * a preference read once at boot is a preference wrong until the player closes
 * the tab. Ashwake 1 learned exactly this and grew `followReducedMotion` on
 * 2026-08-21; this body sampled once and, for reduced motion, not at all.
 *
 * `matchMedia` is absent in some test environments and old WebViews, so a
 * missing one answers false rather than throwing — the honest default for
 * every query here, each of which asks "is something switched ON".
 */
/**
 * A media query IS an external store, so it is read as one (2026-09-02).
 *
 * This was `useState` plus an effect that called `setMatches(list.matches)` on
 * subscribe — with a comment saying why: *"a change between the first render
 * and this effect would otherwise be missed for the life of the page."* The
 * concern is real and the fix was a cascading render on every mount of every
 * one of the four queries this game asks, on the boot path, to set state to
 * the value it already had.
 *
 * `useSyncExternalStore` is the shape that answers the concern without the
 * cascade: React re-reads the snapshot itself after subscribing and again
 * before every commit, so a change during the gap is caught by the mechanism
 * rather than by an extra render.
 *
 * The third argument is the server snapshot, and it answers `false` for the
 * same reason `askOnce` does: every query here asks "is something switched
 * ON", so the honest answer where nothing can be asked is no.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof matchMedia !== 'function') return () => {};
      const list = matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );
  const now = useCallback(() => askOnce(query), [query]);
  return useSyncExternalStore(subscribe, now, () => false);
}

function askOnce(query: string): boolean {
  if (typeof matchMedia !== 'function') return false;
  try {
    return matchMedia(query).matches;
  } catch {
    return false;
  }
}

/**
 * Every animation this game runs is opt-out, and this is the switch.
 *
 * It was PLUMBED and never connected: `Board`, `HexField` and `Pop` all take a
 * `reducedMotion` prop and honour it, and no caller ever passed one — so the
 * flick momentum, the pop's leap, the beacons' breath and the embers ran at
 * full tilt however the phone was set. `ui.css` honoured the same preference
 * for the DOM, which is what made the gap easy to miss: the chrome obeyed and
 * the board did not.
 */
export const useReducedMotion = (): boolean => useMediaQuery('(prefers-reduced-motion: reduce)');
