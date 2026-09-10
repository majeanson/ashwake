import ts from 'typescript';
import type { Finding } from './finding';
import type { Workspace } from './program';
import { readIndex } from './keys';

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

/** Wrap a symbol in code ticks for the report. A function rather than a
 *  template literal, so nothing in this file has to escape one. */
const code = (s: string): string => '`' + s + '`';
const TEST = /\.(test|spec|audit)\.tsx?$/;

/** Every property this file declares on a top-level type, with its name node. */
function fieldsOf(file: ts.SourceFile): readonly { owner: string; name: ts.Identifier }[] {
  const out: { owner: string; name: ts.Identifier }[] = [];

  /**
   * Walk a type's members, and DOWN into the ones that are themselves
   * type literals.
   *
   * The recursion is what makes P1.5 the same pass as this one. The catalogue
   * (`text/Strings.ts`) is one exported type six levels deep — `Strings` holds
   * `lesson`, which holds `ripe`, which holds `cardLean` — and a walk that
   * stopped at the top would ask about eleven fields and miss the six hundred
   * sentences underneath them. `figure.hold` and `figure.held`, the two dead
   * catalogue entries found by hand on 2026-09-09, live exactly there.
   *
   * An intersection is followed too, because that is how a lesson is declared:
   * `LessonHead & { core: string }`. Skipping it would hide every sentence in
   * the catalogue behind the two fields every lesson shares.
   */
  const members = (owner: string, list: ts.NodeArray<ts.TypeElement>): void => {
    for (const member of list) {
      if (!ts.isPropertySignature(member)) continue;
      if (!ts.isIdentifier(member.name)) continue;
      const here = owner === '' ? member.name.text : `${owner}.${member.name.text}`;
      out.push({ owner, name: member.name });
      const inner = member.type;
      if (inner === undefined) continue;
      if (ts.isTypeLiteralNode(inner)) {
        members(here, inner.members);
        continue;
      }
      if (ts.isIntersectionTypeNode(inner)) {
        for (const part of inner.types) {
          if (ts.isTypeLiteralNode(part)) members(here, part.members);
        }
      }
    }
  };

  /*
   * EVERY top-level type, exported or not (2026-09-10).
   *
   * This used to be `if (!exported(statement)) continue;`, and the two rituals
   * were quietly fighting. `CLAUDE.md`'s remedy for a file-internal export is
   * to DEMOTE it — and the first batch of that, 141 symbols, took `Ring` and
   * `ConfirmingProps` off this pass's surface along with them. Both had a
   * standing ruling in `allow.ts`; the report's own "Rulings that match
   * nothing" section is what said so, on the first run after the batch, which
   * is exactly the job that section was added to do.
   *
   * A field's readers are the whole program whatever its type's visibility, so
   * `export` was never the right question here. `Ring.width` is the case that
   * proves it: three authored numbers the board does not honour, ruled dead ON
   * PURPOSE by Marc — a ruling that stops being checked is a ruling nobody can
   * find their way back to.
   */
  for (const statement of file.statements) {
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

/**
 * The references to one field, fetched ONCE.
 *
 * Both questions below — is it read, and is its container indexed — walk the
 * same list, and asking the service twice doubled a fifty-second run into two
 * minutes. The list is small and the lookup is the expensive half.
 */
function refsOf(
  w: Workspace,
  file: ts.SourceFile,
  name: ts.Identifier,
): readonly ts.ReferenceEntry[] {
  const found = w.service.findReferences(file.fileName, name.getStart(file));
  const out: ts.ReferenceEntry[] = [];
  for (const symbol of found ?? []) {
    for (const ref of symbol.references) {
      if (ref.isDefinition === true) continue;
      out.push(ref);
    }
  }
  return out;
}
/**
 * A container read through a COMPUTED index, and which keys that index admits.
 *
 * The catalogue is read this way in four places — `s.figure[id]`,
 * `s.ui.camera[next]`, `s.ui.board.keys[id]`, `s.ui.tabs[id]` — and the
 * compiler cannot attribute an indexed access to one property, correctly: it
 * does not know which. So a walk of references reports every sentence under
 * those four as unread, which is thirty false findings and a report nobody
 * opens twice.
 *
 * **But the right answer is better than a suppression.** Where the index's own
 * type is a union of string literals — `FigureId` is exactly that — the set of
 * keys that can ever be reached is KNOWN, and a property outside it is
 * unreachable however many sentences it holds. That is `figure.hold` and
 * `figure.held`, the two dead catalogue entries found by hand on 2026-09-09:
 * `figureCaption` is `s.figure[id]` and `FigureId` is the six figures the
 * manual draws, and neither was ever among them.
 *
 * `null` keys means the index is a plain `string` and anything under it may be
 * reached, so nothing under it can be called dead.
 */
type Indexed = { readonly keys: ReadonlySet<string> | null };

function indexedBy(w: Workspace, refs: readonly ts.ReferenceEntry[]): Indexed | null {
  let keys: Set<string> | null = new Set();
  let any = false;
  {
    for (const ref of refs) {
      const at = w.program.getSourceFile(ref.fileName);
      if (at === undefined) continue;
      const node = nodeAt(at, ref.textSpan.start);
      const access = node.parent;
      if (access === undefined || !ts.isPropertyAccessExpression(access)) continue;
      const outer = access.parent;
      if (outer === undefined || !ts.isElementAccessExpression(outer)) continue;
      if (outer.expression !== access) continue;
      const arg = outer.argumentExpression;
      // A literal index is an ordinary read of one property and the reference
      // walk already counted it. Only a COMPUTED one hides the others.
      if (ts.isStringLiteral(arg)) continue;
      any = true;
      if (keys === null) continue;
      const type = w.checker.getTypeAtLocation(arg);
      const parts = type.isUnion() ? type.types : [type];
      for (const part of parts) {
        if (part.isStringLiteral()) keys.add(part.value);
        else keys = null;
        if (keys === null) break;
      }
    }
  }
  if (!any) return null;
  return { keys };
}

function uses(w: Workspace, refs: readonly ts.ReferenceEntry[]): Uses {
  const out: Uses = { reads: 0, writes: 0, testReads: 0 };
  {
    for (const ref of refs) {
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
/**
 * P1.5 — the catalogue sweep is THIS pass, taught to recurse, and the
 * decision is worth stating rather than leaving a reader to infer it.
 *
 * `text/Strings.ts` is one exported type six levels deep, and the question
 * `CLAUDE.md` asks of it — a sentence the catalogue holds that no screen
 * prints — is word for word the question this pass already asks of every
 * field: written by `fr-CA.ts` and `en.ts`, read by nobody. A second pass
 * would be the same walk under a different name, which is how two
 * instruments come to disagree about one fact.
 *
 * What it keeps is the LABEL. A reader looking for dead sentences should
 * find them together, so a finding in the catalogue is reported under `text`
 * and the report groups it accordingly.
 */
const passFor = (path: string): string => (path.endsWith('text/Strings.ts') ? 'text' : 'field');

export function fieldSweep(w: Workspace): readonly Finding[] {
  const out: Finding[] = [];
  const { unattributed } = readIndex(w);
  for (const file of w.files) {
    const path = w.path(file);
    if (TEST.test(path)) continue;

    /*
     * FIRST, which containers are read through a computed index, and which
     * keys that index admits. A separate pass over the same list, because a
     * child is adjudicated by what is known about its PARENT and the parent
     * may be declared after it inside an intersection.
     */
    /* The module a reader would spell to import this file — `@meta/features`
     * is how `Settings.tsx` names the home of `FeatureDef`. */
    const moduleName = path.replace(/.tsx?$/, '').split('/').slice(-2).join('/');
    const fields = fieldsOf(file);
    const refs = new Map<ts.Identifier, readonly ts.ReferenceEntry[]>();
    for (const { name } of fields) refs.set(name, refsOf(w, file, name));
    const indexed = new Map<string, Indexed>();
    for (const { owner, name } of fields) {
      const at = indexedBy(w, refs.get(name) ?? []);
      if (at !== null) indexed.set(owner === '' ? name.text : owner + '.' + name.text, at);
    }

    for (const { owner, name } of fields) {
      const { reads, writes, testReads } = uses(w, refs.get(name) ?? []);
      // A DIRECT read settles it, whatever the parent is. `keys.title` is
      // both spelled out in the manual's heading and a sibling of ten
      // entries reached by index; asking the index about it first said it
      // could not be reached, one line above the code that reads it.
      if (reads > 0) continue;

      const parent = indexed.get(owner);
      if (parent !== undefined) {
        // Reached by an index that admits anything: nothing under it can be
        // called dead, and saying so would be thirty rows of noise.
        if (parent.keys === null) continue;
        if (parent.keys.has(name.text)) continue;
        const line = file.getLineAndCharacterOfPosition(name.getStart(file)).line + 1;
        out.push({
          pass: passFor(path),
          id: path + '#' + owner + '.' + name.text,
          file: path,
          line,
          grade: 'certain',
          what:
            code(owner + '.' + name.text) +
            ' cannot be reached: the index that reads ' +
            code(owner) +
            ' admits ' +
            String(parent.keys.size) +
            ' keys and this is not one',
          detail:
            'The ' +
            code('figure.hold') +
            ' shape: a catalogue entry under a container read as ' +
            code('s.x[id]') +
            ', whose key type does not include it. Sentences nothing can print.',
        });
        continue;
      }

      /*
       * A READ THE COMPILER COULD NOT ATTRIBUTE, in a file that names this
       * type (2026-09-10) — see `keys.ts#readIndex` for the whole argument.
       *
       * `] as const satisfies readonly FeatureDef[]` gives the table an
       * element type that is the LITERAL, so `FEATURES.filter((f) => f.player)`
       * reads a property `findReferences` cannot connect to
       * `FeatureDef.player`. All four of that type's fields reported as written
       * and never read while SETTINGS was built on three of them, and
       * `AssetSlot` did the same on thirteen writes. Eight false findings in
       * one report, one shape.
       */
      if (unattributed(name.text, owner, moduleName)) continue;

      const line = file.getLineAndCharacterOfPosition(name.getStart(file)).line + 1;
      const id = `${path}#${owner}.${name.text}`;
      if (writes === 0 && testReads === 0) {
        out.push({
          pass: passFor(path),
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
          pass: passFor(path),
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
        pass: passFor(path),
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
