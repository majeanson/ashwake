import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { localToday, markInstallShown, markSaid, readInstallShown, wasSaid } from './storage';
import { installOfferDue } from './installDue';
import { canInstall, inAppBrowser, isInstalled, needsHandInstall, promptInstall } from './install';

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
 * WHERE THIS GAME IS LIVING — the install offer and the in-app note (2026-09-02;
 * the offer's timing re-ruled 2026-09-16, see the function).
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
export function useInstallOffer(atDoor: boolean): {
  /** True once, on a device inside an in-app browser that has not been told. */
  readonly inApp: boolean;
  /** The note is dismissible: it arrives unannounced over a game somebody is
   *  trying to start, and a warning with no way to put it down is a wall. */
  readonly dismissInApp: () => void;
  /**
   * Open the browser's own install dialog, where it has handed us one and the
   * calendar says the offer is due (`shell/installDue.ts`). Undefined
   * everywhere else — which is most places, and the front door renders
   * nothing for it.
   */
  readonly offerInstall: (() => void) | undefined;
  /**
   * Say how to install by hand, on the platform with no dialog (iOS Safari),
   * where the calendar says the offer is due.
   */
  readonly showHandInstall: boolean;
} {
  /*
   * WHEN (Marc, 2026-09-16, asked outright): **right away, on the front door,
   * and again after a week if the device is still in the browser — then
   * never.** `installDue.ts` is that rule; this hook samples the clock and
   * the storage, and marks a showing at the moment the door shows it.
   *
   * Until today both offers came once ever on the END SCREEN, and the iPhone
   * sentence was marked said in this initialiser — at mount — while the
   * screen that printed it was a whole run away. A friend who closed the tab
   * mid-run had spent their one showing on a screen they never reached, which
   * is a large part of why the offer was "unseen" on every phone asked. The
   * door is the screen at mount, so marking here is marking when shown; and
   * `atDoor` keeps a Chrome event that arrives mid-run from spending a showing
   * on a button nobody can see.
   */
  const [showHandInstall] = useState(() => {
    if (!atDoor || !needsHandInstall()) return false;
    const now = Date.now();
    if (!installOfferDue(readInstallShown('handInstall'), now)) return false;
    markInstallShown('handInstall', now);
    return true;
  });

  const [inApp, setInApp] = useState(() => {
    if (!inAppBrowser() || wasSaid('inAppNote')) return false;
    markSaid('inAppNote');
    return true;
  });

  /*
   * Chrome's dialog is OFFERED — and the showing marked — the first moment the
   * door can draw the button: the browser's event and the door being up are
   * both needed, and the event can come before the first render (captured at
   * module scope, `shell/install.ts`) or after it. Two doors into the same
   * decision: the lazy initialiser for an event that has already fired, and
   * the listener for one that has not. Both are places React lets a decision
   * with a side effect live; an effect that set state would not be.
   *
   * `atDoor` reaches the listener through a ref, synced in an effect, because
   * the listener is installed once. An event that fires MID-RUN is declined —
   * a showing spent on a button nobody can see is the bug this replaced — and
   * such a device meets the offer on its next visit's door, which is where
   * Chrome fires the event anyway: at load, after the manifest check.
   */
  const atDoorRef = useRef(atDoor);
  useEffect(() => {
    atDoorRef.current = atDoor;
  }, [atDoor]);
  const offerNow = (doorUp: boolean): boolean => {
    if (!doorUp || !canInstall() || isInstalled()) return false;
    const now = Date.now();
    if (!installOfferDue(readInstallShown('installNudge'), now)) return false;
    markInstallShown('installNudge', now);
    return true;
  };
  const [offered, setOffered] = useState(() => offerNow(atDoor));
  const [spent, setSpent] = useState(false);
  useEffect(() => {
    if (offered) return;
    const look = (): void => {
      if (offerNow(atDoorRef.current)) setOffered(true);
    };
    window.addEventListener('beforeinstallprompt', look);
    return () => window.removeEventListener('beforeinstallprompt', look);
  }, [offered]);

  const offerInstall = useMemo(() => {
    if (!offered || spent) return undefined;
    return () => {
      // False means the browser withdrew the offer between render and tap. The
      // button simply goes, which is honest: there is nothing to open.
      promptInstall();
      setSpent(true);
    };
  }, [offered, spent]);

  const dismissInApp = useCallback(() => setInApp(false), []);
  return { inApp, dismissInApp, offerInstall, showHandInstall };
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
