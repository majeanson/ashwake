import { useCallback, useEffect, useMemo, useState } from 'react';
import { localToday, markSaid, wasSaid } from './storage';
import { canInstall, inAppBrowser, isInstalled, promptInstall } from './install';

/**
 * The three things `App` knows about the DEVICE rather than about the game
 * (2026-09-08).
 *
 * `App`'s `Game()` is one component with sixty-odd hooks, and most of them
 * deserve to be there: a run's state, the board's handle, the receipts, the
 * teaching drip and the settle are one machine, and cutting them apart would
 * buy tidiness at the price of the thing that makes this file readable — that
 * the order of events is written down in one place, in order.
 *
 * These three are the exception, and the test is simple: **nothing here can
 * see the game.** Whether a browser has offered an install dialog, whether we
 * are inside somebody's in-app webview, and what today's date is are facts
 * about the phone. They have no dependency on a run, no dependency on each
 * other, and — the reason they were worth moving — no reason for a reader
 * following a placement through `act` to walk past them.
 *
 * Each one is a hook rather than a function because each owns state and a
 * listener. They are separately testable here in a way they could not be
 * inside a three-thousand-line component.
 */

/**
 * WHERE THIS GAME IS LIVING — two notes, each said once ever (2026-09-02).
 *
 * `install` is offered only where all three are true: the browser actually
 * handed us a dialog, the app is not already installed, and this device has
 * not been asked before. Sampled into state rather than read during render
 * because `canInstall()` changes when the browser fires its event, and a
 * render that reads a moving global is a render that disagrees with itself.
 *
 * `inApp` is raised at boot rather than on the ending: the whole point is to
 * be read BEFORE a world is built inside storage that will not keep it.
 *
 * Both are LAZY INITIALISERS rather than effects that set state. Whether this
 * is an in-app browser, and whether the app is already installed, are true or
 * false before the first paint — nothing about them arrives later. Deciding in
 * an effect would render once with the answer missing and once with it, which
 * is the cascading render `react-hooks` refuses and which would flash the note
 * in and out. The one thing that DOES arrive later is `beforeinstallprompt`,
 * and that has a listener.
 *
 * The mark is written during initialisation, which is a side effect in a
 * render — deliberately, and it is the same shape `startedFrom` uses: it runs
 * exactly once for the life of the component, and the alternative is showing
 * the note twice on a device that reloads.
 */
export function useInstallOffer(): {
  /** True once, on a device inside an in-app browser that has not been told. */
  readonly inApp: boolean;
  /** The note is dismissible: it arrives unannounced over a game somebody is
   *  starting, and a sentence that cannot be put down is worse than the risk
   *  it describes. */
  readonly dismissInApp: () => void;
  /**
   * The end screen's install offer, or nothing at all.
   *
   * Marked as said at the moment it is OFFERED rather than accepted: a player
   * who read the invitation and did not take it has been invited, and asking
   * again next run is how an invitation becomes nagging.
   */
  readonly offerInstall: (() => void) | undefined;
} {
  const [installable, setInstallable] = useState(() => canInstall() && !isInstalled());
  const [inApp, setInApp] = useState(() => {
    if (!inAppBrowser() || wasSaid('inAppNote')) return false;
    markSaid('inAppNote');
    return true;
  });

  useEffect(() => {
    // The event can arrive after mount. `beforeinstallprompt` is captured at
    // module scope (see `shell/install.ts`); this is only the shell noticing.
    const look = (): void => setInstallable(canInstall() && !isInstalled());
    window.addEventListener('beforeinstallprompt', look);
    return () => window.removeEventListener('beforeinstallprompt', look);
  }, []);

  const offerInstall = useMemo(() => {
    if (!installable || wasSaid('installNudge')) return undefined;
    return () => {
      markSaid('installNudge');
      // False means the browser withdrew the offer between render and tap. The
      // button simply goes, which is honest: there is nothing to open.
      promptInstall();
      setInstallable(false);
    };
  }, [installable]);

  const dismissInApp = useCallback(() => setInApp(false), []);
  return { inApp, dismissInApp, offerInstall };
}

/**
 * Today's date, kept current across a midnight the page was open for.
 *
 * It was `useMemo(localToday, [])` — sampled once, on a page that never
 * reloads. "One page, many sessions" is a house rule, and the installed PWA's
 * NORMAL state is being left open: a phone put down before midnight and picked
 * up after it went on offering YESTERDAY's daily from the front door, and
 * BEGIN would have opened a board whose date the ladder no longer counts.
 * Ashwake 1 hit this in its launch audit and answered it exactly here.
 *
 * Only on `visible`, and only when the date has actually turned, so a phone
 * that is merely unlocked re-renders nothing. A run in PROGRESS is never
 * touched: it banks under the date it started, which is the Wordle rule, and
 * `daily` holds that date independently of this.
 */
export function useToday(): string {
  const [today, setToday] = useState(localToday);
  useEffect(() => {
    const onWake = (): void => {
      if (document.visibilityState !== 'visible') return;
      const now = localToday();
      setToday((was: string) => (was === now ? was : now));
    };
    document.addEventListener('visibilitychange', onWake);
    return () => document.removeEventListener('visibilitychange', onWake);
  }, []);
  return today;
}
