import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearEverything } from './storage';
import { useInstallOffer, useToday } from './platform';

/**
 * The device hooks, tested — which is the argument for having moved them.
 *
 * None of this could be asserted while they were forty lines inside a
 * three-thousand-line component: reaching them meant rendering the whole game,
 * and "the install offer comes on the door, once more a week later, then never"
 * is a claim about several mounts of one hook across a calendar rather than
 * about a screen.
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
const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_800_000_000_000;

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
    const { result } = renderHook(() => useInstallOffer(true));
    expect(result.current.offerInstall).toBeUndefined();
  });

  it('offers nothing on a device that already installed the game', () => {
    mockCanInstall = true;
    mockInstalled = true;
    const { result } = renderHook(() => useInstallOffer(true));
    expect(result.current.offerInstall).toBeUndefined();
  });

  it('offers on the door, not again this week, once more after a week, then never', () => {
    // Marc, 2026-09-16: right away on the front door, again after a week if
    // still in the browser, then never (`installDue.ts`).
    vi.useFakeTimers({ now: T0 });
    mockCanInstall = true;
    const first = renderHook(() => useInstallOffer(true));
    expect(first.result.current.offerInstall).toBeDefined();
    // Marked at the moment it is SHOWN rather than accepted: a player who read
    // the invitation and did not take it has been invited.
    act(() => first.result.current.offerInstall?.());
    expect(prompted).toBe(1);
    expect(first.result.current.offerInstall).toBeUndefined();
    // The next visit, the same week: nothing.
    vi.setSystemTime(T0 + 3 * DAY);
    expect(renderHook(() => useInstallOffer(true)).result.current.offerInstall).toBeUndefined();
    // A week on, still in the browser: the second and last showing.
    vi.setSystemTime(T0 + 8 * DAY);
    expect(renderHook(() => useInstallOffer(true)).result.current.offerInstall).toBeDefined();
    // And never a third.
    vi.setSystemTime(T0 + 400 * DAY);
    expect(renderHook(() => useInstallOffer(true)).result.current.offerInstall).toBeUndefined();
  });

  it('does not spend a showing on a button nobody can see', () => {
    // Chrome's event can arrive mid-run. Off the door, nothing is offered and
    // nothing is marked, so the next visit's door still gets the first showing.
    mockCanInstall = true;
    const midRun = renderHook(() => useInstallOffer(false));
    expect(midRun.result.current.offerInstall).toBeUndefined();
    const door = renderHook(() => useInstallOffer(true));
    expect(door.result.current.offerInstall).toBeDefined();
  });

  it('raises the in-app note once ever, and lets it be put down', () => {
    mockInApp = true;
    const first = renderHook(() => useInstallOffer(true));
    expect(first.result.current.inApp).toBe(true);
    act(() => first.result.current.dismissInApp());
    expect(first.result.current.inApp).toBe(false);
    // Once EVER — the mark is written when it is raised, so a fresh mount on
    // the same device says nothing.
    const second = renderHook(() => useInstallOffer(true));
    expect(second.result.current.inApp).toBe(false);
  });

  it('says nothing about an in-app browser on an ordinary one', () => {
    const { result } = renderHook(() => useInstallOffer(true));
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
    const { result } = renderHook(() => useInstallOffer(true));
    expect(result.current.showHandInstall, 'both invitations at once').toBe(false);
  });

  it('names the gesture where that is the only way in', () => {
    mockHandInstall = true;
    const { result } = renderHook(() => useInstallOffer(true));
    expect(result.current.showHandInstall).toBe(true);
  });

  it('says it on the door, again a week later, and never a third time', () => {
    vi.useFakeTimers({ now: T0 });
    mockHandInstall = true;
    expect(renderHook(() => useInstallOffer(true)).result.current.showHandInstall).toBe(true);
    // The next visit, the same week: a phone that has already been told.
    vi.setSystemTime(T0 + 2 * DAY);
    expect(
      renderHook(() => useInstallOffer(true)).result.current.showHandInstall,
      'an invitation became a nag',
    ).toBe(false);
    vi.setSystemTime(T0 + 7 * DAY);
    expect(renderHook(() => useInstallOffer(true)).result.current.showHandInstall).toBe(true);
    vi.setSystemTime(T0 + 100 * DAY);
    expect(renderHook(() => useInstallOffer(true)).result.current.showHandInstall).toBe(false);
  });

  it('is only ever said on the door, where it is marked when shown', () => {
    // The bug this rule replaced: marked at mount, shown a run later, so a tab
    // closed mid-run had spent its showing on a screen it never reached.
    mockHandInstall = true;
    expect(renderHook(() => useInstallOffer(false)).result.current.showHandInstall).toBe(false);
    expect(renderHook(() => useInstallOffer(true)).result.current.showHandInstall).toBe(true);
  });

  /*
   * The two offers have their own marks on purpose: they are the same
   * invitation but not the same event, and a device that meets one and later
   * the other (a link opened on a phone, then on a laptop) must not have the
   * second silenced by the first.
   */
  it('is not silenced by the browser dialog having been offered', () => {
    mockCanInstall = true;
    const chrome = renderHook(() => useInstallOffer(true));
    act(() => chrome.result.current.offerInstall?.());
    expect(prompted).toBe(1);
    mockCanInstall = false;
    mockHandInstall = true;
    const phone = renderHook(() => useInstallOffer(true));
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
