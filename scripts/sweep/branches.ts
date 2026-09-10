import ts from 'typescript';
import type { Finding } from './finding';
import type { Workspace } from './program';

/**
 * P1.4 — the branch sweep: **grep the branches of a consumed value, not only
 * the value** (`CLAUDE.md`, 2026-09-03).
 *
 * The fifteenth inert mechanic, and the first that was eating others.
 * `Teach.as` is `'card' | 'toast'`; `App` consumed `nextLesson` only where
 * `as === 'card'`, so the seven toast-class moments were never spoken and
 * never marked told — and because `nextLesson` returns the FIRST unmet moment,
 * an unspeakable toast stood in front of every card behind it. A fresh device
 * could never be taught MAGIC, UNIQUE, LUCK, RELICS or THE COLOURS.
 *
 * Every earlier sweep walked past it, because the dead thing was one BRANCH of
 * a value that had a consumer. `teach` was read; `teach.as === 'toast'` was
 * not.
 *
 * **The heuristic, and it is a heuristic.** A union member is only reported
 * when at least one OTHER member of the same union is compared against
 * somewhere. That is what separates a union used for BRANCHING — where a
 * member nobody handles is a hole — from one used as a key or a label, where
 * no member is ever compared and none of them is a finding. It graded
 * `likely` rather than `certain` for that reason: a member handled through a
 * lookup table rather than an `if` is invisible here, and the report says so
 * rather than pretending otherwise.
 */

const TEST = /\.(test|spec|audit)\.tsx?$/;
const code = (s: string): string => '`' + s + '`';

/** Every string value this codebase actually compares against, anywhere. */
function comparedValues(w: Workspace): ReadonlySet<string> {
  const out = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node)) {
      const parent = node.parent;
      if (parent !== undefined) {
        if (
          ts.isBinaryExpression(parent) &&
          (parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ||
            parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken ||
            parent.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken ||
            parent.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken)
        ) {
          out.add(node.text);
        }
        // `case 'toast':` — the other way a branch is spelled.
        if (ts.isCaseClause(parent)) out.add(node.text);
        /*
         * `new Set(['a', 'b']).has(x)` and `['a', 'b'].includes(x)` are
         * branches too, and this codebase uses both — `CARDS` in
         * `shell/teaching.ts` is a Set of lesson ids and membership in it IS
         * the card/toast decision. Counting an array or set element as a
         * comparison is deliberately generous: this pass would rather miss a
         * hole than invent one.
         */
        if (ts.isArrayLiteralExpression(parent)) out.add(node.text);
      }
    }
    node.forEachChild(visit);
  };
  for (const file of w.files) visit(file);
  return out;
}

/** Every string-literal union a property declares, with where it was declared. */
type Union = {
  readonly owner: string;
  readonly field: string;
  readonly members: readonly string[];
  readonly at: ts.Node;
};

function unionsOf(file: ts.SourceFile): readonly Union[] {
  const out: Union[] = [];

  const literals = (type: ts.TypeNode): readonly string[] | null => {
    if (!ts.isUnionTypeNode(type)) return null;
    const names: string[] = [];
    for (const part of type.types) {
      if (!ts.isLiteralTypeNode(part)) return null;
      if (!ts.isStringLiteral(part.literal)) return null;
      names.push(part.literal.text);
    }
    return names.length >= 2 ? names : null;
  };

  const members = (owner: string, list: ts.NodeArray<ts.TypeElement>): void => {
    for (const member of list) {
      if (!ts.isPropertySignature(member)) continue;
      if (!ts.isIdentifier(member.name)) continue;
      if (member.type === undefined) continue;
      const found = literals(member.type);
      if (found !== null)
        out.push({ owner, field: member.name.text, members: found, at: member.name });
    }
  };

  /*
   * EVERY top-level declaration, exported or not (2026-09-10). `fields.ts`
   * carries the argument: the 141-symbol demotion batch `CLAUDE.md` asks for
   * silently shrank three of these five passes at once, and `export` was never
   * the right question for a call site or a comparison.
   */
  for (const statement of file.statements) {
    if (ts.isInterfaceDeclaration(statement)) members(statement.name.text, statement.members);
    else if (ts.isTypeAliasDeclaration(statement) && ts.isTypeLiteralNode(statement.type)) {
      members(statement.name.text, statement.type.members);
    }
  }
  return out;
}

export function branchSweep(w: Workspace): readonly Finding[] {
  const compared = comparedValues(w);
  const out: Finding[] = [];
  for (const file of w.files) {
    const path = w.path(file);
    if (TEST.test(path)) continue;

    for (const union of unionsOf(file)) {
      const handled = union.members.filter((m) => compared.has(m));
      const missed = union.members.filter((m) => !compared.has(m));
      // Nobody branches on this union at all: it is a key or a label, and
      // every member is equally unhandled, which makes none of them a hole.
      if (handled.length === 0) continue;
      if (missed.length === 0) continue;

      const line = file.getLineAndCharacterOfPosition(union.at.getStart(file)).line + 1;
      out.push({
        pass: 'branch',
        id: path + '#' + union.owner + '.' + union.field,
        file: path,
        line,
        grade: 'likely',
        what:
          code(union.owner + '.' + union.field) +
          ' is branched on, and ' +
          missed.map((m) => code("'" + m + "'")).join(', ') +
          ' ' +
          (missed.length === 1 ? 'is' : 'are') +
          ' never compared against',
        detail:
          'The ' +
          code("teach.as === 'toast'") +
          ' shape: a value with a consumer, and one of its branches with none. ' +
          'Handled here: ' +
          handled.map((m) => code("'" + m + "'")).join(', ') +
          '.',
      });
    }
  }
  return out;
}
