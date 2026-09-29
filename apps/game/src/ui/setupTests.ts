import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

/**
 * Every chrome test starts on an empty page.
 *
 * Testing Library does not unmount between tests on its own under Vitest's
 * globals-off setup, and a leaked panel from the previous test is a query that
 * finds two of everything and a failure that reads as a bug in the component.
 */
afterEach(cleanup);

/**
 * jsdom's storage, where Node's own would shadow it (2026-09-29).
 *
 * Node 25+ defines `localStorage` and `sessionStorage` on the global itself —
 * and without `--localstorage-file` they read `undefined`. Vitest's jsdom
 * environment copies a window key onto the global only when the global does
 * NOT already have it (`getWindowKeys`), so under Node 26 every shell test that
 * saves a world saw no storage at all: 36 of them failed on a desk machine
 * while CI, on Node 22, stayed green on the same commit. The page these tests
 * stand in for has jsdom's storage, so that is the one they get.
 */
declare const jsdom: { window: Window } | undefined;
for (const key of ['localStorage', 'sessionStorage'] as const) {
  if (typeof globalThis[key] === 'undefined' && typeof jsdom !== 'undefined') {
    Object.defineProperty(globalThis, key, {
      value: jsdom.window[key],
      configurable: true,
      writable: true,
    });
  }
}
