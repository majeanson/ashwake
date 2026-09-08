import type { Page } from '@playwright/test';

/**
 * THE ONE THING PLAYWRIGHT'S WEBKIT SAYS THAT IS NOT ABOUT THE GAME
 * (2026-09-08, when the suite gained a second engine).
 *
 * `troika-three-text` — the board's label renderer — does two things this
 * build refuses. It starts its glyph worker from a `blob:` URL, and when that
 * is declined it falls back to fetching the TTF on the main thread. Both come
 * back as *"due to access control checks"*, on a SAME-ORIGIN request, which is
 * the tell: same-origin loads do not have an access-control story, so this is
 * the harness's WebKit and not a rule any browser enforces. Real Safari runs
 * blob workers, and `type.spec.ts` proves the DOM's own `@font-face` faces
 * load here perfectly well.
 *
 * The consequence in this build is that board LABELS do not draw — which is
 * why no spec that photographs the board runs on WebKit (see
 * `playwright.config.ts`), and why swallowing these lines costs nothing: the
 * tests that would have cared are not here.
 *
 * **This list is deliberately WebKit-only, and "access control checks" is the
 * one entry broad enough to want its argument written down.** This game makes
 * no cross-origin request of any kind — it has no backend, its fonts are
 * self-hosted, and every `fetch` in `apps/game/src` is a root-relative path —
 * so on any engine there is no legitimate access-control failure for this
 * filter to swallow. What it hides is one artifact with two faces: the same
 * refusal arrives as a `console.error` naming the blob, and as a `pageerror`
 * whose text is the bare URL and the reason.
 *
 * A blanket filter on "network error" would have hidden the renderer crash
 * this watcher exists to catch, which is why the rest are narrow. If a line
 * joins these, it is a new fact and wants reading before it is added.
 */
const WEBKIT_TROIKA_NOISE: readonly RegExp[] = [
  /due to access control checks\./,
  /Failure loading font .*\.ttf/,
  /worker module init function failed to rehydrate/,
  /NetworkError: Load failed/,
];

/**
 * Every uncaught error and console.error the page reports, gathered so a test
 * can assert there were none — the renderer-crash canary.
 *
 * The engine is read off the page rather than taken as an argument, so that
 * adding a second browser did not mean editing eighty call sites to thread a
 * fixture through — and so a spec cannot forget to pass it and quietly get the
 * wrong filter.
 */
export function watchErrors(page: Page): string[] {
  const engine = page.context().browser()?.browserType().name();
  const errors: string[] = [];
  const ignorable = (text: string): boolean =>
    engine === 'webkit' && WEBKIT_TROIKA_NOISE.some((re) => re.test(text));
  page.on('pageerror', (error) => {
    if (!ignorable(error.message)) errors.push(`pageerror: ${error.message}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && !ignorable(message.text())) {
      errors.push(`console.error: ${message.text()}`);
    }
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
  /*
   * AND WAIT FOR THE RENDERER, which is a new fact about this app (2026-09-08).
   *
   * `Board` is behind `lazy()` so the front door does not wait on three — see
   * its declaration in `App.tsx`. The chunk is asked for as soon as the shell
   * paints, and over localhost it lands in a few milliseconds, but "a few
   * milliseconds" is not "before the next line of this helper runs". Two
   * gesture tests found that immediately: they took a `boundingBox()` of a
   * canvas that did not exist yet, then dragged nothing.
   *
   * Here rather than in each spec, because it is true of every test that walks
   * through the door and then touches the board — and a timing assumption
   * patched per-test is one the next test written will not know about.
   *
   * `attached` rather than `visible`: an `?end=1` boot lands on the end screen
   * with the board host behind it, where the canvas is real, mounted, and
   * covered. Insisting on visible would hang on exactly the case the comment
   * above exists to allow.
   */
  await page.locator('canvas').waitFor({ state: 'attached' });
  /*
   * And then let the teaching SPEAK before clearing it.
   *
   * `clearCards` returns the instant no scrim is on screen, which is right for
   * the ninety-odd times `placeOneTile` calls it and wrong exactly once: here.
   * The board's own first card is raised on the quiet beat after the board
   * renders, so with a lazily-mounted renderer it now arrives a frame or two
   * AFTER this helper used to conclude there was nothing to clear — and the
   * card then sat over the board eating the first gesture of whatever test
   * followed. Two of them failed that way and neither failure named a card.
   *
   * One short settle, in `begin` and not in `clearCards`, because that is the
   * one call where a card is expected and the only one that can afford to
   * wait.
   */
  await page.waitForTimeout(160);
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
