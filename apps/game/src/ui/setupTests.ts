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
