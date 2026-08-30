import { expect, test, type Page } from '@playwright/test';
import { begin, watchErrors } from './helpers';

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

test('every room off MORE opens and comes back', async ({ page }) => {
  const errors = watchErrors(page);
  // A device that has met every lesson: this is about the menus, not about
  // walking a card stack out of the way.
  await page.goto('/?taught=1');
  const before = await canvasId(page);

  await page.locator('[data-door="more"]').click();
  await panel(page, 'more').waitFor({ state: 'visible' });

  // A virgin device is offered the rooms that mean something on one: the
  // manual, its worlds, and settings. The shop and the hall of fame arrive
  // with a run to show in them.
  for (const room of ['manual', 'worlds', 'settings']) {
    await page.locator(`[data-go="${room}"]`).click();
    await panel(page, room).waitFor({ state: 'visible' });
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

  // The breakdown is folded, and opening it is the whole of the answer to
  // "why was the number what it was".
  await end.locator('summary').first().click();
  expect(await end.locator('.bars').count()).toBeGreaterThan(0);
  expect(await end.locator('.arc-chart').count()).toBe(1);

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

test('the board’s ♪ and the SETTINGS switch are one wire', async ({ page }) => {
  /*
   * `ui.sound`'s own note says, in both languages, "the ♪ button on the board
   * is this switch" — and there was no such button (found 2026-08-30). Sound
   * lived only in SETTINGS, three taps and a panel away, which is not where
   * anybody mutes a game in a quiet room. Ashwake 1 has carried the button
   * since 2026-08-20, on Marc's launch call: "a way to toggle on/off easily".
   *
   * The thing worth pinning is not that a button exists, it is that the two
   * surfaces are ONE FLAG. Two surfaces for one setting is how they come to
   * disagree about it, and a muted game that says it is unmuted is worse than
   * either state.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1&seed=7&place=12');
  await begin(page);

  const note = page.locator('[data-action="sound"]');
  await expect(note, 'the board has no ♪ button').toBeVisible();
  // Off by default: Marc chose a silent 1.0, and a phone game that surprises a
  // quiet room is uninstalled.
  await expect(note).toHaveAttribute('aria-pressed', 'false');

  await note.click();
  await expect(note).toHaveAttribute('aria-pressed', 'true');

  // SETTINGS agrees, because it is reading the same flag. From the BOARD,
  // which is the manual's MENU tab and the only way in while a run is live.
  await page.locator('.camera .help').click();
  await panel(page, 'manual').waitFor({ state: 'visible' });
  await panel(page, 'manual').locator('[data-go="settings"]').click();
  await panel(page, 'settings').waitFor({ state: 'visible' });
  const row = panel(page, 'settings').locator('[data-feature="ui.sound"]');
  await expect(row).toHaveAttribute('aria-pressed', 'true');

  // And flipping it there flips the board's button, on the way back out.
  await row.click();
  await expect(row).toHaveAttribute('aria-pressed', 'false');
  await panel(page, 'settings').locator('.panel-back').click();
  await panel(page, 'manual').locator('.panel-back').click();
  await expect(note).toHaveAttribute('aria-pressed', 'false');

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
