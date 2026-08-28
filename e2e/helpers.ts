import type { Page } from '@playwright/test';

/** Every uncaught error and console.error the page reports, gathered so a
 *  test can assert there were none — the renderer-crash canary. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

/** A PNG that is neither tiny nor one flat colour — the cheapest honest
 *  statement that WebGL drew something. */
export function assertLooksLikeAPicture(bytes: Buffer, label: string): void {
  const seen = new Set<string>();
  for (let i = 0; i + 4 <= bytes.byteLength; i += 4) {
    seen.add(bytes.subarray(i, i + 4).toString('hex'));
  }
  if (bytes.byteLength <= 8000)
    throw new Error(`${label}: suspiciously small (${bytes.byteLength})`);
  if (seen.size <= 1000)
    throw new Error(`${label}: looks like a single flat colour (${seen.size})`);
}
