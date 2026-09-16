import { describe, expect, it } from 'vitest';
import { INSTALL_AGAIN_MS, installOfferDue } from './installDue';

/**
 * Marc's rule for the install offer, 2026-09-16: on the front door right away,
 * once more after a week if the device is still in the browser, then never.
 */

const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_800_000_000_000;

describe('when the install offer is due', () => {
  it('is due on a device that has never been shown it', () => {
    expect(installOfferDue([], T0)).toBe(true);
  });

  it('is not due again the same day, or the same week', () => {
    expect(installOfferDue([T0], T0)).toBe(false);
    expect(installOfferDue([T0], T0 + 6 * DAY)).toBe(false);
    expect(installOfferDue([T0], T0 + INSTALL_AGAIN_MS - 1)).toBe(false);
  });

  it('is due once more a week after the first showing', () => {
    expect(installOfferDue([T0], T0 + INSTALL_AGAIN_MS)).toBe(true);
    expect(installOfferDue([T0], T0 + 30 * DAY)).toBe(true);
  });

  it('is never due a third time, however long it has been', () => {
    expect(installOfferDue([T0, T0 + 8 * DAY], T0 + 400 * DAY)).toBe(false);
  });

  it('treats the old once-ever mark as a showing long ago, so it gets its second', () => {
    // `storage.ts` reads the pre-2026-09-16 value '1' as `[0]`.
    expect(installOfferDue([0], T0)).toBe(true);
  });
});
