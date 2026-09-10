import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/**
 * ONE program over the whole workspace (`PASS.md` P1, 2026-09-09).
 *
 * Every sweep in `CLAUDE.md` asks a question that crosses a package boundary.
 * "An export in `packages/core` with no importer in `apps/game`" is the ritual
 * as written, and **no tsconfig in this repository can answer it**: the core's
 * includes stop at its own `src`, the game's stop at its own, and the root's
 * cover only `scripts` and `e2e`. Three programs each see a third of the
 * graph, and a symbol dead in all three looks alive in each.
 *
 * So this builds a fourth: every source file in the workspace as a root file,
 * one path map, one checker. It is not a build — nothing is emitted and
 * `noEmit` stays on — it is a graph to ask questions of.
 *
 * **A LanguageService rather than a hand-walked import list.** The temptation
 * is to read every `import` statement and match names, and it is wrong three
 * ways this codebase actually contains: a re-export (`export { x } from`), an
 * aliased import (`import { x as y }`), and a type-only import that a value
 * sweep must count as a reader anyway. `findReferences` is the compiler's own
 * answer and it gets all three right for free. It costs a few seconds over 268
 * files, which is nothing against being wrong about which mechanic is dead.
 *
 * **The sweep may not sweep its own fixtures.** `fixtures/` holds deliberately
 * dead code — that is what the tests assert against — so it is excluded here
 * rather than filtered later. A fixture that reached the real report would be
 * a finding nobody can fix, which is the fastest way to teach a reader to skip
 * the report.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(HERE, '..', '..');

/** Where source lives, in the order a reader would look. */
const SOURCE_DIRS = [
  'packages/core/src',
  'packages/core/scripts',
  'apps/game/src',
  'scripts',
  'e2e',
] as const;

/** Directories inside those that are not part of the graph being asked about. */
const SKIP = new Set(['node_modules', '__snapshots__', 'fixtures']);

/** The layer aliases, from `tsconfig.base.json`, resolved against the root. */
const LAYERS = ['engine', 'content', 'meta', 'render', 'theme', 'view', 'text', 'sim'] as const;

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, out);
      continue;
    }
    if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(full);
  }
}

/** Every file the sweep considers, absolute, in a stable order. */
export function sourceFiles(): readonly string[] {
  const found: string[] = [];
  for (const dir of SOURCE_DIRS) walk(join(ROOT, dir), found);
  return found.sort();
}

/**
 * The compiler options, read from `tsconfig.base.json` rather than retyped.
 *
 * The same argument `scripts/notices.ts` won: a transcribed fact is one that
 * can drift, and the one that would drift here is `paths`. A layer added to
 * the base config and not to this file would make every export under it look
 * unreachable — a sweep reporting a whole layer as dead, which is exactly the
 * kind of false positive that gets a report ignored.
 */
export function options(): ts.CompilerOptions {
  const file = join(ROOT, 'tsconfig.base.json');
  const raw = ts.readConfigFile(file, (p) => readFileSync(p, 'utf8'));
  if (raw.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(raw.error.messageText, '\n'));
  }
  const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, ROOT);
  const paths: ts.MapLike<string[]> = {};
  for (const layer of LAYERS) paths[`@${layer}/*`] = [`./packages/core/src/${layer}/*`];
  return {
    ...parsed.options,
    // The game is the only thing here with JSX in it, and a program that
    // cannot parse a `.tsx` sees no consumer in any screen — which would make
    // every export the chrome reads look dead.
    jsx: ts.JsxEmit.ReactJSX,
    baseUrl: ROOT,
    paths,
    noEmit: true,
    // `skipLibCheck` is inherited and stays: the sweep asks about this
    // repository's own symbols, and checking three's `.d.ts` files costs
    // seconds for an answer nothing here reads.
    skipLibCheck: true,
  };
}

/** The program and the service, built once and shared by every pass. */
export type Workspace = {
  readonly program: ts.Program;
  readonly service: ts.LanguageService;
  readonly checker: ts.TypeChecker;
  readonly files: readonly ts.SourceFile[];
  /** Repo-relative, forward-slashed — what a finding prints and a human greps. */
  readonly path: (file: ts.SourceFile) => string;
};

export function workspace(): Workspace {
  const roots = sourceFiles();
  const versions = new Map<string, string>();
  for (const f of roots) versions.set(f, '1');

  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => [...roots],
    getScriptVersion: (f) => versions.get(f) ?? '1',
    getScriptSnapshot: (f) => {
      if (!existsSync(f)) return undefined;
      return ts.ScriptSnapshot.fromString(readFileSync(f, 'utf8'));
    },
    getCurrentDirectory: () => ROOT,
    getCompilationSettings: options,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    // Wrapped rather than handed over: `ts.sys`'s methods are borrowed off an
    // object, which `@typescript-eslint/unbound-method` refuses on sight and
    // is right to — a host that captures a method loses `this` the moment the
    // implementation grows one.
    fileExists: (f) => ts.sys.fileExists(f),
    readFile: (f, encoding) => ts.sys.readFile(f, encoding),
    readDirectory: (d, ext, exclude, include, depth) =>
      ts.sys.readDirectory(d, ext, exclude, include, depth),
    directoryExists: (d) => ts.sys.directoryExists(d),
    getDirectories: (d) => ts.sys.getDirectories(d),
    // Spread rather than assigned, because `exactOptionalPropertyTypes` is on
    // workspace-wide and `ts.sys.realpath` is optional on platforms that have
    // no such call. Assigning `undefined` to an optional method is a type
    // error here, and rightly: absent and present-but-undefined differ.
    ...(ts.sys.realpath === undefined
      ? {}
      : { realpath: (f: string) => ts.sys.realpath?.(f) ?? f }),
  };

  const service = ts.createLanguageService(host, ts.createDocumentRegistry());
  const program = service.getProgram();
  if (program === undefined) throw new Error('the language service built no program');
  const files = roots
    .map((f) => program.getSourceFile(f))
    .filter((f): f is ts.SourceFile => f !== undefined);

  return {
    program,
    service,
    checker: program.getTypeChecker(),
    files,
    // `sep` rather than a backslash literal: this runs on Windows, and a
    // finding's path is read beside the ledgers, which are POSIX.
    path: (file) => relative(ROOT, file.fileName).split(sep).join('/'),
  };
}
