import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * THE BROWSER JOBS RUN IN PLAYWRIGHT'S OWN IMAGE (2026-09-30), and its tag is
 * a version.
 *
 * `.github/workflows/ci.yml` stopped installing browsers: two runs in a row
 * spent sixteen minutes of a twenty-five minute ceiling pulling Ubuntu
 * packages from a slow apt mirror. The image ships the browsers instead — for
 * ONE Playwright version. Bump `@playwright/test` without the tag and the
 * runner goes looking for browsers the image does not have, in a job that
 * gates nothing, so it could stay red for days. This is in `ci`, which does
 * gate, so the two cannot come apart.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const read = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8');

describe('the browser image', () => {
  it('is tagged with the Playwright version the lockfile installs', () => {
    const locked = /^ {2}'@playwright\/test@(\d+\.\d+\.\d+)':/m.exec(read('pnpm-lock.yaml'))?.[1];
    expect(locked, 'no @playwright/test in the lockfile').toBeDefined();
    const tags = [
      ...read('.github/workflows/ci.yml').matchAll(/mcr\.microsoft\.com\/playwright:v([\d.]+)-/g),
    ].map((m) => m[1]);
    expect(tags.length, 'no Playwright image in ci.yml').toBeGreaterThan(0);
    for (const tag of tags) expect(tag).toBe(locked);
  });
});
