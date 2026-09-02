/**
 * Getting Ashwake onto the home screen, and warning when it cannot stay there
 * (2026-09-02).
 *
 * Two things Ashwake 1 shipped and this body did not, both found by the audit
 * of 2026-09-02 and both about the same fact: **a browser tab is not where this
 * game lives.** It has no backend and no account, so a world exists in exactly
 * one place — this origin's storage on this device — and everything below is
 * about that storage surviving.
 *
 * ## The install offer
 *
 * Chrome fires `beforeinstallprompt` and, if nothing calls `preventDefault`,
 * throws away a NATIVE one-tap install dialog. Ashwake 1's launch audit found
 * its end screen printing a paragraph of menu directions while the browser was
 * holding exactly that dialog unopened. Captured at module scope because the
 * event fires before React has finished mounting.
 *
 * ## The in-app browser
 *
 * A link opened inside Instagram, TikTok, Facebook or Discord runs in a WebView
 * whose storage is partitioned, and is commonly wiped when the host app closes.
 * The world, the records and the hall of fame can silently evaporate. That is
 * precisely where a SHARE link lands most often, which makes this warning the
 * counterweight to the game's own distribution mechanism: `shell/share.ts`
 * already reasons about that WebView (its download rung is written for it)
 * while nothing told the person standing in one.
 *
 * Sniffing user agents is a bad habit and this is the case that earns it: there
 * is no capability to feature-detect. "Is storage about to be thrown away" is
 * not a question a browser answers, and the only signal is who is hosting the
 * view. Wrong answers are cheap in both directions — a false positive is one
 * dismissible line, a false negative is the status quo.
 */

type InstallPromptEvent = Event & { prompt: () => Promise<unknown> };

let captured: InstallPromptEvent | null = null;

// Module scope, and unconditional: the event can fire before the first render,
// and a listener added inside an effect is a listener added too late.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    captured = event as InstallPromptEvent;
  });
}

/** Whether this browser has offered us its install dialog. */
export const canInstall = (): boolean => captured !== null;

/**
 * Fire the captured dialog, once.
 *
 * False where the browser never offered one, or where it has already been
 * spent: a prompt may only be shown once per capture, and asking twice is how
 * a browser decides to stop offering at all.
 */
export function promptInstall(): boolean {
  const prompt = captured;
  if (prompt === null) return false;
  captured = null;
  void prompt.prompt();
  return true;
}

/**
 * Already installed, so there is nothing to offer.
 *
 * `display-mode: standalone` is the PWA answer everywhere; `navigator.standalone`
 * is iOS's own, and iOS is the platform with no `beforeinstallprompt` at all —
 * so it is the only platform where this check does all the work.
 */
export function isInstalled(): boolean {
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
    return (navigator as { standalone?: boolean }).standalone === true;
  } catch {
    // A browser with no `matchMedia` is a browser with no PWA install either.
    return false;
  }
}

/**
 * Inside somebody else's app.
 *
 * The tokens are the four hosts that actually carry shared links, plus the two
 * generic Android WebView markers. Deliberately NOT a general "is this a
 * WebView" test: Safari View Controller and Chrome Custom Tabs keep the real
 * browser's storage and warning about them would be a lie.
 */
export function inAppBrowser(): boolean {
  try {
    const ua = navigator.userAgent;
    return (
      /FBAN|FBAV|Instagram|Line\/|Twitter|TikTok|Discord|Snapchat/.test(ua) ||
      // Android WebViews declare `wv`, or Version/x.y beside Chrome.
      (/\bwv\b/.test(ua) && /Android/.test(ua))
    );
  } catch {
    return false;
  }
}
