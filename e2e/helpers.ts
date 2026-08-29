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

/**
 * Walk in through the front door.
 *
 * Since Stage 3 the game opens on a door rather than on the board — which is
 * what a stranger sees, and therefore what every test has to walk through
 * before it can claim to be testing the game. A spec that reached the board
 * without pressing BEGIN would be testing a screen no player ever meets.
 */
export async function begin(page: Page): Promise<void> {
  const door = page.locator('[data-door="begin"]');
  await door.waitFor({ state: 'visible' });
  await door.click();
  await page.locator('[data-hud="stats"]').waitFor({ state: 'visible' });
  await clearCards(page);
}

/**
 * Read and dismiss whatever the game is teaching.
 *
 * The teaching cards are modal on purpose — a lesson you can tap past without
 * seeing is a lesson nobody reads — so a test that wants to touch the board
 * has to do what a player does. It loops because one dismissal can reveal the
 * next moment: placing a tile makes one ripe, and ripeness has its own card.
 */
export async function clearCards(page: Page): Promise<void> {
  for (let i = 0; i < 12; i++) {
    const scrim = page.locator('.card-scrim');
    if ((await scrim.count()) === 0) return;
    await scrim.locator('button').last().click();
    await page.waitForTimeout(30);
  }
  throw new Error('the teaching never stopped: twelve cards in a row');
}
