import { afterEach, describe, expect, it, vi } from 'vitest';
import { inAppBrowser, needsHandInstall } from './install';

/**
 * THE TWO USER-AGENT SNIFFS, AND WHY THEY ARE THE CASE THAT EARNS ONE.
 *
 * Sniffing user agents is a bad habit and this file holds the two places it is
 * the only option, because neither question has a capability behind it:
 *
 *   - **"is storage about to be thrown away"** — no browser answers that, and
 *     the only signal is who is hosting the WebView (`inAppBrowser`);
 *   - **"can this person add the page to their home screen"** — no browser
 *     answers that either. iOS never fires `beforeinstallprompt`, so the
 *     absence of a dialog cannot distinguish "cannot install" from "can, by
 *     hand" (`needsHandInstall`, 2026-09-09).
 *
 * Wrong answers are cheap in both directions and that is the whole licence: a
 * false positive is one line about a menu that does exist, a false negative is
 * the status quo — which for the install note was **no screen in the game
 * mentioning the home screen at all**, on the one platform it is played on.
 *
 * Tested against real strings rather than shapes. A regex is exactly as good as
 * the agents it was written against, and the ones below are the phones and the
 * apps this game actually reaches.
 */

const UA = {
  iPhoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  iPhoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  iPhoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/127.0 Mobile/15E148 Safari/605.1.15',
  iPhoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 331.0.0.31.90',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
} as const;

/** One phone, as the two globals both sniffs read. */
function phone(ua: string, opts: { standalone?: boolean } = {}): void {
  vi.stubGlobal('navigator', {
    userAgent: ua,
    ...(opts.standalone === true ? { standalone: true } : {}),
  });
  // `isInstalled` asks `matchMedia` first; a phone that is not installed says
  // no, and a browser without `matchMedia` is one with no PWA install either.
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('needsHandInstall', () => {
  it('is true on an iPhone in Safari, which is the case it exists for', () => {
    phone(UA.iPhoneSafari);
    expect(needsHandInstall()).toBe(true);
  });

  it('is false once the game is already on the home screen', () => {
    // `navigator.standalone` is iOS's own answer and the only one that works
    // there — see `isInstalled`.
    phone(UA.iPhoneSafari, { standalone: true });
    expect(needsHandInstall(), 'an installed phone was told how to install').toBe(false);
  });

  it('is false inside somebody else’s app, which has no such menu', () => {
    // And which already gets its own, far more urgent warning.
    phone(UA.iPhoneInstagram);
    expect(needsHandInstall()).toBe(false);
    expect(inAppBrowser(), 'the in-app warning stopped firing').toBe(true);
  });

  it('is false in Chrome and Firefox on iOS, whose menus differ', () => {
    // Both render in WebKit; neither shares Safari's wording, and a sentence
    // naming the wrong menu is worse than no sentence.
    for (const ua of [UA.iPhoneChrome, UA.iPhoneFirefox]) {
      phone(ua);
      expect(needsHandInstall(), ua).toBe(false);
    }
  });

  it('is false where a browser can install by itself', () => {
    // Android Chrome fires `beforeinstallprompt`; that path is a BUTTON.
    phone(UA.androidChrome);
    expect(needsHandInstall()).toBe(false);
  });

  it('is false on a desktop, and on the iPad that claims to be one', () => {
    // iPadOS 13+ reports a Mac UA, so it is deliberately out of scope: it is
    // not the phone this game is played on, and guessing would put a wrong
    // sentence in front of the one platform the sniff cannot see.
    phone(UA.macSafari);
    expect(needsHandInstall()).toBe(false);
  });

  it('answers false rather than throwing where there is no navigator', () => {
    vi.stubGlobal('navigator', undefined);
    expect(needsHandInstall()).toBe(false);
  });
});
