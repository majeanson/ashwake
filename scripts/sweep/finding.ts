/**
 * One thing the sweep found, and the shape every pass answers in
 * (`PASS.md` P1, 2026-09-09).
 *
 * Modelled on `e2e/audit/audit.ts`'s `Finding`, deliberately: this repository
 * already has one instrument that produces a list of measured facts with a
 * published bar beside each, and a second one that reported them differently
 * would be two vocabularies for one job.
 *
 * **`id` is the contract with the allowlist.** It has to survive a line moving
 * — a sweep whose rulings are keyed on line numbers re-adjudicates everything
 * the first time somebody adds an import — so it is the repo-relative path and
 * the symbol, and nothing else.
 */
export type Finding = {
  /** Which sweep found it: `module`, `field`, `optional`, `branch`, `text`, `argument`. */
  readonly pass: string;
  /** `path#symbol` — stable across edits, which is what the allowlist keys on. */
  readonly id: string;
  /** Repo-relative, forward-slashed. */
  readonly file: string;
  /** 1-based, for a reader. Never part of `id`. */
  readonly line: number;
  /** What was found, in one line, in the words a reader would use. */
  readonly what: string;
  /**
   * How sure the sweep is, and it is the field that decides whether a reader
   * keeps reading. `certain` means the compiler answered; `likely` means a
   * heuristic did and may be wrong in a way this repository has already seen.
   */
  readonly grade: 'certain' | 'likely';
  /** Anything a reader needs that the line above cannot hold. */
  readonly detail?: string;
};

/** Sort so the certain findings come first and one file's findings sit together. */
export function order(a: Finding, b: Finding): number {
  if (a.grade !== b.grade) return a.grade === 'certain' ? -1 : 1;
  if (a.pass !== b.pass) return a.pass < b.pass ? -1 : 1;
  if (a.file !== b.file) return a.file < b.file ? -1 : 1;
  return a.line - b.line;
}
