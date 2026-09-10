import ts from 'typescript';
import type { Workspace } from './program';

/**
 * Every key this codebase writes into an object literal or a JSX attribute,
 * by NAME (`PASS.md` P1.9, 2026-09-10).
 *
 * **The blind spot this exists to cover, and it produced four false findings
 * before it was built.** `findReferences` is symbol-based, which is what makes
 * it beat a grep — and a symbol is exactly what an object literal inside a
 * generic callback does not share with the type it ends up as:
 *
 *     <Bars rows={COLOURS.map((c) => ({ label, icon, value, paint }))} />
 *
 * `map` infers its element type from the literal rather than taking it from
 * `readonly Bar[]`, so those four keys are their own symbols and `Bar.paint`
 * looks like a field nothing supplies. It is supplied, twice, in
 * `Payout.tsx`. The same shape hid `Tab.grows`, which `Manual.tsx:218` sets.
 * A spread does it too: `ColourPotential`'s five numbers are filled by
 * `{ colour, ...acc.get(colour)! }` and carry no reference at all.
 *
 * **So this indexes UNATTRIBUTABLE writes only, and is used to withhold a
 * claim.** A key counts here when the compiler cannot say which declared
 * property it fills — which is precisely the inferred-literal case above. A
 * key that resolves to a property declared somewhere is somebody else's field
 * and says nothing about ours.
 *
 * **That distinction was learned the hard way, one commit after a blunter
 * version.** Withholding on the NAME alone silenced `Said.brief` — the
 * repository's own signature miss, with thirty lines at its declaration
 * explaining that nothing sets it — because `App.tsx` writes `brief=` as a
 * JSX attribute on `SaidCard`, whose props type declares a `brief` of its own.
 * Two different properties, one name. The blunt version reported it as
 * supplied; nothing would have said so, and the allowlist entry for it fell
 * silently through the floor. The report grew a `Rulings that match nothing`
 * section the same hour, for exactly that reason.
 *
 * The trade that remains is stated plainly: a genuinely unattributable write
 * of the same name elsewhere still silences a true finding. That is the right
 * way round — a sweep that invents findings is a sweep nobody runs twice.
 *
 * The founding case survives. `perkAt` is written nowhere but its own test.
 */

const TEST = /\.(test|spec|audit)\.tsx?$/;

export type KeyIndex = {
  /** Files, other than the declaring one, that write a key of this name. */
  readonly writers: (name: string, exceptFile: string) => readonly string[];
};

export function keyIndex(w: Workspace): KeyIndex {
  const byName = new Map<string, Set<string>>();

  const note = (name: string, file: string): void => {
    const set = byName.get(name) ?? new Set<string>();
    set.add(file);
    byName.set(name, set);
  };

  /**
   * Does this written key resolve to a property DECLARED somewhere?
   *
   * If it does, it fills that declaration and not ours, whatever it is
   * called. If it does not — the symbol's only declarations are the literal
   * or attribute itself — then the compiler could not attribute it, and it
   * may be filling any structurally-compatible type, ours included.
   */
  const declaresIt = (symbol: ts.Symbol | undefined): boolean =>
    (symbol?.declarations ?? []).some(
      (d) => ts.isPropertySignature(d) || ts.isPropertyDeclaration(d),
    );

  const attributable = (name: ts.Identifier): boolean =>
    declaresIt(w.checker.getSymbolAtLocation(name));

  /**
   * A JSX attribute is attributed through the ELEMENT'S PROPS TYPE, not by
   * asking the attribute what it is.
   *
   * `getSymbolAtLocation` on an attribute name hands back the attribute's own
   * symbol, whose only declaration is the attribute — so every `<X foo={} />`
   * in the codebase read as unattributable and withheld a finding for any
   * field called `foo` anywhere. That is how `Said.brief` stayed silenced
   * after the first fix: `App.tsx` passes `brief=` to `SaidCard`, whose props
   * type declares a `brief` of its own, and the attribute never resolved to
   * it. Going through the contextual props type is what actually answers
   * *which declared property does this attribute fill*.
   */
  const attributableJsx = (attr: ts.JsxAttribute, name: ts.Identifier): boolean => {
    const props = w.checker.getContextualType(attr.parent);
    if (props === undefined) return attributable(name);
    return declaresIt(props.getProperty(name.text));
  };

  for (const file of w.files) {
    const path = w.path(file);
    // A test writing a key is exactly what hid `perkAt`, so tests are not
    // allowed to withhold a finding.
    if (TEST.test(path)) continue;
    const visit = (node: ts.Node): void => {
      if (
        (ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) &&
        node.parent !== undefined &&
        ts.isObjectLiteralExpression(node.parent) &&
        ts.isIdentifier(node.name) &&
        !attributable(node.name)
      ) {
        note(node.name.text, path);
      }
      if (
        ts.isJsxAttribute(node) &&
        ts.isIdentifier(node.name) &&
        !attributableJsx(node, node.name)
      ) {
        note(node.name.text, path);
      }
      node.forEachChild(visit);
    };
    visit(file);
  }

  return {
    writers: (name, exceptFile) =>
      [...(byName.get(name) ?? new Set<string>())].filter((f) => f !== exceptFile),
  };
}
