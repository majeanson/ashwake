/**
 * The unrelated types that share a key name with `Ruling.until`, and the
 * genuine suppliers the fix must keep counting.
 */

/** The caravan's shape (2026-09-29): a shorthand `until`, through a union. */
export type Ask = {
  readonly from: number;
  readonly until?: number;
};

export function askAt(n: number): Ask | null {
  const from = n;
  const until = n + 10;
  return n > 0 ? { from, until } : null;
}

/** Supplied through `satisfies` over an array of it. */
export type Cap = {
  readonly n: number;
  readonly until?: number;
};

export const CAPS = [{ n: 1, until: 3 }] as const satisfies readonly Cap[];

/**
 * Supplied through a generic callback in ANOTHER file (`bars.ts`), the literal
 * inferred rather than attributed — the case `keys.ts` exists for, which must
 * still withhold.
 */
export type Bar = {
  readonly label: string;
  readonly paint?: string;
};

export const reads = (a: Ask, c: Cap, b: Bar): string =>
  String(a.until) + String(c.until) + (b.paint ?? '');
