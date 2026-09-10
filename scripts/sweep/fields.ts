import ts from 'typescript';
import type { Finding } from './finding';
import type { Workspace } from './program';

/**
 * P1.2 — the field sweep: **and once more over the FIELDS** (`CLAUDE.md`,
 * 2026-09-02).
 *
 * A module sweep walks the import graph and cannot see a property. `CellView`
 * has twenty-two, the board is the only thing that could read one, and
 * "nothing imports it" is never true of a field. Walking them by hand found
 * five: `voice.dry` never played, `previewColour` so every legal edge drew in
 * one ink, and `band` so a world with five contour bands was drawn flat by the
 * body that has a Z axis.
 *
 * **The finding is WRITTEN AND NEVER READ, and that is the whole difficulty.**
 * Every one of those five had references — something computed the value and
 * put it in the object. `band` was set in `view/view.ts` on every cell of
 * every frame. A pass that asks "does anything mention this field" answers yes
 * and finds nothing; a pass that asks "does anything ever LOOK at it" finds
 * all five.
 *
 * So this pass splits every reference by `isWriteAccess`, which is the
 * compiler's own answer: a property assignment in an object literal is a
 * write, a property access and a destructuring are reads. **A field with
 * writes and no reads is a number computed into a void**, which is the exact
 * shape of four of this body's fifteen inert mechanics.
 */

const TEST = /\.(test|spec|audit)\.tsx?$/;

/** Every property this file declares on an exported type, with its name node. */
function fieldsOf(file: ts.SourceFile): readonly { owner: string; name: ts.Identifier }[] {
  const out: { owner: string; name: ts.Identifier }[] = [];
  const exported = (node: ts.Node): boolean =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

  const members = (owner: string, list: ts.NodeArray<ts.TypeElement>): void => {
    for (const member of list) {
      if (!ts.isPropertySignature(member)) continue;
      if (!ts.isIdentifier(member.name)) continue;
      out.push({ owner, name: member.name });
    }
  };

  for (const statement of file.statements) {
    if (!exported(statement)) continue;
    if (ts.isInterfaceDeclaration(statement)) {
      members(statement.name.text, statement.members);
      continue;
    }
    if (ts.isTypeAliasDeclaration(statement) && ts.isTypeLiteralNode(statement.type)) {
      members(statement.name.text, statement.type.members);
    }
  }
  return out;
}

/** Reads and writes of one field, with the declaration itself discounted. */
type Uses = { reads: number; writes: number; testReads: number };

/** The deepest node covering an offset — what the reference actually IS. */
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

/**
 * Read or write, decided by the AST rather than by `isWriteAccess`.
 *
 * **The flag is wrong for the case this pass exists for**, and the first run
 * proved it on eighty-odd rows: a React prop pulled out in the component's own
 * signature — `function HexField({ view, theme }: HexFieldProps)` — is a
 * BindingElement, which the compiler reports as a write. So every prop of
 * every board component came back "WRITTEN and never read", which is the exact
 * opposite of the truth: the destructuring IS the read, and it is the only one
 * there will ever be.
 *
 * Four shapes are writes and everything else is a read. Conservative on
 * purpose: a miscounted read costs one missing finding, a miscounted write
 * costs a false one — and a report of eighty false findings is a report
 * nobody opens a second time.
 */
function isWrite(node: ts.Node): boolean {
  const parent = node.parent;
  if (parent === undefined) return false;
  // `{ band: value }` and `{ band }` — putting a value INTO an object.
  if (
    (ts.isPropertyAssignment(parent) || ts.isShorthandPropertyAssignment(parent)) &&
    parent.parent !== undefined &&
    ts.isObjectLiteralExpression(parent.parent)
  ) {
    return true;
  }
  // `<HexField view={...} />` — handing a prop over is a write, and the
  // component's own destructuring is the read that answers it.
  if (ts.isJsxAttribute(parent)) return true;
  // `cell.band = x`, and only on the left of the `=`.
  if (
    ts.isPropertyAccessExpression(parent) &&
    parent.parent !== undefined &&
    ts.isBinaryExpression(parent.parent) &&
    parent.parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    parent.parent.left === parent
  ) {
    return true;
  }
  return false;
}

function uses(w: Workspace, file: ts.SourceFile, name: ts.Identifier): Uses {
  const found = w.service.findReferences(file.fileName, name.getStart(file));
  const out: Uses = { reads: 0, writes: 0, testReads: 0 };
  for (const symbol of found ?? []) {
    for (const ref of symbol.references) {
      if (ref.isDefinition === true) continue;
      const at = w.program.getSourceFile(ref.fileName);
      if (at === undefined) continue;
      if (isWrite(nodeAt(at, ref.textSpan.start))) {
        out.writes += 1;
        continue;
      }
      if (TEST.test(w.path(at))) out.testReads += 1;
      else out.reads += 1;
    }
  }
  return out;
}

/**
 * The pass.
 *
 * A field on a type declared inside a test is not asked about, and neither is
 * one whose own file is a test: a fixture's shape is the fixture's business.
 */
export function fieldSweep(w: Workspace): readonly Finding[] {
  const out: Finding[] = [];
  for (const file of w.files) {
    const path = w.path(file);
    if (TEST.test(path)) continue;

    for (const { owner, name } of fieldsOf(file)) {
      const { reads, writes, testReads } = uses(w, file, name);
      if (reads > 0) continue;

      const line = file.getLineAndCharacterOfPosition(name.getStart(file)).line + 1;
      const id = `${path}#${owner}.${name.text}`;
      if (writes === 0 && testReads === 0) {
        out.push({
          pass: 'field',
          id,
          file: path,
          line,
          grade: 'certain',
          what: `\`${owner}.${name.text}\` is declared and never mentioned again`,
        });
        continue;
      }
      if (writes > 0) {
        out.push({
          pass: 'field',
          id,
          file: path,
          line,
          grade: 'certain',
          what:
            `\`${owner}.${name.text}\` is WRITTEN (${writes}) and never read` +
            (testReads > 0 ? ` — though ${testReads} test read(s) exist` : ''),
          detail:
            'The shape of `cell.band`, `voice.dry` and `previewColour`: a value ' +
            'computed on every frame into a void. Either a screen should read ' +
            'it, or it should stop being computed.',
        });
        continue;
      }
      out.push({
        pass: 'field',
        id,
        file: path,
        line,
        grade: 'certain',
        what: `\`${owner}.${name.text}\` is read only by tests (${testReads})`,
      });
    }
  }
  return out;
}
