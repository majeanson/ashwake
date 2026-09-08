/**
 * How long a test may take before the suite calls it a hang.
 *
 * ## Why this is a file and not a line in `vitest.config.ts`
 *
 * It WAS a line there, from 2026-09-06 until 2026-09-08, and **it governed
 * nothing.** `vitest.config.ts` declares `projects: ['packages/*', 'apps/*']`,
 * and a project with a config file of its own does not inherit the root's
 * `test` block — both of ours have one. So the cap every test in this
 * repository actually ran under was vitest's own 5000ms default, for two days,
 * while the root config carried nine lines arguing for 30s.
 *
 * It was found the way the first one was: CI went red on a file that passes
 * here in under two seconds, and the message said `Test timed out in 5000ms`.
 * A number that is written down, argued for, and read by nothing is the same
 * class of miss this repository opens `CLAUDE.md` with — a value with no
 * consumer — and the fix is the same one: put it where it is read, once, and
 * have every reader import it rather than restate it.
 *
 * ## The number
 *
 * The default is 5000ms and it was sized for a desktop. This repository has
 * measured a GitHub runner at about eleven times a desktop (`sim.test.ts`),
 * and on 2026-09-06 four unchanged tests went red at once — `settle`, `store`,
 * `text` — none of them slow, all of them CLOSE: 390ms here is 4.3s there
 * against a 5s cap. **A cap a passing test clears by 14% is a cap that fails on
 * the runner's mood**, and a suite that does that is one nobody can read.
 *
 * 30s is six times the slowest of them at the measured ratio. It is not a claim
 * about speed and must never be read as one: it exists so a genuine HANG still
 * fails the suite rather than hanging it. The two sim gates keep their own,
 * larger number for the same reason.
 */
export const TEST_TIMEOUT_MS = 30_000;
