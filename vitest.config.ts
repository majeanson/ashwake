import { defineConfig } from 'vitest/config';

// One runner for the workspace. Each package's tests still live beside the code
// they pin; this file only says where to look and how the aliases resolve.
export default defineConfig({
  test: {
    projects: ['packages/*', 'apps/*'],
  },
});
