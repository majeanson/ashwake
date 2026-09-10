import ts from 'typescript';
import type { Finding } from './finding';
import { keyIndex } from './keys';
import type { Workspace } from './program';

/**
 * P1.3 — the optional-input sweep: **a hook a test can inject is a hook a test
 * cannot prove is connected** (`CLAUDE.md`, 2026-09-02).
 *
 * `receipts.ts` takes a `perkAt` so a find's claim can name the perk it gave.
 * `receipts.test.ts` supplies one and is green. **`App` supplied none**, so
 * every find in the real game said "Nothing new inside" while a perk was being
 * handed over. Three passes of grepping exports and fields walked past it,
 * because the gap was an OPTION: the parameter had a reader, a test and a
 * green tick, and no caller in the game.
 *
 * **It is the field sweep's mirror image, and that is what makes it
 * mechanical.** P1.2 asks which fields are written and never read. This asks
 * which are READ and never written — outside a test, which is the whole point:
 * a test writing it is exactly what made this invisible for a month.
 *
 * Only optional inputs are asked about. A required one that nobody passes is
 * a type error, and the compiler has already refused it.
 */

const TEST = /\.(test|spec|audit)\.tsx?$/;
const code = (s: string): string => '`' + s + '`';

/** Every optional property a top-level type declares, however deeply nested. */
function optionalsOf(file: ts.SourceFile): readonly { owner: string; name: ts.Identifier }[] {
  const out: { owner: string; name: ts.Identifier }[] = [];

  const members = (owner: string, list: ts.NodeArray<ts.TypeElement>): void => {
    for (const member of list) {
      if (!ts.isPropertySignature(member)) continue;
      if (!ts.isIdentifier(member.name)) continue;
      const here = owner === '' ? member.name.text : owner + '.' + member.name.text;
      if (member.questionToken !== undefined) out.push({ owner, name: member.name });
      const inner = member.type;
      if (inner === undefined) continue;
      if (ts.isTypeLiteralNode(inner)) members(here, inner.members);
      else if (ts.isIntersectionTypeNode(inner)) {
        for (const part of inner.types) if (ts.isTypeLiteralNode(part)) members(here, part.members);
      }
    }
  };

  /*
   * EVERY top-level type, exported or not (2026-09-10) — `fields.ts` carries
   * the argument, and this pass lost the same thing on the same run.
   *
   * The 141-symbol demotion batch took `ConfirmingProps` off this surface, and
   * `holdMs` — a ruling written that same morning about a test timer control
   * being a REASON rather than a missing caller — went dark with it. It was
   * the last entry left in "Rulings that match nothing", which is how it was
   * found. An optional input's suppliers are the whole program; whether its
   * type is exported was never the question.
   */
  for (const statement of file.statements) {
    if (ts.isInterfaceDeclaration(statement)) members(statement.name.text, statement.members);
    else if (ts.isTypeAliasDeclaration(statement) && ts.isTypeLiteralNode(statement.type)) {
      members(statement.name.text, statement.type.members);
    }
  }
  return out;
}

/**
 * Who WRITES this option, split by whether it was a test that did it.
 *
 * The classifier is `fields.ts`'s, deliberately shared in spirit rather than
 * imported: a JSX attribute and an object-literal property are the two ways an
 * option is supplied in this codebase, and both are writes.
 */
function suppliers(
  w: Workspace,
  file: ts.SourceFile,
  name: ts.Identifier,
): {
  real: number;
  tests: number;
} {
  const found = w.service.findReferences(file.fileName, name.getStart(file));
  let real = 0;
  let tests = 0;
  for (const symbol of found ?? []) {
    for (const ref of symbol.references) {
      if (ref.isDefinition === true) continue;
      const at = w.program.getSourceFile(ref.fileName);
      if (at === undefined) continue;
      const node = nodeAt(at, ref.textSpan.start);
      const parent = node.parent;
      if (parent === undefined) continue;
      const isSupply =
        ts.isJsxAttribute(parent) ||
        ((ts.isPropertyAssignment(parent) || ts.isShorthandPropertyAssignment(parent)) &&
          parent.parent !== undefined &&
          ts.isObjectLiteralExpression(parent.parent));
      if (!isSupply) continue;
      if (TEST.test(w.path(at))) tests += 1;
      else real += 1;
    }
  }
  return { real, tests };
}

/** The deepest node covering an offset. */
function nodeAt(file: ts.SourceFile, pos: number): ts.Node {
  let found: ts.Node = file;
  const dive = (node: ts.Node): void => {
    if (node.getStart(file) > pos || node.getEnd() < pos) return;
    found = node;
    node.forEachChild(dive);
  };
  file.forEachChild(dive);
  return found;
}

export function optionalSweep(w: Workspace): readonly Finding[] {
  const keys = keyIndex(w);
  const out: Finding[] = [];
  for (const file of w.files) {
    const path = w.path(file);
    if (TEST.test(path)) continue;

    for (const { owner, name } of optionalsOf(file)) {
      const { real, tests } = suppliers(w, file, name);
      if (real > 0) continue;

      /*
       * A key of this name written anywhere else WITHHOLDS the claim.
       * `keys.ts` carries the argument in full: an object literal inside a
       * generic callback does not share a symbol with the type it becomes,
       * so `Bar.paint` looked unsupplied while `Payout.tsx` sets it twice.
       * Four false findings before this existed.
       */
      const elsewhere = keys.writers(name.text, path);
      if (elsewhere.length > 0) continue;
      const line = file.getLineAndCharacterOfPosition(name.getStart(file)).line + 1;
      const full = owner === '' ? name.text : owner + '.' + name.text;
      out.push({
        pass: 'optional',
        id: path + '#' + full,
        file: path,
        line,
        grade: tests > 0 ? 'certain' : 'likely',
        what:
          code(full) +
          (tests > 0
            ? ' is supplied by ' + String(tests) + ' test(s) and by no caller in the game'
            : ' is optional and nothing anywhere supplies it'),
        detail:
          tests > 0
            ? 'The ' +
              code('perkAt') +
              ' shape exactly: a reader, a green test, and no caller. This is ' +
              'the one the export and field sweeps are both blind to.'
            : 'An option nobody takes. Either a caller is missing or the option is.',
      });
    }
  }
  return out;
}
