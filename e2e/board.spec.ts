import { expect, test, type Page } from '@playwright/test';
import { assertLooksLikeAPicture, begin, clearCards, watchErrors } from './helpers';

/**
 * The real-browser smoke (Stage 2, 2026-08-28): nothing in the unit suite
 * renders a frame — there is no WebGL in vitest — so the whole class of
 * renderer crashes is invisible until a browser draws. This boots the
 * PRODUCTION build in headless Chromium, with WebGL actually rendering, walks
 * the first minute, and fails on any uncaught error.
 *
 * Portrait phone viewport, because that is the only screen that matters.
 */

test.use({ viewport: { width: 390, height: 844 } });

const tiles = async (page: Page): Promise<number> =>
  Number(await page.locator('[data-stat="tiles"] .stat-value').textContent());

/** Tap around the centre in widening rings until a placement lands. The
 *  opening board is one tile at the origin with six legal neighbours around
 *  it, so a ring at the hex pitch finds one. */
async function placeOneTile(page: Page): Promise<void> {
  // The board is not tappable the instant it appears: the camera eases into
  // its fit, and a ray cast while it is still travelling lands somewhere the
  // board has not arrived at yet. Measured 2026-08-29 — taps miss at 300ms and
  // land at 400ms — after `remembers a run across a reload` failed for months
  // as the one test that taps without waiting first. The wait belongs HERE,
  // once, rather than in each caller, because every caller of this needs it
  // and only some of them happened to have it.
  await page.waitForTimeout(600);
  const box = await page.locator('canvas').boundingBox();
  if (box === null) throw new Error('no canvas');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const before = await tiles(page);
  for (const radius of [40, 60, 80, 30, 100, 20, 120, 140]) {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI / 6) * i;
      await clearCards(page);
      await page.mouse.click(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      if ((await tiles(page)) < before) {
        await clearCards(page);
        return;
      }
    }
  }
  throw new Error('placeOneTile: no legal hex found in the search rings');
}

test('boots, draws a board with WebGL, and takes a placement', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7');
  await expect(page.locator('canvas')).toBeVisible();
  await begin(page);
  await expect(page.locator('[data-stat="tiles"] .stat-value')).not.toHaveText('');
  // Let the first frame and the font land.
  await page.waitForTimeout(600);

  const shot = await page.locator('canvas').screenshot();
  assertLooksLikeAPicture(shot, 'the opening board');

  const before = await tiles(page);
  await placeOneTile(page);
  expect(await tiles(page)).toBeLessThan(before);

  // The camera: lean in on the last tile and back out to the fit, with the
  // board still live. One toggle, because a phone already has a pinch.
  const camera = page.locator('[data-action="camera"]');
  await camera.click();
  await page.waitForTimeout(400);
  await camera.click();
  await page.waitForTimeout(400);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('speaks French to a French phone, English to an English one', async ({ browser }) => {
  // Both the FIRST word a player reads and a word from inside the run, because
  // the door and the HUD reach the catalogue by different paths and either
  // could be the one that regressed.
  for (const [locale, door, stat] of [
    ['fr-CA', 'COMMENCER', 'TUILES'],
    ['en-US', 'BEGIN', 'TILES'],
  ] as const) {
    const context = await browser.newContext({ locale, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/?seed=7');
    await expect(page.locator('[data-door="begin"]')).toHaveText(door);
    await begin(page);
    await expect(page.locator('[data-stat="tiles"]')).toContainText(stat);
    await context.close();
  }
});

test('takes a placement with the board leaned and turned', async ({ page }) => {
  // The tap is a raycast now, not a hex-from-pixel inversion, so the angle is
  // exactly the thing that could quietly break it: at 45 degrees, turned 45
  // more, with the ground standing at different heights, a finger has to
  // still land on the hex under it.
  const errors = watchErrors(page);
  await page.goto('/?seed=7&place=12&tilt=45&yaw=45&relief=0.35');
  await expect(page.locator('canvas')).toBeVisible();
  await begin(page);
  await page.waitForTimeout(600);
  const before = await tiles(page);
  await placeOneTile(page);
  expect(await tiles(page)).toBeLessThan(before);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('keeps taking taps on the frontier as the board grows', async ({ page }) => {
  // Marc, on a phone, 2026-08-29: "most of the clicks in the upper tiles don't
  // work." `InstancedMesh` measures its bounding sphere on the FIRST ray it is
  // ever given and caches it forever, and its raycast tests that sphere before
  // any instance — so every cell the board grew after the first tap fell
  // outside it and went quiet. A growing board is the whole game, so this walks
  // one outward and insists every placement still lands.
  const errors = watchErrors(page);
  await page.goto('/?seed=7&tilt=35');
  await expect(page.locator('canvas')).toBeVisible();
  await begin(page);
  await page.waitForTimeout(600);

  for (let i = 0; i < 8; i++) {
    const before = await tiles(page);
    await placeOneTile(page);
    expect(await tiles(page), `placement ${i + 1} never landed`).toBeLessThan(before);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('finishes a run and starts another', async ({ page }) => {
  // This is the shape of v2.0's gate. `DECISIONS.md` D1 turns on a stranger
  // finishing a run and CHOOSING to start another, and a loop that cannot be
  // completed by a script certainly cannot be completed by a person.
  const errors = watchErrors(page);
  await page.goto('/?seed=7&end=1');
  await begin(page);
  await clearCards(page);

  const end = page.locator('[data-hud="end"]');
  await expect(end).toBeVisible();
  // The run said something about itself rather than only printing a number:
  // a score, and an epitaph with words in it.
  await expect(end).toContainText(/[0-9]/);
  await expect(end.locator('.end-epitaph')).not.toBeEmpty();

  await page.locator('[data-action="new-run"]').click();
  await clearCards(page);

  // Back on a live board, with the run reset rather than the end screen hidden.
  await expect(page.locator('[data-hud="stats"]')).toBeVisible();
  await expect(end).toHaveCount(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('remembers a run across a reload', async ({ page }) => {
  // Stage 4's whole point. Nothing survived a reload before this, which meant
  // a phone that locked mid-run lost the run — and a game that punishes you
  // for answering the phone is a game you stop opening.
  const errors = watchErrors(page);
  await page.goto('/?seed=7');
  await begin(page);
  await clearCards(page);

  const before = await tiles(page);
  await placeOneTile(page);
  const after = await tiles(page);
  expect(after).toBeLessThan(before);

  // A real reload, not a re-render: the keeper has to have reached the disk.
  await page.reload();
  await expect(page.locator('[data-door="begin"]')).toHaveText(/RESUME|REPRENDRE/);
  await begin(page);
  await clearCards(page);

  expect(await tiles(page)).toBe(after);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('forgets a finished run, so BEGIN means begin', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7&end=1');
  await begin(page);
  await clearCards(page);
  await expect(page.locator('[data-hud="end"]')).toBeVisible();

  await page.reload();
  // A finished run is not a resumable one: the door offers a beginning.
  await expect(page.locator('[data-door="begin"]')).toHaveText(/BEGIN|COMMENCER/);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('stashes a card and takes it back', async ({ page }) => {
  // The stash shipped INERT: the empty slot was a `disabled` button and the
  // held card had no tap, so a mechanic every run has from its first hand
  // could not be used at all. This walks the whole gesture in a browser,
  // because that is the only place a disabled button proves anything.
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1');
  await begin(page);

  const slot = page.locator('[data-hold="0"]');
  await expect(slot).toBeVisible();
  await expect(slot).toBeEnabled();

  const hand = page.locator('[data-hud="hand"]');
  const dealt = await hand.locator('[data-colour]').count();

  // A hand opens with its first card already selected, so there is nothing to
  // pick up — tapping it would PUT IT DOWN (see "a second tap on the selected
  // card puts it down"). Straight to the slot: put the held card away, and it
  // stops saying HOLD and starts being a tile.
  await expect(hand.locator('[data-colour]').first()).toHaveAttribute('aria-pressed', 'true');
  await slot.click();
  await expect(slot).toHaveAttribute('data-colour', /green|yellow|red|blue/);

  // The hand is one card lighter, and its shape has not reflowed — the
  // spacer holds the column until the next placement deals one back.
  expect(await hand.locator('[data-colour]').count()).toBe(dealt);

  // And it trades back: with a card selected again, tapping the full slot
  // returns that tile to the hand and puts the selected one in its place.
  const stashed = await slot.getAttribute('data-colour');
  const card = hand.locator('[data-colour]').first();
  if ((await card.getAttribute('aria-pressed')) !== 'true') await card.click();
  await slot.click();
  await expect(slot).not.toHaveAttribute('data-colour', stashed ?? '');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('every tap on the board answers, even the ones that cannot build', async ({ page }) => {
  /*
   * A tap that cannot build used to be a silent no-op — the engine returned
   * the same state and the screen said nothing, which is the worst answer a
   * game can give a deliberate action. Ashwake 1 replaced every one of those
   * silences with a sentence and this body shipped without any of them:
   * `pocketNote`, `describeHexOf` and `rememberedNativeAt` had no caller.
   *
   * This walks the three answers a browser can reach without a saved world.
   */
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1&place=20');
  await begin(page);
  await page.waitForTimeout(600);

  const toast = page.locator('.toast');
  const box = await page.locator('canvas').boundingBox();
  if (box === null) throw new Error('no canvas');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  // Tap around until something says something. Every hex on a grown board is
  // one of: ripe (a pocket's worth), legal (a placement), or a thing that
  // describes itself — and all three now speak.
  const said = new Set<string>();
  for (const r of [0, 30, 55, 80, 110, 140, 170]) {
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      await page.mouse.click(cx + r * Math.cos(a), cy + r * Math.sin(a));
      const text = (await toast.textContent())?.trim() ?? '';
      if (text !== '') said.add(text);
    }
  }

  // At least two DIFFERENT sentences: a board of one answer is a board that
  // is not actually describing anything.
  expect(said.size, [...said].join(' | ')).toBeGreaterThanOrEqual(2);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('an empty hand says so rather than doing nothing', async ({ page }) => {
  const errors = watchErrors(page);
  // `?end=1` runs a whole run out; a finished run has no cards left to place,
  // which is the state the empty-hand answer exists for.
  await page.goto('/?seed=7&taught=1&end=1');
  await begin(page);
  await expect(page.locator('[data-hud="end"]')).toBeVisible();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('a second tap on the selected card puts it down', async ({ page }) => {
  // Marc's own rule, and `selectDraft` has carried it since the rules were
  // lifted: "we can always unselect a selected tile by tapping it again — the
  // UI sends -1 on that second tap". The UI never sent it, so the gesture was
  // a silent no-op and the legal hexes kept glowing with a card still held.
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1&place=8');
  await begin(page);
  await page.waitForTimeout(600);

  // A hand opens with its first card already in it — `state.selected` starts
  // at 0 — so the first tap on that card is the PUT DOWN, not the pick up.
  const first = page.locator('[data-hud="hand"] [data-colour]').first();
  await expect(first).toHaveAttribute('aria-pressed', 'true');

  // Put it down, and be told what it does on the way: this is the one moment
  // a player is looking at the card rather than at the board.
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'false');
  expect(((await page.locator('.toast').textContent()) ?? '').trim().length).toBeGreaterThan(0);

  // And pick it back up.
  await first.click();
  await expect(first).toHaveAttribute('aria-pressed', 'true');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('the reward loop speaks: a pop pays out in words', async ({ page }) => {
  /*
   * Claims, pops and spends all ran SILENT in this body until 2026-08-29 —
   * `harvestNote` and the whole of `view/receipts.ts` had no caller, so the
   * tiles arrived, the ground turned native and the screen said nothing.
   *
   * Ashwake 1's reason for every one of these, verbatim: "a reroll that
   * silently replaces three cards looks identical to a bug".
   */
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1&place=24');
  await begin(page);
  await page.waitForTimeout(600);

  const pop = page.getByRole('button', { name: /POP/ }).first();
  await expect(pop).toBeVisible();
  await pop.click();

  /*
   * A pop pays out into a CARD, and the card waits for the cascade
   * (2026-08-29, Marc: "make sure all pop as card, no text above tiles for
   * explanations ... and points").
   *
   * It used to be a toast — a line in the strip between the board and the
   * hand, arriving at the exact moment the eye is on the board watching the
   * tiles thrown off it, and gone by the time it looks down. The accounting a
   * harvest owes is worth reading, and worth reading after the thing it
   * accounts for, so the card is raised once the leap has finished.
   */
  const card = page.locator('.card-scrim .card');
  await expect(card, 'a pop did not raise its card').toBeVisible({ timeout: 4000 });
  const spoke = (await card.textContent()) ?? '';
  expect(spoke.trim().length, 'a pop said nothing at all').toBeGreaterThan(10);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('lifting one finger of a pinch does not throw the board away', async ({ page }) => {
  /*
   * Marc, on a phone, 2026-08-29: "when zooming in and out with pinch, the map
   * flies away at the end so we can't see anything anymore."
   *
   * Two defects, and the first is the flying map. `last` held where the FIRST
   * finger was, so when one finger of a pinch lifted, the survivor's next move
   * measured its delta from the OTHER finger's position — the gap between two
   * fingers, applied as a pan, in one frame. The second: a pinch never marked
   * the gesture as moved and never cleared the velocity samples, so the lift
   * could launch a glide built from a pan that happened before the pinch even
   * started.
   *
   * Driven with raw CDP touch events, because `page.mouse` cannot express two
   * pointers and this bug only exists with two.
   */
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1&place=16');
  await begin(page);
  await page.waitForTimeout(600);

  const box = await page.locator('canvas').boundingBox();
  if (box === null) throw new Error('no canvas');
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);

  const cdp = await page.context().newCDPSession(page);
  const touch = (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    points: readonly { x: number; y: number }[],
  ) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: points.map((p) => ({ x: p.x, y: p.y })),
    });

  const board = () => page.locator('canvas').screenshot();
  const before = await board();

  // Pinch out, then lift ONE finger and move the other a little — the exact
  // sequence that used to hurl the board off screen.
  await touch('touchStart', [
    { x: cx - 40, y: cy },
    { x: cx + 40, y: cy },
  ]);
  await touch('touchMove', [
    { x: cx - 90, y: cy },
    { x: cx + 90, y: cy },
  ]);
  await touch('touchEnd', [{ x: cx + 90, y: cy }]);
  await touch('touchMove', [{ x: cx + 95, y: cy }]);
  await touch('touchEnd', []);
  await page.waitForTimeout(700);

  const after = await board();
  // Still a picture of a board, not of empty space: the whole failure was the
  // map leaving the screen entirely.
  assertLooksLikeAPicture(after, 'the board after a pinch');
  // And the pinch DID something — a test that passes because nothing happened
  // would be no test at all.
  expect(Buffer.compare(before, after)).not.toBe(0);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('the first pop of a device holds the screen', async ({ page }) => {
  // Marc's call, 2026-08-29. The first pop teaches the one rule that reshapes
  // the board — a popped pocket turns to STONE, which surrounds but never
  // matches — and a toast is too quiet for that.
  //
  // Every pop AFTER it is the same card gone brief (2026-08-30): same words,
  // no focus taken, any tap sends it away. The test below is the other half of
  // this one, and the pair is the whole rule.
  const errors = watchErrors(page);
  // A virgin device, and an opening the scripted walk has NOT already
  // harvested — `walk` pops when it cannot place, so a long opening spends
  // the very first pop before the player ever taps.
  await page.goto('/?seed=7&place=12');
  await begin(page);
  await page.waitForTimeout(600);
  await clearCards(page);

  const pop = page.getByRole('button', { name: /POP/ }).first();
  await expect(pop).toBeVisible();
  await pop.click();

  // Exactly one card: a receipt outranks a lesson, so the pop's card is the
  // only thing holding the screen.
  const card = page.locator('.card-scrim .card');
  await expect(card).toHaveCount(1);
  // The stone rule, in the card that just held the screen.
  await expect(card).toContainText(/STONE|PIERRE/);
  // And it HOLDS it: a first pop is the one card here that must be dismissed
  // on purpose, so it is not the brief kind.
  await expect(page.locator('.card-scrim')).not.toHaveClass(/brief/);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a pop after the first is brief, and any tap sends it away', async ({ page }) => {
  /*
   * Marc, 2026-08-30: *"after the first pop, we don't need to have the pop
   * card appear, we can keep it briefly but easy to tap out."*
   *
   * A pop's accounting is worth a card the first time and worth a glance every
   * time after, and the modal was charging the full price on both — a dialog, a
   * focus move and a deliberate press, several times a minute. A device with a
   * harvest already banked (`?runs=1`) is exactly the state where the first-pop
   * card has been spent, so this is the ordinary case and not an edge one.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1&runs=1&place=24');
  await begin(page);
  await page.waitForTimeout(600);
  await clearCards(page);

  const pop = page.getByRole('button', { name: /POP|RÉCOLT/ }).first();
  await expect(pop).toBeVisible();
  await pop.click();

  const scrim = page.locator('.card-scrim');
  await expect(scrim, 'a pop said nothing').toBeVisible({ timeout: 4000 });
  await expect(scrim, 'a routine pop still held the screen').toHaveClass(/brief/);
  // It still SAYS the thing: brief is about the claim on the player, not about
  // dropping the accounting a harvest owes.
  expect(((await scrim.textContent()) ?? '').trim().length).toBeGreaterThan(10);

  /*
   * A press anywhere sends it away, and the press still LANDS.
   *
   * The obvious build puts the dismiss on the scrim, which means the scrim
   * catches pointers, which means the first tap after every pop is eaten — a
   * player popping steadily loses a placement's worth of tapping to a card
   * they were not reading. The board is tapped here on purpose: it is under
   * the scrim, and it has to still be reachable.
   */
  expect(
    await scrim.evaluate((el) => getComputedStyle(el).pointerEvents),
    'the brief scrim is a wall, so it eats the next tap',
  ).toBe('none');
  await page.mouse.click(120, 300);
  await expect(scrim).toHaveCount(0);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a card in the hand is the tile it will become', async ({ page }) => {
  /*
   * Marc, 2026-08-30: *"I also liked the tile card we had having the tile
   * itself."* Ashwake 1's hand cards carried the baked hex — the very PNG the
   * board composites into the ground it draws — so what you hold and what it
   * becomes are one picture. This body drew a rounded rectangle in the terrain
   * fill instead.
   *
   * The art is allowed not to exist (a direction with nothing baked is a
   * supported state), so this asserts the WIRING: the manifest is asked, the
   * slot resolves, and the card points at the same file the board would.
   */
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1&place=12');
  await begin(page);
  await page.waitForTimeout(600);

  const art = page.locator('.hand .tile.has-art .tile-art').first();
  await expect(art, 'no hand card carries its baked hex').toBeVisible({ timeout: 4000 });
  const src = await art.getAttribute('src');
  expect(src, 'the card points at something other than a terrain slot').toMatch(
    /\/assets\/[a-z-]+\/terrain\.(green|yellow|red|blue)\.png$/,
  );
  // It loaded: a broken <img> is a card that reads as empty, which is the
  // failure Ashwake 1 caught in a screenshot rather than in a test.
  expect(
    await art.evaluate((el) => (el as HTMLImageElement).naturalWidth),
    'the baked hex did not load',
  ).toBeGreaterThan(0);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('every view button brings the board back, not just FIT', async ({ page }) => {
  /*
   * Marc, 2026-08-30: *"when pressing FLAT, FIT, etc. make sure we recenter the
   * map not too zoomed out."*
   *
   * Two separate bugs behind one sentence. FIT flew to zoom 1, which is by
   * definition whatever it takes to show every hex, so on a grown board the
   * button that hands the board back was the button that made it unreadable —
   * that half is arithmetic and `camera.test.ts` holds it. FLAT and DEFAULT
   * only set an ANGLE, and changing the angle changes where every hex lands on
   * screen, so a camera left exactly where it was was looking at a place that
   * had moved. Neither had any way to ask for a re-frame.
   *
   * Measured by how much PICTURE there is. A board dragged off the viewport
   * leaves the ground and almost nothing else, and an almost-flat frame
   * compresses to a fraction of the bytes a board full of hexes does. It is a
   * coarse witness and it is the right kind: it fails when the board is not on
   * screen, which is the whole claim.
   */
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1&place=40');
  await begin(page);
  await page.waitForTimeout(700);

  const canvas = page.locator('canvas');
  const box = await canvas.boundingBox();
  if (box === null) throw new Error('no canvas');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  /** Drag the board off the screen, several viewport widths away. */
  const panAway = async (): Promise<void> => {
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(cx + 120, cy + 120);
      await page.mouse.down();
      await page.mouse.move(cx - 160, cy - 160, { steps: 8 });
      await page.mouse.up();
    }
    // The flick carries after the finger lifts; let it come to rest.
    await page.waitForTimeout(900);
  };

  const weight = async (): Promise<number> => (await canvas.screenshot()).byteLength;

  const full = await weight();
  await panAway();
  const empty = await weight();
  expect(empty, 'dragging the board away did not empty the frame').toBeLessThan(full / 2);

  const view = page.locator('[data-action="camera"]');

  // FIT, which is the first stop on the cycle.
  while ((await view.getAttribute('data-view')) !== 'fit') await view.click();
  await view.click();
  await page.waitForTimeout(700);
  expect(await weight(), 'FIT did not bring the board back').toBeGreaterThan(empty * 2);

  /*
   * And FLAT, which is the half that had no re-frame at all.
   *
   * The cycle is walked to FLAT first — every stop before it also re-centres,
   * so the board is dragged away only once the NEXT press is the one under
   * test. The button's label is its destination, which is what makes this
   * readable at all.
   */
  while ((await view.getAttribute('data-view')) !== 'flat') {
    await view.click();
    await page.waitForTimeout(500);
  }
  await panAway();
  const goneAgain = await weight();
  await view.click();
  await page.waitForTimeout(700);
  expect(await weight(), 'FLAT changed the angle and left the board off screen').toBeGreaterThan(
    goneAgain * 2,
  );

  expect(errors, errors.join('\n')).toEqual([]);
});

test('the first time the purse opens, it says what luck buys', async ({ page }) => {
  /*
   * `purseLesson` builds the whole card from the LIVE tuning: the
   * use-it-or-lose-it sentence, then one row per button the drawer offers, each
   * quoting its own button face and its own price. Marc asked for it twice in
   * Ashwake 1 — "first luck drawer expand we should explain all actions", then
   * again because the first answer did not land.
   *
   * It had no caller in this body. `purse` sits in the teaching ledger and in
   * the CARDS set, `isTrue('purse')` returns false by design because the OPEN
   * is the moment, and the handler marked the lesson TOLD without ever showing
   * it — so the drip's most expensive card spent its own ledger entry to say
   * nothing. Found 2026-08-30 by grepping for a consumer.
   *
   * A device that has NOT been taught, so the ledger is empty and the first
   * open is a first open.
   */
  const errors = watchErrors(page);
  await page.goto('/?seed=7&place=24');
  await begin(page);
  await page.waitForTimeout(600);
  await clearCards(page);

  await page.locator('[data-action="purse"]').click();

  const card = page.locator('.card-scrim .card');
  await expect(card, 'opening the purse taught nothing').toBeVisible({ timeout: 4000 });
  // The lead is the one fact a price cannot say, and it is Marc's own phrasing.
  await expect(card).toContainText(/LUCK IS FOR SPENDING|LA CHANCE, ÇA SE DÉPENSE/);
  // And the rows: one per button, so the card is a LIST rather than a
  // paragraph you have to parse to use.
  expect(
    await card.locator('.tip-row').count(),
    'the purse card lost its rows',
  ).toBeGreaterThanOrEqual(3);
  // It holds the screen: read once ever, and a list is not a glance.
  await expect(page.locator('.card-scrim')).not.toHaveClass(/brief/);

  // Dismissed, and it never comes back: one lesson, one device.
  await card.getByRole('button').last().click();
  await expect(page.locator('.card-scrim')).toHaveCount(0);
  await page.locator('[data-action="purse"]').click();
  await page.locator('[data-action="purse"]').click();
  await expect(page.locator('.card-scrim')).toHaveCount(0);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('the stat row is one line on a phone, and never two', async ({ page }) => {
  /*
   * Marc, 2026-08-30: *"review header for points, tiles, etc. so it is mobile
   * and desktop friendly."* It was a wrapping flex row of content-sized cards,
   * so on a narrow phone six stats folded onto a second band — taken out of the
   * board, and appearing and disappearing as the numbers grew digits. The board
   * resized because the score went from 99 to 100.
   *
   * Measured by TOP EDGE rather than by height: a second row is the one thing a
   * single number cannot hide, and it is exactly what the grid now forbids.
   */
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1&place=40');
  await begin(page);
  await page.waitForTimeout(600);

  const tops = await page
    .locator('[data-hud="stats"] .stat')
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(tops.length, 'the stat row is empty').toBeGreaterThan(3);
  expect(new Set(tops).size, `the stat row wrapped: tops ${tops.join(', ')}`).toBe(1);

  // And it stays a row at the narrowest phone this game supports.
  await page.setViewportSize({ width: 320, height: 568 });
  await page.waitForTimeout(200);
  const narrow = await page
    .locator('[data-hud="stats"] .stat')
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
  expect(new Set(narrow).size, `the stat row wrapped at 320px: ${narrow.join(', ')}`).toBe(1);

  expect(errors, errors.join('\n')).toEqual([]);
});

/**
 * The board's two-finger camera (2026-08-29, Marc: "anyway we could tilt, drag
 * cameras as we want? 3d style").
 *
 * The maps vocabulary on the two pointers that were already there: pinch
 * zooms, a twist turns, a two-finger drag leans. The arithmetic is unit tested
 * in `camera.test.ts`; what only a browser can say is that the gesture reaches
 * the board, that an angle wandered into can be undone, and — the part worth
 * the most — that none of it broke the pan or the pinch, which live in the
 * same handler and have produced a real bug on a real phone once already.
 *
 * **Measured through LEVEL rather than through pixels.** The obvious test
 * compares screenshots, and the first draft of this did: it passed while the
 * gesture was doing nothing at all, because the board is never still — embers
 * and beacons animate, so two shots of an unchanged board differ anyway. LEVEL
 * appears exactly when the board is off its default angle and vanishes when it
 * is back, which makes it the one witness here that cannot say yes by accident.
 *
 * Raw CDP touch, because `page.mouse` cannot express two pointers. **The
 * `touchEnd` list is the points that ENDED**, not the ones still down — worth
 * writing down, because reading it the other way silently leaves fingers on
 * the glass and every gesture after it lands on a hand with four.
 */
test('two fingers lean and turn the board, and the cycle puts it back', async ({ page }) => {
  /**
   * The board's two-finger camera (2026-08-29, Marc: "anyway we could tilt,
   * drag cameras as we want? 3d style").
   *
   * Pinch zooms, a twist turns, a two-finger drag leans — the maps vocabulary
   * on the two pointers that were already there. The arithmetic is unit tested
   * in `camera.test.ts`; what only a browser can say is that the gesture
   * reaches the board and that an angle wandered into can be undone.
   *
   * **Measured through `data-lean`, not through pixels.** The obvious test
   * compares screenshots and the first draft of this did — it passed while the
   * gesture did nothing at all, because the board is never still: embers and
   * beacons animate, so two shots of an unchanged board differ anyway. The
   * board host carries the angle it is actually at, which is the one witness
   * here that cannot say yes by accident.
   *
   * Raw CDP touch, because `page.mouse` cannot express two pointers. **The
   * `touchEnd` list is the points that ENDED**, not the ones still down —
   * reading it the other way silently leaves fingers on the glass and every
   * gesture after it lands on a hand with four.
   */
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1&place=16');
  await begin(page);
  await page.waitForTimeout(600);

  const host = page.locator('[data-lean]');
  const view = page.locator('[data-action="camera"]');
  const lean = async () => (await host.getAttribute('data-lean')) ?? '';
  const opened = await lean();
  expect(opened, 'the board did not open at its direction’s angle').toBe('35,0,0.35');

  const box = await page.locator('canvas').boundingBox();
  if (box === null) throw new Error('no canvas');
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);
  const cdp = await page.context().newCDPSession(page);
  const touch = (
    type: 'touchStart' | 'touchMove' | 'touchEnd',
    pts: readonly { x: number; y: number }[],
  ) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p) => ({ ...p })) });

  // A two-finger drag UP: the midpoint rises while the span and the angle hold,
  // so this is a lean and neither a zoom nor a turn.
  let a = { x: cx - 60, y: cy + 70 };
  let b = { x: cx + 60, y: cy + 70 };
  await touch('touchStart', [a]);
  await touch('touchStart', [a, b]);
  for (const dy of [20, 40, 60, 80]) {
    a = { x: cx - 60, y: cy + 70 - dy };
    b = { x: cx + 60, y: cy + 70 - dy };
    await touch('touchMove', [a, b]);
  }
  await touch('touchEnd', [a, b]);
  await expect(host, 'the two-finger drag did not lean the board').not.toHaveAttribute(
    'data-lean',
    opened,
  );
  const [tiltNow, yawNow] = (await lean()).split(',').map(Number);
  expect(tiltNow, 'dragging up should lean the camera BACK').toBeGreaterThan(35);
  expect(yawNow, 'a straight drag turned the board').toBe(0);

  // A twist about the midpoint: both fingers rotate, the midpoint and the span
  // hold, so this is a turn and neither a lean nor a zoom.
  a = { x: cx - 60, y: cy };
  b = { x: cx + 60, y: cy };
  await touch('touchStart', [a]);
  await touch('touchStart', [a, b]);
  for (const deg of [15, 30, 45]) {
    const t = (deg * Math.PI) / 180;
    const ox = Math.round(60 * Math.cos(t));
    const oy = Math.round(60 * Math.sin(t));
    a = { x: cx - ox, y: cy - oy };
    b = { x: cx + ox, y: cy + oy };
    await touch('touchMove', [a, b]);
  }
  await touch('touchEnd', [a, b]);
  expect(Number((await lean()).split(',')[1]), 'the twist did not turn the board').not.toBe(0);

  /*
   * And the ONE button walks its way back. FLAT is 2D — every one of the three
   * at zero, because a board seen from above with its relief still on is a 3D
   * board photographed from above and not a map.
   */
  for (let i = 0; i < 6; i++) {
    if ((await view.textContent())?.trim() === 'FLAT') break;
    await view.click();
  }
  await view.click();
  await expect(host, 'FLAT is not 2D').toHaveAttribute('data-lean', '0,0,0');

  for (let i = 0; i < 6; i++) {
    if ((await view.textContent())?.trim() === 'DEFAULT') break;
    await view.click();
  }
  await view.click();
  await expect(host, 'DEFAULT did not restore the direction’s angle').toHaveAttribute(
    'data-lean',
    opened,
  );

  assertLooksLikeAPicture(await page.locator('canvas').screenshot(), 'the levelled board');
  expect(errors).toEqual([]);
});

test("a run is played on the device's own world, and NEW RUN stays in it", async ({ page }) => {
  /*
   * The world is a PLACE — and this body had quietly stopped believing that.
   *
   * Ashwake 1 mints a world's seed once and re-derives every run's geography
   * from it. Here nothing minted one at all: a virgin device opened on the
   * literal `1`, and NEW RUN, the world switcher and RESET ALL each rolled
   * `Math.random()`. Every run was a different planet wearing the same
   * world's name, and — because `settle`'s seed guard correctly refuses to
   * merge a run into a world it was not played on — every run after the first
   * banked nothing at all: no relics, no ground, no goals, no shrine unlocks.
   *
   * Read off the disk, because the screen is where it hid: two different maps
   * look exactly like two runs of the same game.
   */
  const errors = watchErrors(page);
  const worldSeed = async (): Promise<number | null> => {
    const raw = await page.evaluate(() => localStorage.getItem('ashwake.world.1.v1'));
    return raw === null ? null : (JSON.parse(raw) as { worldSeed: number }).worldSeed;
  };

  await page.goto('/');
  await begin(page);
  await clearCards(page);

  const world = await worldSeed();
  expect(world, 'a fresh device minted no world at all').not.toBeNull();
  expect(world, 'every new player opened on the same board').not.toBe(1);

  // One placement, because the keeper writes a run when the run moves.
  await placeOneTile(page);
  const run = await page.evaluate(() => localStorage.getItem('ashwake.run.1.v1'));
  expect(run, 'the run was never saved').not.toBeNull();
  const played = JSON.parse(run!) as { rootSeed: number };
  expect(played.rootSeed, 'the run was played on some other planet').toBe(world);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('NEW RUN leaves the world it was played in exactly where it was', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?end=1');
  await begin(page);
  await clearCards(page);
  await expect(page.locator('[data-hud="end"]')).toBeVisible();

  const worldSeed = async (): Promise<number | null> => {
    const raw = await page.evaluate(() => localStorage.getItem('ashwake.world.1.v1'));
    return raw === null ? null : (JSON.parse(raw) as { worldSeed: number }).worldSeed;
  };
  const before = await worldSeed();
  expect(before, 'a settled run wrote down no world').not.toBeNull();

  await page.locator('[data-action="new-run"]').click();
  await clearCards(page);
  await expect(page.locator('[data-hud="stats"]')).toBeVisible();
  expect(await worldSeed(), 'the world moved under a player who pressed one button').toBe(before);
  expect(errors, errors.join('\n')).toEqual([]);
});
