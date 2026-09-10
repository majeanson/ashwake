import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALLOW, expired, ruledOn } from './allow';
import { order, type Finding } from './finding';
import { argumentSweep } from './arguments';
import { branchSweep } from './branches';
import { fieldSweep } from './fields';
import { alsoTestedCount, moduleSweep } from './modules';
import { optionalSweep } from './optional';
import { ROOT, workspace } from './program';

/**
 * `pnpm sweep` — the six rituals in `CLAUDE.md`, run by a program
 * (`PASS.md` P1, 2026-09-09).
 *
 * It writes `SWEEP.md` and prints a summary. It is **a report, not a gate**,
 * for the reason `playwright.audit.config.ts` gives about the screen audit and
 * for one more of its own: three of the six passes are heuristics, and a
 * heuristic that blocks a push is a heuristic somebody will disable. The bar
 * for making it CI-blocking is written in `PASS.md` P1 — one clean run with an
 * empty allowlist delta — so a later session does not have to invent one.
 *
 * **The header says what it walked**, which is the lesson the screen audit
 * paid for: its `afterAll` wrote `report.md` unconditionally, so a filtered
 * run silently replaced the committed table with an empty one. A report that
 * cannot say how complete it is will eventually pass off a partial run as the
 * record.
 */

const PASSES = [
  { name: 'module', run: moduleSweep },
  { name: 'field', run: fieldSweep },
  { name: 'branch', run: branchSweep },
  { name: 'optional', run: optionalSweep },
  { name: 'argument', run: argumentSweep },
] as const;

function today(): string {
  // The one clock in this file, and it is a report header rather than a rule.
  // `packages/core` may not read a date; a script may, and this is why the
  // sweep lives in `scripts/` and not beside the code it walks.
  return new Date().toISOString().slice(0, 10);
}

/**
 * One pass's findings, and **what each finding says to DO about itself**.
 *
 * `Finding.detail` was written eight times across the five passes — demote this,
 * say so at the declaration or cut it, a test import is load-bearing — and
 * printed nowhere: the table held `what` and dropped the prescription. Found by
 * the sweep's own field pass on 2026-09-10, which makes it the exact fault
 * `CLAUDE.md` describes: a sentence the core writes that no screen prints.
 *
 * A `detail` is shared by every finding of a kind, so printing it in each row
 * would repeat one sentence seventy times. It goes UNDER the table instead,
 * once per distinct sentence, with the kinds listed in the order they appear.
 */
function table(findings: readonly Finding[]): string {
  if (findings.length === 0) return '_Nothing._\n';
  const rows = findings.map((f) => `| ${f.grade} | \`${f.file}:${f.line}\` | ${f.what} |`);
  const out = ['| grade | where | what |', '| --- | --- | --- |', ...rows].join('\n') + '\n';

  const seen: string[] = [];
  for (const f of findings) {
    if (f.detail !== undefined && !seen.includes(f.detail)) seen.push(f.detail);
  }
  if (seen.length === 0) return out;
  return out + '\n' + seen.map((d) => '- ' + d).join('\n') + '\n';
}

function main(): void {
  const started = Date.now();
  const w = workspace();
  const all: Finding[] = [];
  for (const pass of PASSES) all.push(...pass.run(w));

  const ruled = all.filter((f) => ruledOn(f.id) !== undefined);
  const live = all.filter((f) => ruledOn(f.id) === undefined).sort(order);
  const stale = expired(today());
  /*
   * A RULING THAT MATCHES NOTHING is a ruling whose subject is gone — the
   * export was deleted, the field was wired, or a pass stopped being able to
   * see it. Left silent, the allowlist fills with exemptions for code that no
   * longer exists, which is the same rot it was built to stop: the next reader
   * cannot tell a live ruling from a fossil.
   *
   * It caught its own first case on the day it was written. Six rulings went
   * in and five matched, because the fallback in `keys.ts` had silenced one of
   * them, and nothing would have said so.
   */
  const seen = new Set(all.map((f) => f.id));
  const orphaned = ALLOW.filter((r) => !seen.has(r.id));

  /*
   * THE FILE IS A FUNCTION OF THE CODE, AND OF NOTHING ELSE (2026-09-10).
   *
   * It carried a `Generated on <date>` line and a `in 95.1s` duration until
   * the gate went in, and both had to go: `ci.yml` diffs this file the way it
   * diffs `sim.golden.txt`, so a byte that changes on every run is a gate that
   * fails on every run. Caught before the first push, by running the diff.
   *
   * Losing them costs nothing a reader had. A "generated on" date says when
   * somebody ran a tool, not when its answer was true — git knows the second,
   * which is the one worth having — and the duration was never anything but a
   * remark about the machine that happened to run it. Both still print to
   * stdout, where a person watching a 100-second command wants them.
   */
  const lines: string[] = [];
  lines.push('# SWEEP.md — what the rituals found, run by a program');
  lines.push('');
  lines.push('Written by `pnpm sweep`. **Do not edit by hand** — regenerate it.');
  lines.push('');
  lines.push(
    `Walked **${w.files.length} files** over ${PASSES.length} passes covering the six rituals ` +
      `in \`CLAUDE.md\` — the catalogue is the field pass taught to recurse, and \`fields.ts\` ` +
      `says why. **${live.length} findings**, ${ruled.length} absorbed by ` +
      `\`scripts/sweep/allow.ts\` (${ALLOW.length} rulings). A further ${alsoTestedCount()} ` +
      `exports are read in their own file AND by their own spec, which is not a finding — ` +
      `\`modules.ts\` carries the argument.`,
  );
  lines.push('');
  if (orphaned.length > 0) {
    lines.push('## Rulings that match nothing');
    lines.push('');
    lines.push('The subject is gone, or a pass stopped seeing it. Check, then cut.');
    lines.push('');
    for (const r of orphaned) lines.push('- `' + r.id + '` — ruled ' + r.on + '. ' + r.why);
    lines.push('');
  }
  if (stale.length > 0) {
    lines.push('## Rulings whose reason has run out');
    lines.push('');
    for (const r of stale) lines.push(`- \`${r.id}\` — until ${r.until ?? ''}. ${r.why}`);
    lines.push('');
  }
  /*
   * Grouped by the pass a finding SAYS it came from, not by the list of
   * functions above. `fieldSweep` reports the catalogue under `text`
   * (`fields.ts` says why), and a report keyed on the runner's own names
   * silently dropped every one of them — a section that does not exist is
   * indistinguishable from a section with nothing in it.
   */
  const groups = [...new Set([...PASSES.map((p) => p.name as string), ...live.map((f) => f.pass)])];
  for (const name of groups) {
    const mine = live.filter((f) => f.pass === name);
    lines.push(`## ${name} — ${mine.length}`);
    lines.push('');
    lines.push(table(mine));
  }

  writeFileSync(join(ROOT, 'SWEEP.md'), lines.join('\n'), 'utf8');
  // The date and the duration live here rather than in the file — see the note
  // above the header for why.
  console.log(
    `sweep: ${live.length} findings, ${ruled.length} ruled, ` +
      `${w.files.length} files in ${((Date.now() - started) / 1000).toFixed(1)}s ` +
      `on ${today()} — SWEEP.md written`,
  );

  /*
   * A GATE, AS OF 2026-09-10 — and the bar was set before it was cleared.
   *
   * `PASS.md` P1 wrote the condition down so a later session could not invent
   * a softer one: **one clean run with an empty allowlist delta.** That run
   * happened on the day P1.9 finished adjudicating the first report — 330
   * findings to 0, 91 rulings, nothing orphaned — so this is the promise being
   * kept rather than a new rule.
   *
   * Three things fail it, and the second is the one worth explaining:
   *
   *   - **A finding.** Fix it, rule it in `allow.ts` with a date and an
   *     argument, or write it into the ledger that owns it. All three are in
   *     the record; none of them is editing this number.
   *   - **A ruling that matches nothing.** The subject is gone, or a PASS has
   *     quietly stopped seeing it. That section earned its place inside a day:
   *     it is what caught the demotion batch blinding three of the five
   *     passes, and a sweep that cannot notice its own blindness is worse than
   *     no sweep, because it reports zero either way.
   *   - **A ruling whose `until` has passed.** A temporary exemption that
   *     outlives its reason is how dead code becomes permanent.
   *
   * There is no `--check` flag and there should not be: the run is the same
   * run, and this script deliberately does not decide whether the committed
   * `SWEEP.md` is current. `ci.yml` diffs the file after running, exactly as it
   * does for `sim.golden.txt`, so a report nobody regenerated fails too — and
   * for the same reason: the file in the repository is the artefact a reader
   * trusts, and a tool that grades its own output is not a check.
   */
  const bad = live.length + orphaned.length + stale.length;
  if (bad > 0) {
    console.error(
      `sweep: FAILED — ${String(live.length)} findings, ` +
        `${String(orphaned.length)} rulings matching nothing, ` +
        `${String(stale.length)} rulings past their date. ` +
        `Fix, rule in scripts/sweep/allow.ts, or move to the ledger that owns it.`,
    );
    process.exitCode = 1;
  }
}

main();
