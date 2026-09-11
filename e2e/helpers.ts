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
 * ## THAT LAST PARAGRAPH WAS WRONG, AND IT COST THE ITEM ITS SHAPE
 * (2026-09-10, `PASS.md` P6.1)
 *
 * **The labels draw.** Photographed on both engines at the same seed, side by
 * side: the numbers are on the tiles in WebKit exactly as they are in
 * Chromium. The refusal above is still real — these lines are still swallowed,
 * counted on a full run — but troika recovers from it, and "no labels" was an
 * inference from a console line rather than a look at the screen. It kept
 * seven specs off the engine the phone runs for two days.
 *
 * What the refusal actually costs is TIME: the first drawn frame after BEGIN
 * is 95 ms on Chromium and 2,597 ms on WebKit, which is why `boardDrawn` polls
 * for a picture instead of sleeping. Whether that gap is Playwright's software
 * WebKit or Safari itself is Session A's to answer on a real phone.
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

/** Is this PNG a picture? The predicate `assertLooksLikeAPicture` throws on. */
function looksLikeAPicture(bytes: Buffer): boolean {
  if (bytes.byteLength <= 8000) return false;
  const seen = new Set<string>();
  for (let i = 0; i + 4 <= bytes.byteLength; i += 4) {
    seen.add(bytes.subarray(i, i + 4).toString('hex'));
  }
  return seen.size > 1000;
}

/**
 * WAIT UNTIL THE BOARD HAS ACTUALLY DRAWN, and say how long it took
 * (`PASS.md` P6.1, 2026-09-10).
 *
 * Every spec that photographs the board used to sleep 800 ms and hope. On
 * Chromium that is generous: the first drawn frame lands **95 ms** after
 * BEGIN. On WebKit, measured the same way on the same machine, it is
 * **2,597 ms** — so eighteen shots photographed an empty board and failed on
 * "suspiciously small", which reads like a broken renderer and is a stopwatch.
 *
 * A fixed sleep is a claim about a machine, and this suite has two engines and
 * runs on three kinds of hardware. So: poll for the picture, and let the
 * timeout be the only number anybody has to argue about.
 *
 * The 27× gap is itself a finding rather than a harness detail to route
 * around: `PASS.md` P6.1 and P5 both carry it, and Session A on a real phone
 * is what settles whether it belongs to Playwright's software WebKit or to
 * Safari.
 */
export async function boardDrawn(page: Page, timeoutMs = 15_000): Promise<number> {
  const canvas = page.locator('canvas');
  await canvas.waitFor({ state: 'attached' });

  /**
   * ONE LOOK AT THE CANVAS: drawn, not yet, or not photographable at all.
   *
   * A CANVAS THAT CANNOT BE PHOTOGRAPHED IS A "NOT YET" (2026-09-11). The wait
   * above is for `attached`, which is deliberately weaker than visible — and
   * between the door leaving and the board host being laid out there is a
   * moment where the canvas is in the DOM with no box. Playwright refuses to
   * screenshot that, with *"Node is either not visible or not an
   * HTMLElement"*, and a THROW from inside a poll loop ends the poll: this
   * helper reported a hard failure on the first hiccup instead of waiting out
   * the fifteen seconds it was given. `a11y.spec.ts` hit it on CI's WebKit the
   * first evening the browsers ran as a job of their own.
   *
   * The contract is "wait until the board is a picture, up to `timeoutMs`", so
   * a frame that cannot be taken is exactly a frame that is not a picture yet.
   * `refused` keeps the two endings apart, because they are different bugs: a
   * board that drew nothing, and a board nothing could be drawn OF.
   */
  const look = async (): Promise<{ drawn: boolean; refused: string | null }> => {
    try {
      return { drawn: looksLikeAPicture(await canvas.screenshot()), refused: null };
    } catch (e) {
      const said = e instanceof Error ? e.message : String(e);
      return { drawn: false, refused: said.split('\n')[0] ?? said };
    }
  };

  const began = Date.now();
  for (;;) {
    const { drawn, refused } = await look();
    if (drawn) return Date.now() - began;
    if (Date.now() - began > timeoutMs) {
      throw new Error(
        refused === null
          ? `the board never drew a picture in ${timeoutMs}ms`
          : `the board could not be photographed in ${timeoutMs}ms: ${refused}`,
      );
    }
    await page.waitForTimeout(100);
  }
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

/** Tiles left in the purse, off the HUD — the cheapest witness that a
 *  placement was actually taken by the rules. */
export const tilesLeft = async (page: Page): Promise<number> =>
  Number(await page.locator('[data-stat="tiles"] .stat-value').textContent());

/**
 * Place one tile the way a PLAYER does — a tap on the board.
 *
 * Moved here from `board.spec.ts` on 2026-09-08, when `playtest.spec.ts`
 * became the second spec that needs it. The distinction it protects is the
 * reason it could not just be `?place=1`: the fixed opening walks the REDUCER
 * (`shell/walk.ts` dispatches straight at the session), so it never travels
 * the `act` seam a finger does — and `act` is where the receipts, the voice,
 * the buzz and Session C's sheet all hang. A test that wants to know what a
 * player's placement sets in motion has to tap.
 *
 * The board is not tappable the instant it appears: the camera eases into its
 * fit, and a ray cast while it is still travelling lands somewhere the board
 * has not arrived at yet. Measured 2026-08-29 — taps miss at 300ms and land at
 * 400ms — after `remembers a run across a reload` failed for months as the one
 * test that taps without waiting first. The wait belongs HERE, once, rather
 * than in each caller, because every caller needs it and only some of them
 * happened to have it.
 */
export async function placeOneTile(page: Page): Promise<void> {
  /*
   * WAIT FOR THE PICTURE, NOT FOR 600 ms (2026-09-11).
   *
   * This slept and then clicked, and it is the suite's last flake:
   * `board.spec.ts`'s leaned-and-turned placement failed roughly one full run
   * in four with *"no legal hex found in the search rings"* — ninety-six taps
   * that all missed. Reproduced deliberately with `--repeat-each=3`, which is
   * what made it a bug rather than a rumour.
   *
   * A tap on this board is a RAYCAST, and an `InstancedMesh` has nothing to
   * raycast against until its instance matrices are written — the same shape as
   * the bounding-sphere bug `board.spec.ts` records two tests down. Under load
   * (a hundred and thirty WebGL contexts in one process, or a repeat run) that
   * write lands later than 600 ms, and every ray sails past a board that is
   * genuinely there in the DOM and not yet in the scene.
   *
   * `boardDrawn` polls for a canvas that is a PICTURE, and on Chromium it is
   * both stricter and faster than the sleep it replaces — 95 ms against 600.
   *
   * **But it may never come, and that must not fail a placement.** Waiting for
   * it outright broke three WebKit tests with *"the board never drew a picture
   * in 15000 ms"*, which is P6.8 arriving from a new direction: on that engine
   * the scene is RAYCASTABLE while the capture is still blank, so a tap lands
   * on a board no screenshot can see. That is worth knowing — it rules out a
   * whole class of explanation for P6.8 — and it means this helper wants the
   * picture as a HINT and never as a gate.
   *
   * So: wait up to three seconds for it, shrug if it does not come, and search
   * twice. The second search is what actually retires the flake, because it
   * costs nothing when the first one works and it is the only thing that can
   * help when the board was simply not ready yet.
   */
  await boardDrawn(page, 3000).catch(() => undefined);
  const box = await page.locator('canvas').boundingBox();
  if (box === null) throw new Error('no canvas');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  for (const attempt of [1, 2]) {
    const before = await tilesLeft(page);
    for (const radius of [40, 60, 80, 30, 100, 20, 120, 140]) {
      for (let i = 0; i < 12; i++) {
        const angle = (Math.PI / 6) * i;
        await clearCards(page);
        await page.mouse.click(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        if ((await tilesLeft(page)) < before) {
          await clearCards(page);
          return;
        }
      }
    }
    // Ninety-six taps found nothing. Either the board is not ready or it is
    // genuinely full — the second is a real failure and the first is a wait.
    if (attempt === 1) await page.waitForTimeout(1000);
  }
  throw new Error('placeOneTile: no legal hex found in the search rings, twice over');
}
