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
  // Wait for the DOOR to leave rather than for a particular screen to arrive:
  // BEGIN can land on a live board or, with `?end=1`, straight on the end
  // screen, and a helper that insisted on the stat row would only ever be
  // testing one of the two.
  await door.waitFor({ state: 'detached' });
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
    // `force` because a card that is still animating in is "not stable", and
    // Playwright will retry the stability check until the card has been
    // replaced by the NEXT one and then fail on a detached element (seen
    // 2026-08-29, on the tilt-45 shot). A player taps a moving card and it
    // works; so does this.
    await scrim.locator('button').last().click({ force: true });
    // A short fixed wait, and no more than that. Waiting for the scrim to
    // DETACH sounds better and is a trap twice over: dismissing one card can
    // raise the next, so the locator still matches and the wait never
    // resolves; and `placeOneTile` calls this after every one of ~96 taps, so
    // even a bounded version turns a 30ms helper into a whole test timeout.
    // The dismissal is synchronous React state — one frame is enough.
    await page.waitForTimeout(30);
  }
  throw new Error('the teaching never stopped: twelve cards in a row');
}

/**
 * The board's own way into MORE: MENU, then the list's last row.
 *
 * One helper rather than two lines in six specs, because the walk changed
 * four times in one day — the board's corner went from a `?` straight into
 * the manual, to a MENU straight into MORE, to a MENU that opened a short
 * list with MORE on it, and then (2026-09-03) back to a MENU that opens MORE
 * directly again, once the short list and MORE turned out to be two lists of
 * the same rows. A route this many specs walk should be written down once.
 *
 * Addressed by `data-go`, never by which corner it is in: a selector that
 * names a POSITION is a selector that breaks every time the layout is an
 * opinion, and this one has been an opinion four times.
 */
export async function openMore(page: Page): Promise<void> {
  await page.locator('[data-go="quick"]').click();
  await page.locator('[data-panel="more"]').waitFor({ state: 'visible' });
}
