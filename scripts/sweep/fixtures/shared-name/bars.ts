import type { Bar } from './ask';

/** `Payout.tsx`'s shape: the literal is `map`'s to infer, and `Bar` after. */
export const bars = (names: readonly string[]): readonly Bar[] =>
  names.map((label) => ({ label, paint: 'ink' }));
