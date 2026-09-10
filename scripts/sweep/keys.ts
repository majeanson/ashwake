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

type KeyIndex = {
  /** Files, other than the declaring one, that write a key of this name. */
  readonly writers: (name: string, exceptFile: string) => readonly string[];
};

/**
 * THE SAME PROBLEM, MIRRORED — reads the compiler cannot attribute (2026-09-10).
 *
 * The optional pass needed unattributable WRITES; the field pass needs
 * unattributable READS, and it needs them for the same reason. A table declared
 * `] as const satisfies readonly FeatureDef[]` has an element type that is the
 * LITERAL, not `FeatureDef` — so `FEATURES.filter((f) => f.player)` reads a
 * property whose declaration is the object literal, and `findReferences` on
 * `FeatureDef.player` never sees it. All four of `FeatureDef`'s fields came
 * back "WRITTEN (3) and never read" while the settings panel was built on
 * three of them, and `AssetSlot` did the same on thirteen writes.
 *
 * **The filter is what keeps this from muting real findings.** `keys.ts`'s
 * standing trade — an unattributable write of the same name elsewhere silences
 * a true finding, which is the right way round — is too generous here, because
 * the names are `id`, `label`, `note`, `count`. So a read only withholds when
 * it sits in a file that NAMES the owner type: `features.ts` mentions
 * `FeatureDef`, and a `.count` read in `Board.tsx` cannot silence
 * `ColourPotential.count` unless that file mentions `ColourPotential`. Crude
 * on purpose — the alternative is resolving structural assignability for every
 * property in the program, and this answers the whole class the first report
 * hit for two lines of filter.
 *
 * **THE COST, STATED: A DECODER LOOKS LIKE A CONSUMER.** `meta/timeline.ts`
 * destructures `RunDetail`'s six numbers off an `unknown` blob, checks each
 * with `isCount`, and writes them straight back out — so this index counts six
 * reads and withholds six findings the hand pass had already called dead
 * weight in that blob. Validating a value and copying it IS a read by any
 * definition a compiler can offer; telling it apart from USING one needs
 * dataflow this pass does not have. So those six live in `PASS.md` P7, which
 * is about compacting the very blob they sit in, rather than in a report that
 * can no longer see them. A blind spot named in the ledger is worth more than
 * a heuristic guessing at it.
 */
type ReadIndex = {
  /**
   * Whether any file that could plausibly be reading THIS type reads a key
   * called `name` off a shape the compiler could not attribute.
   *
   * "Plausibly" is two spellings, and the second was needed within the hour:
   * a file that names the TYPE (`features.ts` says `FeatureDef`), or one that
   * names the MODULE the type is declared in (`Settings.tsx` says
   * `@meta/features` and reads `feature.wired` three times off
   * `PLAYER_FEATURES`, whose element type is the literal). Naming only the
   * type left `wired` reported as unread while the NOT BUILT row it decides
   * was sitting in the diff.
   */
  readonly unattributed: (name: string, owner: string, module: string) => boolean;
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

/** The read half. `ReadIndex` above carries the argument. */
export function readIndex(w: Workspace): ReadIndex {
  const byName = new Map<string, Set<string>>();
  const text = new Map<string, string>();

  const declaresIt = (symbol: ts.Symbol | undefined): boolean =>
    (symbol?.declarations ?? []).some(
      (d) => ts.isPropertySignature(d) || ts.isPropertyDeclaration(d),
    );

  for (const file of w.files) {
    const path = w.path(file);
    // A test is allowed to withhold here, unlike in `keyIndex`: the field pass
    // already counts a test read separately and says so in the row.
    text.set(path, file.text);
    const note = (name: string): void => {
      const set = byName.get(name) ?? new Set<string>();
      set.add(path);
      byName.set(name, set);
    };
    const visit = (node: ts.Node): void => {
      // `f.player` — reading a property off something.
      if (
        ts.isPropertyAccessExpression(node) &&
        ts.isIdentifier(node.name) &&
        !declaresIt(w.checker.getSymbolAtLocation(node.name))
      ) {
        note(node.name.text);
      }
      // `const { player } = f` — the destructuring IS the read.
      if (ts.isBindingElement(node) && node.parent !== undefined) {
        const key = node.propertyName ?? node.name;
        if (
          ts.isObjectBindingPattern(node.parent) &&
          ts.isIdentifier(key) &&
          !declaresIt(w.checker.getSymbolAtLocation(key))
        ) {
          note(key.text);
        }
      }
      node.forEachChild(visit);
    };
    visit(file);
  }

  return {
    unattributed: (name, owner, module) => {
      const files = byName.get(name);
      if (files === undefined) return false;
      for (const f of files) {
        const src = text.get(f) ?? '';
        if (src.includes(owner) || src.includes(module)) return true;
      }
      return false;
    },
  };
}
