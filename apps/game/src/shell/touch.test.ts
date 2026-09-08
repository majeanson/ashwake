import { afterEach, describe, expect, it, vi } from 'vitest';
import { buzz, canBuzz, stopBuzz } from './touch';

/**
 * The haptics module, and the two things worth pinning about it.
 *
 * There is no assertion here about what a buzz FEELS like — that is a phone
 * and a thumb, and this repository's rule is that such a finding is stated
 * rather than guessed at. What a test can hold is the contract: it is silent
 * unless asked, it is silent on a device that cannot, and it never throws into
 * the placement that called it.
 */

const withVibrate = (fn: ((p: number | number[]) => boolean) | undefined): void => {
  if (fn === undefined) {
    // `delete` rather than assigning undefined: `canBuzz` asks whether the
    // property is a FUNCTION, and a device without haptics has no property at
    // all rather than an undefined one. Testing the shape we actually claim.
    delete (navigator as { vibrate?: unknown }).vibrate;
    return;
  }
  Object.defineProperty(navigator, 'vibrate', { value: fn, configurable: true, writable: true });
};

afterEach(() => {
  withVibrate(undefined);
  vi.restoreAllMocks();
});

describe('the phone, felt', () => {
  it('says nothing on a device with no vibrate — which is every iPhone', () => {
    withVibrate(undefined);
    expect(canBuzz()).toBe(false);
    // The point of the assertion is that this LINE does not throw. A haptic
    // that took a placement with it would be the worst possible trade for a
    // flourish, and iOS is not an edge case here — it is half the phones.
    expect(() => buzz(true, 'place')).not.toThrow();
    expect(() => stopBuzz()).not.toThrow();
  });

  it('says nothing when the player has not asked', () => {
    const spy = vi.fn(() => true);
    withVibrate(spy);
    expect(canBuzz()).toBe(true);
    buzz(false, 'pop');
    expect(spy, 'a flag that is off still buzzed').not.toHaveBeenCalled();
  });

  it('buzzes each moment with its own pattern, and the pop is the only rhythm', () => {
    const seen: (number | number[])[] = [];
    withVibrate((p) => {
      seen.push(p);
      return true;
    });

    buzz(true, 'place');
    buzz(true, 'claim');
    buzz(true, 'pop');

    const [place, claim, pop] = seen;
    expect(typeof place).toBe('number');
    expect(typeof claim).toBe('number');
    expect(Array.isArray(pop), 'the pop is the one moment worth a rhythm').toBe(true);

    // Short, and place is the shortest: it is the frequent one. A game that
    // buzzes for a tenth of a second on every tile is a game played with this
    // switched off.
    expect(place as number).toBeLessThan(claim as number);
    for (const each of [place, claim]) expect(each as number).toBeLessThanOrEqual(40);
    for (const ms of pop as number[]) expect(ms).toBeLessThanOrEqual(40);
  });

  it('swallows a browser that refuses, rather than taking the move with it', () => {
    withVibrate(() => {
      throw new Error('user has not interacted with the document yet');
    });
    expect(() => buzz(true, 'pop')).not.toThrow();
    expect(() => stopBuzz()).not.toThrow();
  });

  it('stops what is in flight when the switch goes off', () => {
    const spy = vi.fn(() => true);
    withVibrate(spy);
    stopBuzz();
    expect(spy).toHaveBeenCalledWith(0);
  });
});
