import ts from 'typescript';
import type { Finding } from './finding';
import type { Workspace } from './program';

/**
 * P1.1 — the module sweep: **before calling a MODULE done, grep for a consumer
 * of every export it has** (`CLAUDE.md`, 2026-09-02).
 *
 * That ritual found twelve surfaces the gesture matrix could not see. Run again
 * on 2026-09-08 it found one genuinely dead export — `STAT_ICON`, the table
 * saying which stats are marks, while the render hard-coded `id === 'luck'` —
 * sitting in a list of sixteen that were merely file-internal. **Fifteen of
 * sixteen were noise**, and each is a false positive the next sweep would have
 * had to re-adjudicate from scratch.
 *
 * So this pass does not return one list. It returns three, because the ritual
 * is really three questions with three different answers:
 *
 *  - **dead** — nothing anywhere reads it, not its own file and not a test.
 *    This is the finding. `STAT_ICON` was one.
 *  - **tests only** — only a `.test.ts` reads it. Sometimes right on purpose
 *    (`keeper.alive` exists so a test can check a promise no caller may
 *    branch on, and says so at its declaration), so it is reported and graded,
 *    never assumed.
 *  - **file-internal** — read, but only inside the file that declares it.
 *    `CLAUDE.md`'s own instruction is to demote these to `const` and
 *    `function`, precisely so the NEXT sweep's signal stays clean.
 *
 * A FOURTH was added on 2026-09-10 and retired the same day: read in its own
 * file AND by a spec. It shipped seventy-four rows, every one of them a unit
 * test importing its unit, and `alsoTestedCount` carries what is left of it —
 * a number in the header. The argument is at the branch.
 *
 * **The compiler answers, not a grep.** `findReferences` resolves re-exports,
 * aliased imports, type-only imports and JSX identifiers — four things this
 * codebase contains and four ways a text search is wrong.
 */

/** What a reference to an export can be, once the declaration itself is out. */
type Readers = {
  readonly outside: number;
  readonly tests: number;
  readonly own: number;
};

const TEST = /\.(test|spec|audit)\.tsx?$/;
const CONFIG = /\.config\.tsx?$/;

/** Is this file one whose exports are read by a tool rather than by code? */
function toolOwned(path: string): boolean {
  return CONFIG.test(path) || path.startsWith('e2e/') || path.endsWith('/sw.js');
}

/** Every top-level name a file exports, with the node its name sits on. */
function exportsOf(file: ts.SourceFile): readonly ts.Identifier[] {
  const names: ts.Identifier[] = [];
  const exported = (node: ts.Node): boolean =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  for (const statement of file.statements) {
    if (ts.isVariableStatement(statement)) {
      if (!exported(statement)) continue;
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) names.push(decl.name);
      }
      continue;
    }
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement)) &&
      exported(statement) &&
      statement.name !== undefined &&
      ts.isIdentifier(statement.name)
    ) {
      names.push(statement.name);
      continue;
    }
    /*
     * `export { x }` and `export { x as y } from './z'`.
     *
     * A re-export is a real declaration for this purpose: it is a name this
     * module offers, and if nothing imports it the module is offering it to
     * nobody. `meta/route`'s `searchFor` was exactly this shape.
     */
    if (ts.isExportDeclaration(statement) && statement.exportClause !== undefined) {
      if (ts.isNamedExports(statement.exportClause)) {
        for (const el of statement.exportClause.elements) {
          // A quoted export name (`export { x as 'y' }`) is legal and is not
          // something this codebase does; it is skipped rather than coerced,
          // because a name a reader cannot type is a name no import resolves.
          if (ts.isIdentifier(el.name)) names.push(el.name);
        }
      }
    }
  }
  return names;
}

/** Who reads this name, once its own declaration is discounted. */
function readers(w: Workspace, file: ts.SourceFile, name: ts.Identifier): Readers {
  const found = w.service.findReferences(file.fileName, name.getStart(file));
  let outside = 0;
  let tests = 0;
  let own = 0;
  for (const symbol of found ?? []) {
    for (const ref of symbol.references) {
      // The declaration is not a reader of itself. `isDefinition` also covers
      // the re-export case, where the name appears in a clause that IS the
      // declaration this pass is asking about.
      if (ref.isDefinition === true) continue;
      const at = w.program.getSourceFile(ref.fileName);
      if (at === undefined) continue;
      const path = w.path(at);
      if (at.fileName === file.fileName) own += 1;
      else if (TEST.test(path)) tests += 1;
      else outside += 1;
    }
  }
  return { outside, tests, own };
}

/**
 * How many exports the last module pass found read in their own file AND by a
 * spec — the category retired below, kept as a number for the header.
 *
 * A module-level `let` and not a return value, because `index.ts` drives the
 * passes through one `{ name, run }` list and a second channel on that shape
 * would be five files of plumbing for one integer. Read AFTER `moduleSweep`
 * has run, which is the only order `index.ts` has.
 */
let alsoTested = 0;
export const alsoTestedCount = (): number => alsoTested;

/**
 * The pass.
 *
 * Test files and tool-owned files are not asked about: a spec exports nothing
 * anybody imports, and a `*.config.ts`'s default export is read by vite,
 * vitest or playwright rather than by a program this sweep can see. Reporting
 * either would be a finding with no possible fix, which is how a report
 * teaches its reader to skip it.
 */
export function moduleSweep(w: Workspace): readonly Finding[] {
  const out: Finding[] = [];
  alsoTested = 0;
  for (const file of w.files) {
    const path = w.path(file);
    if (TEST.test(path) || toolOwned(path)) continue;

    for (const name of exportsOf(file)) {
      const { outside, tests, own } = readers(w, file, name);
      if (outside > 0) continue;

      const line = file.getLineAndCharacterOfPosition(name.getStart(file)).line + 1;
      const id = `${path}#${name.text}`;
      if (tests === 0 && own === 0) {
        out.push({
          pass: 'module',
          id,
          file: path,
          line,
          grade: 'certain',
          what: `\`${name.text}\` is exported and nothing reads it, anywhere`,
        });
      } else if (tests > 0 && own === 0) {
        out.push({
          pass: 'module',
          id,
          file: path,
          line,
          grade: 'certain',
          what: `\`${name.text}\` is read only by tests (${tests})`,
          detail:
            'Sometimes right on purpose — `keeper.alive` exists so a test can ' +
            'check a promise no caller may branch on. Say so at the declaration ' +
            'or cut it.',
        });
      } else if (tests === 0) {
        out.push({
          pass: 'module',
          id,
          file: path,
          line,
          grade: 'certain',
          what: `\`${name.text}\` is exported but read only inside its own file (${own})`,
          detail:
            'Demote to `const` or `function`. `CLAUDE.md`: do not export what ' +
            'one file uses — every one of these is a false positive the next ' +
            'sweep re-adjudicates from scratch.',
        });
      } else {
        /*
         * READ IN ITS OWN FILE **AND** BY A TEST — a different finding from
         * either alone (2026-09-10).
         *
         * This branch used to be the `else` above, so any symbol with an
         * in-file reader was reported as read ONLY inside its own file no
         * matter how many specs imported it. The sentence was false and the
         * advice was worse: demoting one of these deletes the import a spec is
         * built on. Acting on the first report broke twenty-five at once —
         * `sim/policy#farm`, `theme/rig#FLAT_RIG`, `view/view#epitaphFor`,
         * `theme/tokens#fieldDots`.
         *
         * `PASS.md`'s precision note was written about the OPPOSITE failure:
         * a sweep that invents findings is a sweep nobody runs twice. This is
         * that lesson's other half, and it is the worse half — an invented
         * finding wastes a reader's minute, a finding whose fix does not
         * compile wastes it AFTER they trusted it.
         *
         * **AND THEN IT SHIPPED SEVENTY-FOUR ROWS AND WAS RETIRED THE SAME
         * DAY.** It is not a finding: a symbol used in its own file and
         * imported by that file's spec is used, tested, and offered to nobody
         * else. What it describes is unit testing, and asking the same settled
         * question seventy-four times a run is precisely how `CLAUDE.md` says
         * a ritual stops being run — the failure this whole tool exists to
         * prevent. The repository's practice was already the answer: the
         * 2026-09-08 sweep demoted twelve file-internal exports and left the
         * ones a spec imports alone.
         *
         * It is COUNTED rather than dropped, in the report's header, so the
         * number is still there for anyone who wants to argue the other way.
         * The tests-only case one branch up — where nothing in production
         * reads it at all — is the one that stays a finding, and it caught
         * `CHROME_ICON` on this very run.
         */
        alsoTested += 1;
      }
    }
  }
  return out;
}
