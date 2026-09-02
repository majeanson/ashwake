import { expect, test, type Page } from '@playwright/test';
import { begin, openMore, watchErrors } from './helpers';

/**
 * Everything that is not the run (Stage 4, 2026-08-29).
 *
 * The panels are unit-tested for their markup; what only a browser can prove is
 * that they are REACHABLE — that a player who taps MORE gets to their worlds,
 * their shop and their hall of fame, and gets back out of each one. Ashwake 1's
 * menus were each correct in isolation and still had a room you could enter
 * and not leave.
 *
 * And the rule that outranks all of it: **the board host never remounts**
 * (`CLAUDE.md`). Opening a panel, switching worlds and restoring a backup are
 * all state changes, so the canvas on screen at the start must be the same
 * element at the end — losing it loses the WebGL context, and iOS does not
 * always give one back.
 */

test.use({ viewport: { width: 390, height: 844 } });

const panel = (page: Page, id: string) => page.locator(`[data-panel="${id}"]`);

/** The identity of the live canvas, so a remount can be caught. R3F mounts it
 *  a tick after the shell, so the first read waits for it rather than reporting
 *  'none' and quietly passing against itself. */
async function canvasId(page: Page): Promise<string> {
  await page.locator('canvas').waitFor({ state: 'attached' });
  return page.evaluate(() => {
    const el = document.querySelector('canvas');
    if (el === null) return 'none';
    const marked = el as HTMLCanvasElement & { dataset: DOMStringMap };
    marked.dataset['seen'] ??= String(Math.random());
    return marked.dataset['seen'] ?? 'none';
  });
}

/**
 * Which panel is actually PAINTED on top — which is not always the one the
 * stack says is on top, and that gap is the bug this catches (2026-08-30).
 *
 * `waitFor({ state: 'visible' })` passes on a panel that is buried: every panel
 * is opaque and `position: fixed`, so a second one over it changes nothing that
 * Playwright's visibility check looks at. And `elementFromPoint` cannot see it
 * either — Chromium skips `inert` subtrees when hit-testing, so it cheerfully
 * reported the buried panel's neighbour. So this reads the stacking rule
 * itself: higher z-index wins, and a tie goes to whichever comes later in the
 * DOM.
 */
async function paintedOnTop(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    let best: { id: string | null; z: number } | null = null;
    document.querySelectorAll('[data-panel]').forEach((el) => {
      const z = Number(getComputedStyle(el).zIndex) || 0;
      // >= so that a later sibling wins the tie, which is what the painter does.
      if (best === null || z >= best.z) best = { id: el.getAttribute('data-panel'), z };
    });
    return best === null ? null : (best as { id: string | null }).id;
  });
}

test('every room off MORE opens and comes back', async ({ page }) => {
  const errors = watchErrors(page);
  // A device that has met every lesson: this is about the menus, not about
  // walking a card stack out of the way.
  await page.goto('/?taught=1');
  const before = await canvasId(page);

  await page.locator('[data-door="more"]').click();
  await panel(page, 'more').waitFor({ state: 'visible' });

  // A virgin device is offered the rooms that mean something on one: the
  // manual, its worlds, settings, and the device itself. The shop and the hall
  // of fame arrive with a run to show in them.
  //
  // THIS DEVICE joined the list on 2026-08-31, when it stopped being a section
  // at the bottom of MORE and became a room like the others (Marc: *"the whole
  // Cet appareil subsection is transformed into a new menu (similar to My
  // worlds)"*) — which is exactly the thing this loop checks: it opens, it is
  // the panel on top, and BACK comes home.
  for (const room of ['manual', 'worlds', 'settings', 'device']) {
    await page.locator(`[data-go="${room}"]`).click();
    await panel(page, room).waitFor({ state: 'visible' });
    /*
     * And it is the room the player can SEE.
     *
     * Panels are rendered from one fixed list in `App` and all shared a
     * z-index, so the painter's order was that list's order: MORE sits late in
     * it, and the manual and SETTINGS — the two rooms MORE's own menu opens —
     * arrived underneath it. The room was open, focused and taking every tap,
     * behind a MORE that was inert and fully opaque. Marc, 2026-08-30: *"the
     * more panel doesnt appear or is bugged when we navigate further"*. This
     * loop already walked all three and passed through the whole thing.
     */
    expect(await paintedOnTop(page), `${room} opened UNDER the panel that opened it`).toBe(room);
    await panel(page, room).locator('.panel-back').click();
    await panel(page, room).waitFor({ state: 'detached' });
    await panel(page, 'more').waitFor({ state: 'visible' });
  }

  await panel(page, 'more').locator('.panel-back').click();
  await panel(page, 'more').waitFor({ state: 'detached' });
  expect(await canvasId(page)).toBe(before);
  expect(errors).toEqual([]);
});

test('a finished run banks, and the end screen spends it', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?end=1&taught=1');
  await begin(page);

  const end = page.locator('[data-hud="end"]');
  await end.waitFor({ state: 'visible' });

  /*
   * WHICH RUN THIS WAS, and where it stands (2026-09-02).
   *
   * `settle` has computed both since the rules were lifted and returned
   * neither, so this screen never once said RUN 1 or NEW BEST. A first finish
   * on a clean device is a new best by definition and has no PREVIOUS best to
   * be short of, which is the case Ashwake 1 named: "0 short of best" under a
   * score is a line lying twice.
   */
  await expect(end.locator('[data-hud="which-run"]')).toBeVisible();
  await expect(end.locator('[data-hud="new-best"]')).toBeVisible();
  expect(await end.locator('[data-hud="short-of-best"]').count()).toBe(0);

  // The breakdown is folded, and opening it is the whole of the answer to
  // "why was the number what it was".
  await end.locator('summary').first().click();
  expect(await end.locator('.bars').count()).toBeGreaterThan(0);
  expect(await end.locator('.arc-chart').count()).toBe(1);

  /*
   * AND THE LEDGER ADDS UP.
   *
   * The bars can only ever speak for tiles that were POPPED, so before the
   * two end-of-run bonuses were printed they summed to a fraction of the score
   * with nothing on screen accounting for the difference. Read the rows back
   * and check the arithmetic against the score itself: a breakdown that does
   * not add up reads as a bug in the game rather than an incomplete breakdown.
   */
  const rows = end.locator('.payout-row');
  expect(await rows.count()).toBeGreaterThanOrEqual(4);
  const values = await rows.locator('dd').allInnerTexts();
  const total = Number(values.at(-1));
  const parts = values.slice(0, -1).reduce((n, v) => n + Number(v.replace('+', '')), 0);
  expect(parts, 'the payout rows must sum to the total they stand under').toBe(total);
  expect(total).toBe(Number(await end.locator('.end-score').innerText()));

  // The shop is on the end screen because that is where the relics were
  // earned. At least one upgrade row, whether or not it is affordable.
  expect(await end.locator('[data-buy]').count()).toBeGreaterThan(0);

  // And the run reached the hall of fame — the settle step, proved from the
  // outside rather than from its own unit test.
  await end.locator('[data-door="more"]').click();
  await panel(page, 'more').waitFor({ state: 'visible' });
  await page.locator('[data-go="fame"]').click();
  await panel(page, 'fame').waitFor({ state: 'visible' });
  expect(await panel(page, 'fame').locator('details').count()).toBeGreaterThan(0);

  expect(errors).toEqual([]);
});

test('a menu three deep is navigable, and a scene change empties the stack', async ({ page }) => {
  /*
   * Marc, 2026-08-30: *"make sure all menus and overlapped menus on top are all
   * navigable and backable and make sense (especially for More)."* Two faults,
   * and both are only reachable three panels deep, which is why neither had
   * been seen.
   *
   * **A door onto a panel already in the stack did nothing.** `push` returned
   * early if the id was open, so the manual → MENU → MORE → HOW TO PLAY path
   * left MORE on top and the button the player just pressed appeared dead. It
   * RAISES now: "open X" means "X is on top".
   *
   * **A scene change closed panels by NAME.** Four call sites ran
   * `worlds.hide(); more.hide()`, which is Ashwake 1's `resetShell()` — a
   * hand-maintained list that `ui/dialog.tsx`'s docblock says "had already
   * missed three". This one had missed four: stepping into another world from
   * three panels deep left the MANUAL open over the new world's board.
   */
  const errors = watchErrors(page);
  const openIds = (): Promise<(string | null)[]> =>
    page
      .locator('[data-panel]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-panel')));

  await page.goto('/?taught=1&runs=5&place=12');
  await begin(page);
  await page.waitForTimeout(500);

  /*
   * Three deep: MORE, the manual on it, and MORE asked for AGAIN.
   *
   * The board's one door is MENU since 2026-08-30 — it replaced a `?` that
   * opened the manual and a music note that muted, both of which MORE already
   * reaches. So the walk in is one step longer and the corner is two buttons
   * lighter, and the shape being tested is the same: a door onto a panel
   * already in the stack has to RAISE it, and BACK still leaves one at a time.
   */
  await openMore(page);
  await panel(page, 'more').locator('[data-go="manual"]').click();
  await panel(page, 'manual').waitFor({ state: 'visible' });
  await panel(page, 'manual').locator('[data-go="more"]').click();
  await panel(page, 'more').waitFor({ state: 'visible' });
  await panel(page, 'more').locator('[data-go="manual"]').click();

  /*
   * The manual is what the player SEES.
   *
   * This asked `elementFromPoint` and was answered 'manual' while the manual
   * was buried under MORE — Chromium skips `inert` subtrees when hit-testing,
   * so the one thing that made the bug invisible to a player was also the thing
   * that made it invisible to this test. It reads the stacking order now.
   */
  await expect
    .poll(() => paintedOnTop(page), {
      message: 'HOW TO PLAY did not raise the manual over MORE',
    })
    .toBe('manual');

  // And BACK still walks out one layer at a time.
  await panel(page, 'manual').locator('.panel-back').click();
  expect(await openIds(), 'BACK from a raised panel did not reveal the one under it').toEqual([
    'more',
  ]);

  // Now three deep again, and step into another WORLD from the bottom of it.
  await panel(page, 'more').locator('[data-go="worlds"]').click();
  await panel(page, 'worlds').waitFor({ state: 'visible' });
  await page.locator('[data-slot="2"]').click();
  await expect
    .poll(openIds, { message: 'a scene change left a panel standing over the new board' })
    .toEqual([]);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('the manual draws the game’s own pictures, and lines them all up', async ({ page }) => {
  /*
   * Marc, 2026-08-30: *"in how to play we reuse the same visuals as in game for
   * all"*, and *"make sure all indentation is good."*
   *
   * The manual drew a ground as a rounded SQUARE of the terrain's flat fill,
   * its figures as flat polygons, and its STASH figure as hand-rolled spans —
   * three second-hand copies of things the board and the hand already draw. A
   * legend whose alphabet is in a different hand from the board's is teaching a
   * second alphabet.
   *
   * The pin is IDENTITY, not resemblance: the file a legend swatch points at
   * must be the file the hand's own card points at. Anything weaker passes
   * while the two drift.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1&seed=7&place=12');
  await begin(page);
  await page.waitForTimeout(800);

  // What the HAND draws, which is the board's own baked art.
  const inHand = await page
    .locator('.hand .tile-art image')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(inHand.length, 'the hand draws no baked tile').toBeGreaterThan(0);

  await openMore(page);
  await panel(page, 'more').locator('[data-go="manual"]').click();
  await panel(page, 'manual').waitFor({ state: 'visible' });
  await page.locator('[data-tab="play"]').click();
  await page.waitForTimeout(800);

  // What the LEGEND draws. Same files, plus the two grounds the hand never
  // holds: a legend names STONE and WALL and the board draws both.
  const inLegend = await page
    .locator('.legend-swatch image')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(inLegend.length, 'the legend draws no baked ground').toBeGreaterThan(0);
  for (const src of inHand) {
    expect(inLegend, `the legend does not draw ${src}, which the hand does`).toContain(src);
  }
  expect(
    inLegend.some((h) => h?.includes('terrain.stone')),
    'no baked stone',
  ).toBe(true);
  expect(
    inLegend.some((h) => h?.includes('terrain.wall')),
    'no baked wall',
  ).toBe(true);

  // And a FIGURE fills its hexes with the same art rather than a flat colour.
  await page.locator('[data-tab="start"]').click();
  await page.waitForTimeout(800);
  const inFigure = await page
    .locator('figure svg image')
    .evaluateAll((els) => els.map((el) => el.getAttribute('href')));
  expect(inFigure.length, 'a figure draws no baked ground').toBeGreaterThan(0);
  for (const src of inFigure) {
    expect(src, 'a figure drew something that is not a terrain slot').toMatch(/terrain\./);
  }

  /*
   * INDENTATION. Every section on a tab starts at one left edge: the heading's
   * text, its prose, its figure and its caption. Half the lessons carry a mark
   * and half do not, so before this the marked ones were indented past their
   * own paragraphs and the markless ones sat at the margin.
   */
  const edges = await page.locator('[data-panel="manual"] section').evaluateAll((sections) =>
    sections.flatMap((section) => {
      const bits = section.querySelectorAll<HTMLElement>('h2 > span:last-child, p, figcaption');
      return [...bits].map((el) => Math.round(el.getBoundingClientRect().left));
    }),
  );
  expect(edges.length, 'the tab has no sections').toBeGreaterThan(3);
  expect(
    new Set(edges).size,
    `the manual is ragged: left edges ${[...new Set(edges)].join(', ')}`,
  ).toBe(1);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('every mark on every screen is drawn, not typed', async ({ page }) => {
  /*
   * `DECISIONS.md` D10 (2026-08-30). Marc: *"no emojis only phosphor icons or
   * assets."*
   *
   * The unit tests hold the CATALOGUES and the registries. What only a browser
   * can say is that no surface types a mark straight into its markup — which is
   * exactly how `♦` came to stand in for luck on two different screens, and how
   * a `▾` lived in a CSS `content` where no test could see it at all.
   *
   * So this reads the rendered text of every screen the game has and fails on
   * any character from the retired vocabulary. Text rather than markup, because
   * a character in an `aria-label` is a character a screen reader reads out.
   */
  const errors = watchErrors(page);
  // The retired vocabulary, plus the two lookalikes it was drawn with.
  const RETIRED = [...'▲◆■●✚★◈❖✦⬢◉✤▦▨❋✓◇←✕▾♪♦'];

  const clean = async (where: string, drawn = true): Promise<void> => {
    const text = await page.evaluate(() => {
      const bits: string[] = [];
      for (const el of document.querySelectorAll<HTMLElement>('body *')) {
        const label = el.getAttribute('aria-label');
        if (label !== null) bits.push(label);
      }
      return `${document.body.innerText}${bits.join(' ')}`;
    });
    for (const mark of RETIRED) {
      expect(text.includes(mark), `${where} types the mark ${mark}`).toBe(false);
    }
    // And where the screen HAS a vocabulary, it is drawing it. The front door
    // deliberately has none — it is a lockup, a tagline and one button.
    if (drawn) {
      expect(await page.locator('svg.icon').count(), `${where} draws no icon`).toBeGreaterThan(0);
    }
  };

  await page.goto('/?taught=1&runs=30&place=24');
  await clean('the front door', false);
  await begin(page);
  await page.waitForTimeout(500);
  await clean('the board');

  await page.locator('[data-action="purse"]').click();
  await clean('the purse');
  await page.locator('[data-action="purse"]').click();

  await page.locator('[data-go="quick"]').click();
  await clean("the board's own MENU list");
  await page.locator('[data-quick="more"]').click();
  await panel(page, 'more').waitFor({ state: 'visible' });
  await clean('MORE, off the board');
  await panel(page, 'more').locator('[data-go="manual"]').click();
  await panel(page, 'manual').waitFor({ state: 'visible' });
  for (const tab of ['start', 'play', 'hand']) {
    await page.locator(`[data-tab="${tab}"]`).click();
    await clean(`the manual's ${tab} tab`);
  }
  // Back down to MORE, which is what the board's MENU opened onto: the front
  // door's own MORE is a different screen and this one is standing on a board.
  await panel(page, 'manual').locator('.panel-back').click();
  await panel(page, 'more').waitFor({ state: 'visible' });
  for (const room of ['worlds', 'shop', 'fame', 'settings']) {
    // Scoped to MORE: the manual's MENU tab underneath offers SETTINGS too,
    // which is the whole point of them being one wire and is two matches here.
    await panel(page, 'more').locator(`[data-go="${room}"]`).click();
    await panel(page, room).waitFor({ state: 'visible' });
    await clean(room);
    await panel(page, room).locator('.panel-back').click();
  }

  expect(errors, errors.join('\n')).toEqual([]);
});

test('the board’s MENU is a short list, and SOUND on it is one wire', async ({ page }) => {
  /*
   * Marc, 2026-08-30, twice in one session. First: *"make sure sound on or off
   * and how to play stays in the menu, add a menu button instead."* The corner
   * lost its music note and its `?` and gained one door — and the honest cost
   * was mute going three taps deep, which Ashwake 1 never allowed: it has
   * carried a board-level toggle since 2026-08-20, on his own launch call, *"a
   * way to toggle on/off easily"*. Then, on that cost: *"menu could add a
   * submenu for quick actions like sound in off etc and then an option that
   * goes to menu."*
   *
   * So the corner is one button, and behind it a list of three. Four things
   * have to be true and each is a way it goes wrong:
   *
   *   - the list is REACHABLE, which the version of this that shipped inside
   *     the board host was not — the host goes `inert` the moment anything is
   *     on the stack, so every row drew and none of them could be tapped;
   *   - SOUND switches IN PLACE and the list stays open, because a menu that
   *     closes on a toggle is a menu you have to reopen to see whether the
   *     toggle took;
   *   - it is the SAME FLAG as the SETTINGS switch, because a muted game that
   *     says it is unmuted is worse than either state — the finding this test
   *     was originally written for;
   *   - and Escape closes it, because it is a door and the phone’s BACK button
   *     is the same gesture. A floating box in local state would walk BACK
   *     straight off the site.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1&seed=7&place=12');
  await begin(page);

  // ONE button, in the TOP corner, and the two it replaced are gone.
  await expect(page.locator('.board-menu .menu'), 'the board has no MENU button').toBeVisible();
  expect(await page.locator('.camera .help').count(), '? is still on the board').toBe(0);
  expect(
    await page.locator('[data-action="sound"]').count(),
    'the sound button is still on the board',
  ).toBe(0);
  // And the camera is alone in the bottom corner again.
  expect(
    await page.locator('.camera button').count(),
    'the camera corner grew a second control back',
  ).toBe(1);

  /*
   * The button is in the top half, and its list opens near it.
   *
   * Marc, 2026-08-30: *"menu move top right"* — the door out of the game left
   * the corner a thumb sweeps fifty times a run. The thing that would silently
   * regress is the LIST: it hung off the bottom of the screen while its button
   * was up here, which is a menu a screen away from what opened it, and only a
   * geometry check catches that. Everything else about it still passes.
   */
  const topHalf = (sel: string): Promise<number> =>
    page.locator(sel).evaluate((el) => el.getBoundingClientRect().top / window.innerHeight);
  expect(await topHalf('.board-menu'), 'MENU is not in the top half of the screen').toBeLessThan(
    0.5,
  );

  await page.locator('[data-go="quick"]').click();
  const sound = page.locator('[data-quick="sound"]');
  await expect(sound, 'MENU opened no list').toBeVisible();
  expect(
    await topHalf('.quick'),
    'the list opened at the bottom, a screen away from the button that opened it',
  ).toBeLessThan(0.5);

  // Off by default: Marc chose a silent 1.0, and a phone game that surprises a
  // quiet room is uninstalled.
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await sound.click();
  await expect(sound, 'the sound row did not switch').toHaveAttribute('aria-pressed', 'true');
  await expect(
    sound,
    'the list closed on a toggle, so nothing showed whether it took',
  ).toBeVisible();

  // SETTINGS agrees, because it is reading the same flag. Through the list’s
  // last row, which is the whole of "an option that goes to menu".
  await page.locator('[data-quick="more"]').click();
  await panel(page, 'more').waitFor({ state: 'visible' });
  expect(await paintedOnTop(page)).toBe('more');
  await panel(page, 'more').locator('[data-go="settings"]').click();
  await panel(page, 'settings').waitFor({ state: 'visible' });
  await expect(
    panel(page, 'settings').locator('[data-feature="ui.sound"]'),
    'the board and SETTINGS disagree about the sound',
  ).toHaveAttribute('aria-pressed', 'true');

  // And flipping it there flips the row, on the way back out. Three Escapes:
  // SETTINGS, MORE, and the list they were opened from.
  await panel(page, 'settings').locator('[data-feature="ui.sound"]').click();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await expect(sound, 'the list did not survive the rooms it opened').toBeVisible();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');

  // Escape closes the list itself, like any other door.
  await page.keyboard.press('Escape');
  await expect(page.locator('.quick')).toHaveCount(0);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('the phone’s BACK button closes the top panel, one at a time', async ({ page }) => {
  /*
   * The last gesture `INTERACTIONS.md` listed as missing (2026-08-30). On
   * Android, BACK with the manual open **left the site**: a player reading the
   * rules pressed the one button that means "go back" and lost the game.
   *
   * `DECISIONS.md` D9 rules out a router, and this is not one — the entries
   * carry no URL change, so a shared `?seed=` survives them. They are history
   * the way a native app uses it: one entry per open panel, and BACK pops one.
   *
   * The three things worth pinning are the three ways it goes wrong: it must
   * close ONE panel rather than all of them, it must not reload (the R3F host
   * cannot be remounted), and a panel closed from the UI must GIVE ITS ENTRY
   * BACK, or leaving the page takes one press per panel ever opened.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1&seed=7');
  const before = await canvasId(page);

  // Two deep: MORE, then WORLDS on top of it.
  await page.locator('[data-door="more"]').click();
  await panel(page, 'more').waitFor({ state: 'visible' });
  await page.locator('[data-go="worlds"]').click();
  await panel(page, 'worlds').waitFor({ state: 'visible' });

  // One press, one panel: the top goes and the one under it stays.
  await page.goBack();
  await panel(page, 'worlds').waitFor({ state: 'detached' });
  await expect(panel(page, 'more')).toBeVisible();

  // The second press empties the stack, and the game is still the game.
  await page.goBack();
  await panel(page, 'more').waitFor({ state: 'detached' });
  await expect(page.locator('[data-door="begin"]')).toBeVisible();
  expect(await canvasId(page), 'BACK reloaded the page').toBe(before);
  expect(
    await page.evaluate(() => (history.state as { ashwakePanels?: number } | null)?.ashwakePanels),
    'the stack kept an entry it no longer owns',
  ).toBeUndefined();

  /*
   * And a panel closed from the UI gives its entry back, so BACK is not owed
   * a press for a panel nobody has open any more. Measured through
   * `history.state`: after opening and closing, the top of the stack must be
   * an entry with no panel count on it.
   */
  await page.locator('[data-door="more"]').click();
  await panel(page, 'more').waitFor({ state: 'visible' });
  await panel(page, 'more').locator('.panel-back').click();
  await panel(page, 'more').waitFor({ state: 'detached' });
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => (history.state as { ashwakePanels?: number } | null)?.ashwakePanels),
    'closing a panel from the UI left its history entry behind',
  ).toBeUndefined();

  expect(errors, errors.join('\n')).toEqual([]);
});

test('MAIN MENU walks back out of a finished run, without a reload', async ({ page }) => {
  /*
   * The end screen's third door, and the only one that leaves the run
   * entirely. It had no coverage: NEW RUN, SHARE and MORE were all walked and
   * this one was not, on the screen where a player is most likely to press it.
   *
   * The canvas id is the witness, as it is for the world switcher: "one page,
   * many sessions" (`CLAUDE.md`) means a scene change is a state change and
   * the R3F host never remounts. Losing it loses the WebGL context.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1&end=1&runs=1');
  const before = await canvasId(page);
  await begin(page);
  await page.locator('[data-hud="end"]').waitFor({ state: 'visible' });

  await page.locator('[data-door="main"]').click();

  // Back at the front door, offering a beginning rather than a resume: MAIN
  // MENU ends the run it was standing on.
  await page.locator('[data-door="begin"]').waitFor({ state: 'visible' });
  await expect(page.locator('[data-hud="end"]')).toHaveCount(0);
  expect(await canvasId(page), 'MAIN MENU remounted the board host').toBe(before);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('switching worlds is a state change, never a reload', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  const before = await canvasId(page);

  await page.locator('[data-door="more"]').click();
  await page.locator('[data-go="worlds"]').click();
  await panel(page, 'worlds').waitFor({ state: 'visible' });

  await page.locator('[data-slot="2"]').click();
  await panel(page, 'worlds').waitFor({ state: 'detached' });

  // The board is live in world 2, and it is the SAME board host.
  await page.locator('[data-stat="tiles"]').waitFor({ state: 'visible' });
  expect(await canvasId(page)).toBe(before);
  expect(errors).toEqual([]);
});

test("today's board is one tap from the front door", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1');

  // The badge is the catalogue's sentence about today, not a bare word.
  const door = page.locator('[data-door="daily"]');
  await door.waitFor({ state: 'visible' });
  expect((await door.textContent())?.trim().length).toBeGreaterThan(3);

  await door.click();
  // Straight into a live board — the daily is a run, not a screen about one.
  await page.locator('[data-stat="tiles"]').waitFor({ state: 'visible' });

  // And leaving it puts the player back in the world they came from rather
  // than asking them to pick one.
  await page.locator('[data-hud="hand"]').waitFor({ state: 'visible' });
  expect(errors).toEqual([]);
});

test('the appearance picker shows each direction, and switching one repaints', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1');

  await page.locator('[data-door="settings"]').click();
  await panel(page, 'settings').waitFor({ state: 'visible' });

  // Every direction is SHOWN, not just named: a swatch each, drawn from that
  // theme's own tokens. AUTO is the one row without one — it has no look of
  // its own.
  const picks = page.locator('[data-theme-pick]');
  expect(await picks.count()).toBeGreaterThan(2);
  expect(await page.locator('[data-theme-pick] .swatch').count()).toBe((await picks.count()) - 1);

  // Two directions do not paint the same board.
  const groundOf = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.locator('[data-theme-pick="daylight"]').click();
  // Polled rather than read once: applying a direction is a React render and
  // then a paint, and a single read can land between the two.
  await expect.poll(groundOf).toBe('rgb(232, 220, 196)');
  const light = await groundOf();
  await page.locator('[data-theme-pick="torchlit"]').click();
  await expect.poll(groundOf).not.toBe(light);

  // And the choice is remembered, which is what makes it a setting.
  await expect(page.locator('[data-theme-pick="torchlit"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(errors).toEqual([]);
});

test('a run can be handed to somebody', async ({ page }) => {
  const errors = watchErrors(page);
  // No share sheet in headless Chromium, so this walks the clipboard path —
  // which is the desktop path anyway, and the one that can silently do
  // nothing.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/?end=1&taught=1&seed=7');
  await begin(page);

  const share = page.locator('[data-action="share"]');
  await share.waitFor({ state: 'visible' });
  await share.click();

  // Waited for, not read straight after the click (2026-09-02): sharing now
  // DRAWS a card first — fonts, the board's snapshot, a PNG encode — so the
  // clipboard write lands a beat after the tap. The button's own COPIED is the
  // honest signal that it has, and reading before it appears was a race that
  // came back with an empty clipboard.
  await expect(share).toHaveText(/COPIED|COPIÉ/);

  const said = await page.evaluate(() => navigator.clipboard.readText());
  // The sentence, and a link that carries the SEED rather than this session's
  // own query — a shared link must not drag `?end=1&taught=1` along.
  expect(said).toMatch(/Ashwake/);
  expect(said).toContain('seed=7');
  expect(said).not.toContain('taught');
  expect(said).not.toContain('end=1');
  expect(errors).toEqual([]);
});

test('?themes=1 puts every direction one tap from the board', async ({ page }) => {
  // The workbench. SETTINGS could always switch directions; the panel doing
  // the switching COVERS the board being judged, which made comparing five of
  // them five round trips through a menu. Here the board never leaves.
  const errors = watchErrors(page);
  await page.goto('/?themes=1&taught=1&place=12');
  // Through the door first: the strip lives over the BOARD, because a board is
  // what a direction is judged on. The front door has its own SETTINGS route
  // for the chrome half.
  await begin(page);

  const strip = page.locator('[data-hud="directions"]');
  await strip.waitFor({ state: 'visible' });

  // Every direction that ships, plus AUTO — and the board still showing.
  expect(await strip.locator('[data-theme-pick]').count()).toBeGreaterThanOrEqual(5);
  await expect(page.locator('canvas')).toBeVisible();
  await expect(page.locator('[data-theme-pick="settlement"]')).toBeVisible();

  const groundOf = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.locator('[data-theme-pick="daylight"]').click();
  await expect.poll(groundOf).toBe('rgb(232, 220, 196)');
  await page.locator('[data-theme-pick="settlement"]').click();
  await expect.poll(groundOf).toBe('rgb(20, 16, 12)');

  // Remembered, because the way this gets used is to leave the phone on one
  // direction and come back to it.
  await page.reload();
  await expect
    .poll(async () => page.locator('[data-theme-pick="settlement"]').getAttribute('aria-pressed'))
    .toBe('true');

  expect(errors).toEqual([]);
});

test('the manual shows the alphabet the rules are written in', async ({ page }) => {
  // Marc, 2026-08-29: "adding visuals and assets and symbols in the how to
  // play". The manual explained the rules and never showed the marks — a
  // player who met a glyph on a hex could only learn it by tapping that hex,
  // which needed them to have walked there first.
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  await page.locator('[data-door="how"]').click();
  await panel(page, 'manual').waitFor({ state: 'visible' });

  await page.locator('[data-tab="play"]').click();
  const legend = page.locator('.legend');
  await legend.waitFor({ state: 'visible' });

  // Four grounds, five destinations, and the other marks.
  expect(await legend.locator('.legend-mark').count()).toBeGreaterThanOrEqual(10);
  // The swatches are the DIRECTION's own fills, so the legend repaints with
  // the board rather than being a second copy of the palette.
  expect(await legend.locator('.legend-swatch').count()).toBeGreaterThanOrEqual(4);

  /*
   * And NOTHING in the manual is tappable (2026-08-29).
   *
   * The legend's destinations used to be buttons that opened the term card, on
   * the argument that the card is where the definition lives and a legend
   * repeating it would be a second copy. True of the sentence and wrong about
   * the screen. Marc: "make sure cache, site, shrine, etc. are not clickable
   * ... they should get the explanation directly readable."
   */
  const shrine = legend.locator('[data-term="shrine"]');
  await expect(shrine).toBeVisible();
  expect(
    await shrine.evaluate((el) => el.tagName.toLowerCase()),
    'a legend row is still a button',
  ).not.toBe('button');
  expect(
    await panel(page, 'manual').locator('button.term').count(),
    'the manual still linkifies its own prose',
  ).toBe(0);

  /*
   * The row IS the explanation (2026-08-30).
   *
   * Marc: "in how to play, we have the destinations enumerated, then later on
   * explanations, make sure all is one." The tab used to name the five places
   * here and then print a section for four of them below, so the same five
   * things were covered twice and neither pass was complete. The rule now
   * rides the row it belongs to, and the sections are gone: this asserts BOTH
   * halves, because either one alone is the old bug in the other direction.
   */
  await expect(shrine).toContainText(/permanent|pour de bon/i);
  expect(
    await panel(page, 'manual')
      .locator('h2')
      .filter({ hasText: /SHRINE|SANCTUAIRE/ })
      .count(),
    'a destination is explained twice on one tab again',
  ).toBe(0);

  // And a ground says what it DOES beside its name.
  expect(await legend.locator('.legend-note').count()).toBeGreaterThan(0);

  expect(errors).toEqual([]);
});

test('the worlds panel shows what this world has become', async ({ page }) => {
  // A world outlives every run played on it, and the only thing the game said
  // about one was a single line in the list. `knownFraction` and `unlockedBy`
  // were both written, tested, and called by nobody.
  const errors = watchErrors(page);
  await page.goto('/?end=1&taught=1&seed=7');
  await begin(page);
  // Bank a run, so the world has a history to show.
  await page.locator('[data-hud="end"]').waitFor({ state: 'visible' });

  await page.locator('[data-door="more"]').click();
  await page.locator('[data-go="worlds"]').click();
  await panel(page, 'worlds').waitFor({ state: 'visible' });

  const atlas = page.locator('.atlas');
  await atlas.waitFor({ state: 'visible' });
  // Seven facts: runs, best, farthest, known, territories, shrines, finds.
  expect(await atlas.locator('.fact-label').count()).toBe(7);
  // KNOWN is a percentage — the least misleading story about an infinite
  // plane, and the number that proves this is the world's own memory rather
  // than the run's.
  await expect(atlas).toContainText('%');

  expect(errors).toEqual([]);
});

/**
 * The door still opens on a small phone (2026-08-29).
 *
 * The front door grew a three-sentence story on the day the settlement became
 * the direction, and on a 375×667 phone that pushed it past the viewport: a
 * flex column centred with `justify-content: center` clips its own top and
 * cannot be scrolled back to it, so the mark sat at -24px with `scrollTop`
 * already at 0 and MORE hung below the fold with no way down. Auto margins on
 * the ends centre it while it fits and let it start at its own padding when it
 * does not.
 *
 * The smallest phone anybody still hands you, because that is where a screen
 * that only just fits stops fitting. It runs at its own viewport rather than
 * the suite's 390×844 and says why.
 */
test('the front door fits the smallest phone, and scrolls when it does not', async ({ page }) => {
  const errors = watchErrors(page);
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/?seed=7');
  await page.locator('[data-door="begin"]').waitFor({ state: 'visible' });

  const box = await page.evaluate(() => {
    const door = document.querySelector('.front-door');
    const first = door?.firstElementChild;
    if (!(door instanceof HTMLElement) || !(first instanceof HTMLElement)) return null;
    return {
      scrollTop: door.scrollTop,
      top: first.getBoundingClientRect().top,
      overflows: door.scrollHeight > door.clientHeight,
      scrollable: getComputedStyle(door).overflowY,
    };
  });

  // Nothing above the top edge while the door is scrolled to the top: that is
  // the whole failure, and it is invisible to a test that only asks whether a
  // control exists.
  expect(box?.scrollTop).toBe(0);
  expect(box?.top ?? -1).toBeGreaterThanOrEqual(0);
  // And when it does overflow, there has to be a way down.
  if (box?.overflows === true) expect(box.scrollable).toBe('auto');

  // Every way off the door is still reachable.
  await page.locator('[data-door="how"]').scrollIntoViewIfNeeded();
  await page.locator('[data-door="more"]').scrollIntoViewIfNeeded();
  await expect(page.locator('[data-door="more"]')).toBeVisible();

  expect(errors).toEqual([]);
});

test('the ending hands the screen back to the board it ended on', async ({ page }) => {
  /*
   * Marc, 2026-08-30: *"the ground you walked ‘picture’ is ugly, i dont want a
   * picture i want to actual screengame where we can move around."*
   *
   * It was a 240px PNG snapshot blown up to 26rem. The board it pictures never
   * went anywhere: the R3F canvas lives once above every scene and never
   * remounts, so at the moment a run ends the real board is still mounted,
   * still holding the cells it ended on, and still able to pan, pinch and FIT.
   * It was simply covered by an opaque page.
   *
   * Three things have to be true, and the third is the one a screenshot would
   * not catch: the ending steps aside, the board becomes REACHABLE again
   * (`inert` off, which is the same condition the keyboard reads), and the
   * canvas is the same element throughout — because a scene change that
   * remounts the host loses the WebGL context, which is the rule that outranks
   * everything else on this screen.
   */
  const errors = watchErrors(page);
  await page.goto('/?end=1&taught=1');
  await begin(page);
  const before = await canvasId(page);

  const end = page.locator('[data-hud="end"]');
  await end.waitFor({ state: 'visible' });
  // Covered means unreachable: a finished run left the board non-inert under
  // an opaque page, so a Tab walked the keyboard onto a board nobody could see.
  await expect(
    page.locator('.board-host'),
    'the board was reachable under the end screen',
  ).toHaveAttribute('inert', '');

  // No picture of the board on the ending — a door onto it.
  expect(await page.locator('.end-map img').count(), 'the ending still draws a snapshot').toBe(0);
  await page.locator('[data-action="walk-map"]').click();

  await expect(end, 'the ending did not step aside').toHaveCount(0);
  await expect(
    page.locator('.board-host'),
    'the board is still inert with the ending stood aside',
  ).not.toHaveAttribute('inert', '');
  // And the view button came with it: FIT is most of the reason to be here,
  // and the bar at the bottom sits exactly where the cluster is pinned.
  const view = page.locator('[data-action="camera"]');
  await expect(view, 'no view button while walking the ending').toBeVisible();
  await view.click();

  // Back to the numbers, and the score is still the score.
  await page.locator('[data-action="end-back"]').click();
  await end.waitFor({ state: 'visible' });
  await expect(page.locator('[data-action="end-back"]')).toHaveCount(0);

  // The whole of it was a state change: same canvas, start to finish.
  expect(await canvasId(page), 'walking the ending remounted the board').toBe(before);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('a scrolled panel keeps its head, top and bottom', async ({ page }) => {
  /*
   * Marc, with a photo of HOW TO PLAY scrolled halfway down (2026-09-01):
   * *"make sure we use all bottom space and that when scrolling the top space
   * is not overflowed."* In the photo a paragraph and a whole section heading
   * are drawn ABOVE the header, in the strip the notch reserves — the header
   * reads as having stopped covering.
   *
   * The cause was one property in the wrong place: `.panel` was the scroll
   * container AND carried `padding-top: env(safe-area-inset-top)`. A scroll
   * container clips at its PADDING box, so content scrolled up into that inset
   * is still painted, while a sticky child sticks from the CONTENT box — and
   * the gap between those two edges is exactly a notch tall, and exactly what
   * the photo shows. The bottom inset had the mirror problem: a dead band under
   * the scrollport that no line could ever be scrolled into.
   *
   * So the head is a fixed flex item now and `.panel-body` is the scrollport.
   * Both halves are geometry, which is why this is a browser test and not a
   * unit one: the assertion is that the scrollport begins where the head ends
   * and runs to the bottom of the screen, WHILE SCROLLED — the state the whole
   * fault only appears in.
   *
   * Chromium reports every safe-area inset as 0, so this cannot see the notch
   * itself. It can see the shape that made the notch dangerous, and that is the
   * part a phone cannot be asked about on every push.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1&seed=7&place=12');
  await begin(page);
  await openMore(page);
  await panel(page, 'more').locator('[data-go="manual"]').click();
  const manual = panel(page, 'manual');
  await manual.waitFor({ state: 'visible' });
  // The longest tab, so there is certainly something to scroll.
  await page.locator('[data-tab="play"]').click();
  await page.waitForTimeout(300);

  const body = manual.locator('.panel-body');
  const scrolled = await body.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
    return el.scrollTop;
  });
  expect(scrolled, 'the panel body did not scroll at all').toBeGreaterThan(0);

  // The PANEL itself never scrolls: two scrollports answering one flick is how
  // the head came loose from the top of the screen in the first place.
  expect(
    await manual.evaluate((el) => el.scrollTop),
    'the panel scrolled as well as its body',
  ).toBe(0);

  const head = await manual.locator('.panel-top').boundingBox();
  const view = await body.boundingBox();
  const size = page.viewportSize();
  if (head === null || view === null || size === null) throw new Error('no layout');

  // Nothing can be painted above the head, because nothing scrolls above it.
  expect(Math.round(view.y), 'the scrollport begins above the head that covers it').toBe(
    Math.round(head.y + head.height),
  );
  // And it runs to the bottom of the screen: every pixel below the head is
  // page, rather than a band reserved and never used.
  expect(
    Math.round(view.y + view.height),
    'the scrollport stops short of the bottom of the screen',
  ).toBe(size.height);

  expect(errors, errors.join('\n')).toEqual([]);
});
