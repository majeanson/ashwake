import ts from 'typescript';
import type { Finding } from './finding';
import type { Workspace } from './program';

/**
 * P1.6 — the argument sweep: **ask, of every argument a view takes, where the
 * value comes from** (`CLAUDE.md`, 2026-09-01).
 *
 * The ninth inert mechanic and the only one that was a whole rendering layer.
 * `createSession`'s `build()` passed `toBoardView` a literal `[]` where the
 * world's revealed ground goes, and had since Stage 2 — so **the fog was never
 * drawn in this body**. Not a control and not a number: the map a player
 * carries in their head, absent from the screen for four stages.
 *
 * It survived because every rule about it was correct over an empty list. The
 * lens reached into memory, territories unfurled in it, `describeHexOf` had
 * four sentences for it, `cursor.ts` walked it — all tested, none reachable.
 * **Grepping for a consumer finds nothing wrong. Neither does reading the
 * consumer.**
 *
 * **The mechanical form, and it is narrower than the lesson.** A parameter
 * that EVERY call site fills with a literal empty — `[]`, `null`, `0`,
 * `false`, `''` — can never hold anything else, so either the parameter is
 * pointless or a call site is wrong. That is exactly the fog's shape, and it
 * is a question about the whole call graph rather than about one line, which
 * is why no amount of reading either end of it helped.
 *
 * **Graded `likely`, always.** `PASS.md` P1 says this pass ships report-only
 * and ranked or not at all: `[]` and `null` are legitimate values all over
 * this codebase, and a default that is genuinely meant to be empty looks
 * identical from here. It is the one pass whose output is a question rather
 * than a finding.
 */

const TEST = /\.(test|spec|audit)\.tsx?$/;
const code = (s: string): string => '`' + s + '`';

/** Is this argument a literal nothing? */
function literalEmpty(node: ts.Expression): string | null {
  if (ts.isArrayLiteralExpression(node) && node.elements.length === 0) return '[]';
  if (node.kind === ts.SyntaxKind.NullKeyword) return 'null';
  if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false';
  if (ts.isNumericLiteral(node) && node.text === '0') return '0';
  if (ts.isStringLiteral(node) && node.text === '') return "''";
  if (ts.isObjectLiteralExpression(node) && node.properties.length === 0) return '{}';
  return null;
}

/** Every function this file declares, with its parameter list. */
function functionsOf(
  file: ts.SourceFile,
): readonly { name: ts.Identifier; params: readonly ts.ParameterDeclaration[] }[] {
  const out: { name: ts.Identifier; params: readonly ts.ParameterDeclaration[] }[] = [];

  /*
   * EVERY top-level declaration, exported or not (2026-09-10). `fields.ts`
   * carries the argument: the 141-symbol demotion batch `CLAUDE.md` asks for
   * silently shrank three of these five passes at once, and `export` was never
   * the right question for a call site or a comparison.
   */
  for (const statement of file.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name !== undefined &&
      statement.parameters.length > 0
    ) {
      out.push({ name: statement.name, params: [...statement.parameters] });
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const init = decl.initializer;
        if (init === undefined) continue;
        if (!ts.isArrowFunction(init) && !ts.isFunctionExpression(init)) continue;
        if (init.parameters.length === 0) continue;
        out.push({ name: decl.name, params: [...init.parameters] });
      }
    }
  }
  return out;
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

/** Every call to this function outside a test, as its argument list. */
function callSites(
  w: Workspace,
  file: ts.SourceFile,
  name: ts.Identifier,
): readonly ts.NodeArray<ts.Expression>[] {
  const found = w.service.findReferences(file.fileName, name.getStart(file));
  const out: ts.NodeArray<ts.Expression>[] = [];
  for (const symbol of found ?? []) {
    for (const ref of symbol.references) {
      if (ref.isDefinition === true) continue;
      const at = w.program.getSourceFile(ref.fileName);
      if (at === undefined) continue;
      // A test that passes a real value is exactly what hid `perkAt`, so the
      // game's own callers are the only ones asked.
      if (TEST.test(w.path(at))) continue;
      const node = nodeAt(at, ref.textSpan.start);
      const parent = node.parent;
      if (parent === undefined || !ts.isCallExpression(parent)) continue;
      if (parent.expression !== node) continue;
      out.push(parent.arguments);
    }
  }
  return out;
}

export function argumentSweep(w: Workspace): readonly Finding[] {
  const out: Finding[] = [];
  for (const file of w.files) {
    const path = w.path(file);
    if (TEST.test(path)) continue;

    for (const { name, params } of functionsOf(file)) {
      const calls = callSites(w, file, name);
      // No caller at all is the module sweep's finding, not this one. One
      // caller is still worth asking about — the fog had exactly one.
      if (calls.length === 0) continue;

      for (let i = 0; i < params.length; i += 1) {
        const param = params[i];
        if (param === undefined || !ts.isIdentifier(param.name)) continue;
        // An optional parameter nobody fills is P1.3's question, asked better
        // there: it knows the difference between a test caller and a real one.
        if (param.questionToken !== undefined || param.initializer !== undefined) continue;

        const given = calls.map((args) => args[i]);
        // A call that omits it entirely says nothing about what it holds.
        if (given.some((arg) => arg === undefined)) continue;
        const empties = given.map((arg) => (arg === undefined ? null : literalEmpty(arg)));
        if (empties.some((e) => e === null)) continue;

        const shapes = [...new Set(empties.filter((e): e is string => e !== null))];
        const line = file.getLineAndCharacterOfPosition(param.name.getStart(file)).line + 1;
        out.push({
          pass: 'argument',
          id: path + '#' + name.text + '(' + param.name.text + ')',
          file: path,
          line,
          grade: 'likely',
          what:
            code(name.text + '(' + param.name.text + ')') +
            ' is filled with ' +
            shapes.map(code).join(' / ') +
            ' at ' +
            (calls.length === 1
              ? 'its only call site'
              : 'all ' + String(calls.length) + ' call sites'),
          detail:
            'The FOG shape: ' +
            code('toBoardView') +
            " was handed a literal [] where the world's revealed ground goes, " +
            'for four stages, and every rule about it was correct over an empty ' +
            'list. Either the parameter is pointless or a caller is wrong.',
        });
      }
    }
  }
  return out;
}
