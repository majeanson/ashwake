import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { describeError, recordFailure, sendCrashReport } from './failure';
import { clearEverything, readLastError } from './storage';

/**
 * The crash reporter, and the privacy contract it lives under.
 *
 * The contract is the important half and it is the easy one to break by
 * accident: **a report leaves the device only when a human taps SEND.**
 * Nothing here may run at boot, on error, or on a timer — so the test that
 * matters most is the one asserting that recording a failure touches the
 * network zero times.
 */

const report = {
  build: 'abc1234',
  mode: 'own world',
  count: 2,
  userAgent: 'test-agent',
  detail: 'TypeError: nope\n  at somewhere',
};

beforeEach(() => clearEverything());
afterEach(() => vi.unstubAllGlobals());

describe('describeError', () => {
  it('keeps the name, the message and the top of the stack', () => {
    const said = describeError(new TypeError('nope'));
    expect(said).toContain('TypeError: nope');
  });

  it('answers for a thrown non-Error rather than throwing itself', () => {
    expect(describeError('a string')).toBe('a string');
    expect(describeError(null)).toBe('null');
  });

  it('is bounded, because a report is something a person sends', () => {
    const huge = new Error('x'.repeat(5000));
    expect(describeError(huge).length).toBeLessThanOrEqual(700);
  });
});

describe('the privacy contract', () => {
  it('sends NOTHING when a failure is merely recorded', () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    recordFailure(new Error('quietly'));
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('keeps the failure for SETTINGS, so a report can still be sent later', () => {
    recordFailure(new Error('kept for later'));
    expect(readLastError()?.text).toContain('kept for later');
  });
});

describe('sendCrashReport', () => {
  it('posts the envelope, and says so', async () => {
    let posted: { url: string; init: RequestInit | undefined } | null = null;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      // `fetch` takes a Request too, whose default stringification says
      // nothing. This code path only ever passes a string, and the test says
      // which it expects rather than trusting `String()` to be kind.
      posted = { url: input instanceof Request ? input.url : input.toString(), init };
      return Promise.resolve(new Response(null, { status: 200 }));
    });

    expect(await sendCrashReport(report)).toBe(true);
    expect(posted!.url).toContain('envelope');
    expect(posted!.init?.method).toBe('POST');
    expect((posted!.init?.headers as Record<string, string>)['content-type']).toBe(
      'application/x-sentry-envelope',
    );
  });

  it('resolves false — never throws — on a refusal or a dead network', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response(null, { status: 429 })));
    expect(await sendCrashReport(report)).toBe(false);

    // The caller is a button on a screen that exists because something already
    // broke. A send that cannot land must become "try again", never a second
    // error on top of the first.
    vi.stubGlobal('fetch', () => Promise.reject(new Error('offline')));
    expect(await sendCrashReport(report)).toBe(false);
  });
});
