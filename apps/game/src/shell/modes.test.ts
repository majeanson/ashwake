import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * `MODES.md` AND `INTERACTIONS.md`, ANSWERING TO TESTS (`PASS.md` P10).
 *
 * **The written question was whether a matrix can be generated without
 * becoming a matrix nobody reads. Having looked: no, and it should not be.**
 * A generated door table prints what the compiler already knows — `daily` is a
 * `string | null` at every door — and cannot print the only column anybody
 * opens the file for, which is WHY. What it would produce is documentation of
 * the type system, and `PASS.md` P10 names that failure itself.
 *
 * So this file takes the outcome that row pre-authorised: **a test that fails
 * when the doc and the code disagree, and no generation at all.** The prose
 * stays hand-written; what is asserted is the SHAPE, and only where the doc is
 * already machine-shaped. `MODES.md`'s door table has column headers that ARE
 * `Door`'s field names and rows that ARE call sites, which is structure worth
 * checking. `INTERACTIONS.md`'s third column is a narrative comparison against
 * Ashwake 1 and is not: annotating a hundred prose rows with handler names
 * buys a check at the cost of the readability that makes anyone open it, which
 * is the failure rather than the fix.
 *
 * **WHAT THESE TESTS THEMSELVES FOUND: almost nothing, and it is worth saying
 * so.** The first draft of this docblock claimed `INTERACTIONS.md` described
 * two symbols the code no longer has. It does not: `searchFor` is written as
 * "is **gone**" in its own sentence and `isTappable` is past tense on purpose.
 * Six names failed to resolve on the first run and every one was correct prose
 * — two deliberate history, four the platform's (`contextmenu`, `change`,
 * `visible`, `inert`). One real inaccuracy: `MODES.md` QUOTED
 * `state.rootSeed !== world.worldSeed` while `settle` compares against
 * `before`, which is the argument for citing a test instead of quoting code.
 *
 * So their value is PROSPECTIVE, and each is chosen for what it would catch
 * rather than for what it caught: a fifth door with no row, an eleventh `Door`
 * field nobody classified, a door inheriting a flag from a spread, a seed guard
 * whose TEST was deleted, an `economyFor` kind with no column, a renamed symbol
 * still named here. **Every one of those is a bug this repository has actually
 * had.**
 *
 * **The item's real find came from somewhere else, and that is the lesson.**
 * `INTERACTIONS.md` said `previewColour` was "unread ON PURPOSE now" — on the
 * row written expressly to stop a fourth pass re-opening it — and `HexField`
 * has read it as a preview FILL since 2026-09-08, which is what the reverted
 * attempt's own post-mortem prescribed. **A stale ruling sends a session to
 * re-open a question that was already ANSWERED**, which is P10.5's failure
 * pointing the other way. Nothing here caught it: it was caught by asking why
 * `pnpm sweep` reported nothing about a field the matrix called dead. Two
 * instruments disagreeing is the finding, and P10.4 — one home for the
 * ruled-dead — is the fix for the class.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

/** The header cells of the first table under a heading. */
function headerOf(md: string, after: string): readonly string[] {
  const at = md.indexOf(after);
  expect(at, `no heading ${after}`).toBeGreaterThan(-1);
  const line = md
    .slice(at)
    .split('\n')
    .find((l) => l.startsWith('| '));
  return (line ?? '')
    .split('|')
    .map((c) => c.trim().replace(/\*\*/g, '').replace(/`/g, ''))
    .filter((c) => c !== '');
}

/** The body rows of the first table under a heading. */
function rowsOf(md: string, after: string): readonly string[] {
  const lines = md.slice(md.indexOf(after)).split('\n');
  const first = lines.findIndex((l) => l.startsWith('| '));
  const out: string[] = [];
  // Past the header and the `| --- |` separator.
  for (const line of lines.slice(first + 2)) {
    if (!line.startsWith('| ')) break;
    out.push(line);
  }
  return out;
}

describe('MODES.md answers to the code', () => {
  const modes = read('MODES.md');
  const beginning = read('apps/game/src/shell/beginning.ts');
  const app = read('apps/game/src/App.tsx');

  /*
   * P10.1 — "a flag added is a row added, or the test fails".
   *
   * Coverage rather than equality, because `Door` carries ten fields and only
   * some of them define a MODE: `resume`, `seed`, `wakeAt` and `fromMenus` are
   * facts about one PRESS. The file names those out loud under NOT MODE FLAGS,
   * so an eleventh field fails here until somebody decides which it is — which
   * is the whole check, and the one question the compiler cannot ask.
   */
  it('shows every mode-defining field of `Door`, and names the ones it leaves out', () => {
    const decl = beginning.slice(beginning.indexOf('export type Door = {'));
    const fields = [...decl.slice(0, decl.indexOf('\n};')).matchAll(/^ {2}readonly (\w+):/gm)].map(
      (m) => m[1] as string,
    );
    expect(fields.length, 'no `Door` fields parsed — did the declaration move?').toBeGreaterThan(5);

    const columns = headerOf(modes, '## The doors');
    const excuses = modes.slice(modes.indexOf('NOT MODE FLAGS'));
    expect(excuses, 'MODES.md has no NOT MODE FLAGS block').not.toBe('');
    for (const field of fields) {
      expect(
        columns.includes(field) || excuses.includes('`' + field + '`'),
        `\`Door.${field}\` is neither a column in MODES.md's door table nor under NOT MODE FLAGS`,
      ).toBe(true);
    }
  });

  it('has a row for every door', () => {
    // Four doors go through `enterRun`; boot and RESET ALL do not, and the
    // table marks both. A fifth caller fails this until it has a row.
    const callers = [...app.matchAll(/\benterRun\(wiring, \{/g)].length;
    expect(callers, 'no `enterRun` call sites found in App.tsx').toBeGreaterThan(0);

    const rows = rowsOf(modes, '## The doors');
    const through = rows.filter((r) => !/not `enterRun`|direct `session\.restart`/.test(r));
    expect(
      through.length,
      `MODES.md's door table has ${String(through.length)} rows going through \`enterRun\` ` +
        `and App.tsx has ${String(callers)} call sites`,
    ).toBe(callers);
  });

  /*
   * And every door spells its whole `Door` out inline, which is what makes the
   * compiler the check that type's docblock claims it is. A door that spread a
   * default would compile with a new field silently inherited — which is
   * exactly what `detour` was before it moved onto `Door`.
   */
  it('lets no door inherit a flag from a spread', () => {
    for (const [i, call] of [...app.matchAll(/\benterRun\(wiring, \{/g)].entries()) {
      const body = app.slice(call.index, app.indexOf('});', call.index));
      expect(
        body.includes('...'),
        `enterRun call ${String(i + 1)} spreads a default instead of stating its whole Door`,
      ).toBe(false);
    }
  });
});

describe('MODES.md’s guards, readers and kinds are real', () => {
  const modes = read('MODES.md');
  const settle = read('apps/game/src/shell/settle.ts');

  /*
   * P10.2 — the two guards asserted rather than described. A guard deleted or
   * loosened would leave the file promising a rule nobody keeps, and the daily
   * half is the one ledger compared BETWEEN people — the only one where nobody
   * outside this device could notice.
   */
  it('cites, for each guard, a suite that still exists', () => {
    /*
     * The citation, and not the expression.
     *
     * Text-matching `settle`'s comparison is what this test did for an hour and
     * it failed: the file quoted `world.worldSeed` while the code compares
     * against `before`, so the assertion was pinning a tidy-up rather than a
     * rule. Worse, passing it would have taught the matrix to quote code — and
     * a doc that quotes code has to be edited every time the code is tidied,
     * which is how it stops being edited at all.
     *
     * A guard is protected by its TEST. So the matrix names the test and this
     * asserts the name resolves: deleting the proof fails here, which is
     * strictly stronger than noticing afterwards that a sentence has rotted.
     */
    const proofs = read('apps/game/src/shell/settle.test.ts');
    const cited = [...modes.matchAll(/Proved by \*\*"([^"]+)"\*\*/g)].map((m) => m[1] as string);
    expect(cited.length, "MODES.md's two guards cite no suites").toBe(2);
    // Compared on the words: the prose uses a typographic apostrophe and the
    // source may not, and neither spelling is the thing being asserted.
    const words = (s: string): string =>
      s
        .replace(/[^a-z ]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const flat = words(proofs);
    for (const name of cited) {
      expect(
        flat.includes(words(name)),
        `MODES.md cites a suite called "${name}" and settle.test.ts has none`,
      ).toBe(true);
    }
    // And both guards are still where the citations say they are.
    expect(settle, '`settleDaily` lost its date guard').toMatch(/rootSeed !== dailySeed\(/);
    expect(settle, '`settle` lost its world-seed guard').toMatch(/rootSeed !== \w+\.worldSeed/);
  });

  it('names five readers that all still exist', () => {
    const rows = rowsOf(modes, '## Which reader may see a foreign board');
    expect(rows.length, 'the reader table lost or gained a row').toBe(5);

    // Against every declaration in both trees rather than a hand-picked three:
    // one of the five is `worldHeld`, a `useCallback` inside `App.tsx`, and
    // picking the files by hand is how this assertion would have lied.
    const declared = declaredNames();
    for (const row of rows) {
      const named = /`(\w+)\(/.exec(row)?.[1];
      expect(named, `a reader row names no function: ${row.slice(0, 60)}`).toBeDefined();
      expect(
        declared.has(String(named)),
        `MODES.md's reader table names \`${String(named)}\`, declared nowhere`,
      ).toBe(true);
    }
  });

  /*
   * ONE THING MINTS A WORLD SEED (`PASS.md` P2.6, 2026-09-10).
   *
   * `MODES.md` lists four places a world comes from, and `freshWorldSeed`'s
   * docblock states the property they must share: the clock is mixed with
   * entropy so a seed stays *"roughly ordered, so a seed in a bug report says
   * roughly when, and no longer collidable"*.
   *
   * It was true of three of the four. `App`'s `takeCrossing` minted with
   * `Math.floor(Math.random() * 2 ** 31)` — no clock — so a crossed-into world
   * was the one world whose seed said nothing about when it was born. The
   * ledger recorded that NEW RUN, the world switcher and RESET ALL had each
   * rolled their own once; the crossing was the one that survived that fix,
   * because it MINTS a world rather than reading a slot's.
   *
   * So the guard is on the reflex rather than on the four sites: a raw
   * `Math.random` in the game's source is either the minter, a crash id, or a
   * new second implementation of one of them. Named exceptions rather than a
   * pattern, so adding one is a decision somebody writes down.
   */
  it('leaves exactly one `Math.random` that mints anything', () => {
    const allowed = new Map([
      ['apps/game/src/shell/storage.ts', 'the world-seed minter itself'],
      ['apps/game/src/shell/failure.ts', 'a crash report id, which is not a seed'],
    ]);
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          walk(rel);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name) || /\.(test|spec)\.tsx?$/.test(entry.name)) continue;
        const src = readFileSync(join(ROOT, rel), 'utf8');
        // Only where it is CALLED. Two board files explain at length why they
        // do not use one, and a comment is not a second minter.
        for (const line of src.split('\n')) {
          if (!/Math\.random\(/.test(line)) continue;
          if (/^\s*[*/]/.test(line)) continue;
          if (!allowed.has(rel)) offenders.push(`${rel}: ${line.trim()}`);
        }
      }
    };
    walk('apps/game/src');
    expect(
      offenders,
      'a new `Math.random` in the game: if it mints a world seed it wants ' +
        '`freshWorldSeed`, and if it does not it wants a line in this test',
    ).toEqual([]);
  });

  /*
   * The three kinds the file is named for, and the mapping is the interesting
   * half: the columns are WORLD, DAILY and SHARED — what a player would call
   * them — while `economyFor` knows `home`, `daily` and `detour`. That
   * translation exists in exactly one place, the table's own Economy row, so
   * that is where it is checked.
   */
  it('maps every kind `economyFor` knows onto a column', () => {
    const economy = read('apps/game/src/shell/economy.ts');
    const kinds = new Set([...economy.matchAll(/readonly kind: '(\w+)'/g)].map((m) => m[1]));
    expect(kinds.size, 'no economy kinds parsed from `economyFor`').toBe(3);

    const row = rowsOf(modes, '## The three kinds').find((r) => r.startsWith('| Economy'));
    expect(row, "MODES.md's three-kinds table has no Economy row").toBeDefined();
    for (const kind of kinds) {
      expect(
        (row ?? '').includes('`' + String(kind) + '`'),
        `\`economyFor\` knows the kind '${String(kind)}' and MODES.md's Economy row does not name it`,
      ).toBe(true);
    }
  });
});

/** Every `const`/`function`/`type`/`class` name declared in the two source trees. */
function declaredNames(): ReadonlySet<string> {
  const out = new Set<string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(rel);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const src = readFileSync(join(ROOT, rel), 'utf8');
      for (const m of src.matchAll(
        /^\s*(?:export )?(?:declare )?(?:async )?(?:const|let|function|type|class|interface|enum) (\w+)/gm,
      )) {
        out.add(m[1] as string);
      }
      // A method or a field on a type is a name a matrix may legitimately use.
      for (const m of src.matchAll(/^\s*(?:readonly )?(\w+)[?]?:/gm)) out.add(m[1] as string);
    }
  };
  walk('packages/core/src');
  walk('apps/game/src');
  return out;
}

describe('a matrix names nothing that has stopped existing', () => {
  /*
   * P10.3, and the shape it had to take.
   *
   * The row asked every ✓ to name its handler. What actually goes wrong, and
   * what went wrong here, is the NAMES: both matrices reach into the code
   * constantly in backticks, and a deleted name turns a claim about today into
   * a claim about a version that no longer exists.
   *
   * A matrix is also allowed to talk about history — half of `INTERACTIONS.md`
   * is what Ashwake 1 had and this body lost — so a name may be DECLARED DEAD
   * instead of resolved. The `GONE:` block at the foot of each file is where,
   * and that block is the answer a reader wanted anyway: which of these names
   * can I still go and read?
   */
  const names = declaredNames();

  for (const file of ['MODES.md', 'INTERACTIONS.md']) {
    it(`${file} names only symbols that exist, or declares the exceptions`, () => {
      const md = read(file);
      // The whole footer section counts, not a marker inside it: it holds two
      // labelled lists (GONE, and the platform's) and a matrix may grow a
      // third kind of unresolvable name without this test having an opinion.
      const heading = '## Names in this file the code does not declare';
      const at = md.indexOf(heading);
      expect(at, `${file} has no "${heading}" section`).toBeGreaterThan(-1);
      const gone = md.slice(at);
      const missing = [
        ...new Set([...md.matchAll(/`([a-z][A-Za-z0-9]{3,})`/g)].map((m) => m[1] as string)),
      ].filter((name) => !names.has(name) && !gone.includes('`' + name + '`'));
      expect(
        missing,
        `${file} names these in backticks and nothing declares them — fix the sentence, ` +
          `or add them to the file's "names the code does not declare" section`,
      ).toEqual([]);
    });
  }
});
