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
}));

let mockCanInstall = false;
let mockInstalled = false;
let mockInApp = false;
let prompted = 0;

beforeEach(() => {
  clearEverything();
  mockCanInstall = false;
  mockInstalled = false;
  mockInApp = false;
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
