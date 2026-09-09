import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearEverything } from './storage';
import { useInstallOffer, useToday } from './platform';

/**
 * The device hooks, tested — which is the argument for having moved them.
 *
 * None of this could be asserted while they were forty lines inside a
 * three-thousand-line component: reaching them meant rendering the whole game,
 * and "the install note is offered once ever" is a claim about two mounts of
 * one hook rather than about a screen.
 */

vi.mock('./install', () => ({
  canInstall: () => mockCanInstall,
  isInstalled: () => mockInstalled,
  inAppBrowser: () => mockInApp,
  promptInstall: () => {
    prompted += 1;
  },
  needsHandInstall: () => mockHandInstall,
}));

let mockCanInstall = false;
let mockInstalled = false;
let mockInApp = false;
let mockHandInstall = false;
let prompted = 0;

beforeEach(() => {
  clearEverything();
  mockCanInstall = false;
  mockInstalled = false;
  mockInApp = false;
  mockHandInstall = false;
  prompted = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the install offer', () => {
  it('offers nothing when the browser has not handed us a dialog', () => {
    const { result } = renderHook(() => useInstallOffer());
    expect(result.current.offerInstall).toBeUndefined();
  });

  it('offers nothing on a device that already installed the game', () => {
    mockCanInstall = true;
    mockInstalled = true;
    const { result } = renderHook(() => useInstallOffer());
    expect(result.current.offerInstall).toBeUndefined();
  });

  it('offers once, and never again on this device', () => {
    mockCanInstall = true;
    const first = renderHook(() => useInstallOffer());
    expect(first.result.current.offerInstall).toBeDefined();

    // Marked as said at the moment it is OFFERED rather than accepted: a
    // player who read the invitation and did not take it has been invited.
    act(() => first.result.current.offerInstall?.());
    expect(prompted).toBe(1);
    expect(first.result.current.offerInstall).toBeUndefined();

    // A second mount is the next run, or the next visit. Still nothing.
    const second = renderHook(() => useInstallOffer());
    expect(second.result.current.offerInstall).toBeUndefined();
  });

  it('raises the in-app note once ever, and lets it be put down', () => {
    mockInApp = true;
    const first = renderHook(() => useInstallOffer());
    expect(first.result.current.inApp).toBe(true);

    act(() => first.result.current.dismissInApp());
    expect(first.result.current.inApp).toBe(false);

    // Once EVER — the mark is written when it is raised, so a fresh mount on
    // the same device says nothing.
    const second = renderHook(() => useInstallOffer());
    expect(second.result.current.inApp).toBe(false);
  });

  it('says nothing about an in-app browser on an ordinary one', () => {
    const { result } = renderHook(() => useInstallOffer());
    expect(result.current.inApp).toBe(false);
  });
});

describe('the install gesture, where there is no dialog to open', () => {
  /**
   * iOS never fires `beforeinstallprompt`, so `offerInstall` — a button that
   * opens Chrome's dialog — could never appear on an iPhone, and no screen in
   * the game mentioned the home screen at all. With no backend by ruling (D13)
   * the icon is the only way back, which made this the largest single reason a
   * player did not return.
   */
  it('says nothing where the browser can install by itself', () => {
    mockCanInstall = true;
    const { result } = renderHook(() => useInstallOffer());
    expect(result.current.showHandInstall, 'both invitations at once').toBe(false);
  });

  it('names the gesture where that is the only way in', () => {
    mockHandInstall = true;
    const { result } = renderHook(() => useInstallOffer());
    expect(result.current.showHandInstall).toBe(true);
  });

  it('says it once ever, and marks it when SHOWN', () => {
    mockHandInstall = true;
    const first = renderHook(() => useInstallOffer());
    expect(first.result.current.showHandInstall).toBe(true);
    // A second mount is a second run, on a phone that has already been told.
    const again = renderHook(() => useInstallOffer());
    expect(again.result.current.showHandInstall, 'an invitation became a nag').toBe(false);
  });

  /*
   * The two notes have their own marks on purpose: they are the same
   * invitation but not the same event, and a device that meets one and later
   * the other (a link opened on a phone, then on a laptop) must not have the
   * second silenced by the first.
   */
  it('is not silenced by the browser dialog having been offered', () => {
    mockCanInstall = true;
    const chrome = renderHook(() => useInstallOffer());
    act(() => chrome.result.current.offerInstall?.());
    expect(prompted).toBe(1);

    mockCanInstall = false;
    mockHandInstall = true;
    const phone = renderHook(() => useInstallOffer());
    expect(phone.result.current.showHandInstall).toBe(true);
  });
});

describe('today, on a page that never reloads', () => {
  it('turns over when the phone comes back after midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T23:59:00'));
    const { result } = renderHook(() => useToday());
    expect(result.current).toBe('2026-09-08');

    // The page was open the whole time. Only `visible` is read, so a phone
    // that is merely unlocked would change nothing.
    vi.setSystemTime(new Date('2026-09-09T00:01:00'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current, 'the daily was still yesterday’s after midnight').toBe('2026-09-09');
  });

  it('does not re-render when the date has not turned', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-08T10:00:00'));
    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useToday();
    });
    const before = renders;

    vi.setSystemTime(new Date('2026-09-08T14:00:00'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current).toBe('2026-09-08');
    expect(renders, 'an unlock on the same day re-rendered the app').toBe(before);
  });
});
