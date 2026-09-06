import { defineConfig } from 'vitest/config';

// One runner for the workspace. Each package's tests still live beside the code
// they pin; this file only says where to look and how the aliases resolve.
export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
    /*
     * A ceiling on the workers, because the default is one per core and this
     * workspace's two projects are not the same weight (2026-08-29).
     *
     * Sixteen forks, each importing jsdom and three's WebGL types, exhausted
     * the heap on a sixteen-core Windows machine — and the way it failed is the
     * dangerous part: the crashed worker's file simply vanished from the run
     * and vitest still printed a green "51 passed". A suite that loses a file
     * silently is worse than one that fails, so the fix is a limit rather than
     * a bigger heap. Both projects pass in about the same wall-clock at eight.
     */
    maxWorkers: 8,
    /*
     * The default is 5000ms and it was sized for a desktop (2026-09-06).
     *
     * CI went red on four tests at once — `settle`, `store`, `text` — none of
     * which had changed and all of which pass here in well under a second.
     * They were not slow, they were CLOSE: this repository has already
     * measured a GitHub runner at about eleven times a desktop
     * (`sim.test.ts`), and "never spells a mark into a sentence" takes 390ms
     * here, which is 4.3s there against a 5s cap. A cap that a passing test
     * clears by 14% is a cap that fails on the runner's mood, and a suite that
     * does that is one nobody can read — the exact lesson `sim.test.ts` was
     * given its own 240s for, two days earlier, and the same lesson this file
     * had not been told.
     *
     * 30s is six times the slowest of them at the measured ratio. It is not a
     * claim about speed and must never be read as one: it exists so a genuine
     * HANG still fails the suite rather than hanging it. The two sim gates
     * keep their own, larger number for the same reason.
     */
    testTimeout: 30_000,
  },
});
