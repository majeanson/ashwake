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
  },
});
