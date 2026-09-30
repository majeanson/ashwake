/**
 * The OWNER of the unsupplied option: `Ruling.until` is read and never set,
 * which is the finding `optional.test.ts` asks for. `ask.ts` writes a key of
 * the same name into a literal that is an `Ask`, and must not silence it.
 */
export type Ruling = {
  readonly id: string;
  readonly until?: string;
};

export const RULINGS: readonly Ruling[] = [{ id: 'a' }, { id: 'b' }];

export const expired = (today: string): readonly Ruling[] =>
  RULINGS.filter((r) => r.until !== undefined && r.until < today);
