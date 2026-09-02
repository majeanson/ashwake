/**
 * The service worker: Ashwake, offline (Stage 4, 2026-08-29).
 *
 * The game has been client-only since the first line — no backend, no account,
 * no network in the loop — so "works on the métro" is a caching problem and
 * nothing else. The strategy lives in `public/sw.js`; this file is only the
 * two things the PAGE owes it: registering it after the first playable frame,
 * and noticing when a new build has taken over underneath.
 *
 * **This is one of the two reloads `CLAUDE.md` allows.** A scene change is a
 * state change and never a navigation — but a build that has already replaced
 * the bundle under a running page is the one case where the page in memory and
 * the code on disk genuinely disagree, and no amount of state can fix that.
 * The player is asked rather than reloaded under: losing a run to a hotfix
 * would be the update mechanism eating the thing it exists to protect.
 */

/** How often a backgrounded phone re-checks. */
const CHECK_MS = 15 * 60 * 1000;

/**
 * How long registration waits if the browser never goes idle.
 *
 * Installing the worker downloads the ENTIRE precache — the bundle, the fonts,
 * every piece of theme art — and doing that while the board is instancing its
 * first frames is a first minute competing with a feature that only ever makes
 * the SECOND visit better. It waits its turn.
 */
const YIELD_MS = 2000;

/** Run when the browser has nothing better to do, or after `YIELD_MS`. */
function whenIdle(work: () => void): void {
  const idle = (globalThis as { requestIdleCallback?: (cb: () => void, o?: object) => number })
    .requestIdleCallback;
  if (typeof idle === 'function') idle(work, { timeout: YIELD_MS });
  else setTimeout(work, YIELD_MS);
}

/**
 * Register, and hand back the way to undo it (2026-09-02).
 *
 * This returned `void`, and it starts three long-lived things: a
 * `controllerchange` listener, an interval that polls for a new worker every
 * few minutes, and a `visibilitychange` listener. Its caller is a React
 * effect, and an effect that starts a timer and returns no cleanup is a timer
 * that outlives whatever asked for it — under StrictMode, twice over, on the
 * first mount of every dev session.
 *
 * A teardown, so the effect can be an effect. It is deliberately safe to call
 * before the registration has resolved: the flag below is what the pending
 * `then` checks, so a page torn down during the idle wait installs nothing it
 * cannot stop.
 */
export function registerWorker(onUpdate: () => void): () => void {
  // Dev never registers one — a cached bundle is the last thing you want while
  // editing, and `import.meta.env.DEV` is compiled out of the build.
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) return () => {};

  // `controllerchange` also fires on the very FIRST install, when the page
  // goes from uncontrolled to controlled. Telling a player who just arrived
  // that there is a new version would be a lie; only a page that already had a
  // controller has actually been updated under.
  const hadController = navigator.serviceWorker.controller !== null;
  const onController = (): void => {
    if (hadController) onUpdate();
  };
  navigator.serviceWorker.addEventListener('controllerchange', onController);

  const stop: (() => void)[] = [
    () => navigator.serviceWorker.removeEventListener('controllerchange', onController),
  ];
  let live = true;

  whenIdle(() => {
    if (!live) return;
    void navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        if (!live) return;
        // A backgrounded phone only looks for a new worker when it NAVIGATES,
        // which on a launch day is exactly when a hotfix most needs to reach it.
        const poll = setInterval(() => void registration.update().catch(() => undefined), CHECK_MS);
        const onShow = (): void => {
          if (document.visibilityState === 'visible') {
            void registration.update().catch(() => undefined);
          }
        };
        document.addEventListener('visibilitychange', onShow);
        stop.push(() => {
          clearInterval(poll);
          document.removeEventListener('visibilitychange', onShow);
        });
      })
      .catch(() => {
        // No offline play. Everything else still works, so this is not worth a
        // word on screen.
      });
  });

  return () => {
    live = false;
    for (const undo of stop) undo();
  };
}
