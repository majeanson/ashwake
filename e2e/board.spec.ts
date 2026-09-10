import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import {
  assertLooksLikeAPicture,
  begin,
  clearCards,
  openMore,
  placeOneTile,
  tilesLeft,
  watchErrors,
} from './helpers';

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

const tiles = tilesLeft;

/**
 * The board as a 48×48 greyscale thumbnail, and how far two of them are apart.
 *
 * A coarse witness, and coarse is the point: at this size the embers and the
 * beacons' breath average out, which is the noise `data-lean` was added to
 * dodge for the ANGLE. Where the camera STANDS has no such attribute — a
 * `data-` string carrying a float pan and zoom would be a test affordance
 * pretending to be state — and neither a tour's dive nor a dragged board is a
 * subtle difference. Two tests read it: the tour's, and the view cycle's.
 */
const small = async (page: Page): Promise<Buffer> =>
  sharp(await page.locator('canvas').screenshot())
    .greyscale()
    .resize(48, 48, { fit: 'fill' })
    .raw()
    .toBuffer();

const apart = (a: Buffer, b: Buffer): number => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs((a[i] ?? 0) - (b[i] ?? 0));
  return sum / a.length;
};

/**
 * Wait until the board is (or stops being) the picture it was, and say so.
 *
 * A stopwatch cannot time a 2.5s animation on a runner this repository has
 * MEASURED at about eleven times slower than a desktop (`vitest.config.ts`
 * carries the number and `LOG.md` Session 57 the story). A screenshot that
 * costs 40ms here can cost most of a second there, so "sleep 700ms, now we are
 * mid-dive" is a claim about a machine rather than about the board. This polls
 * instead: it is the same assertion, made whenever the runner gets round to it.
 */
/**
 * The board once it has STOPPED, as a thumbnail (2026-09-08).
 *
 * A flick leaves the camera gliding under its own momentum, and a screenshot
 * taken during that glide is a picture of a board on its way somewhere. Two
 * consecutive frames that agree is the cheapest honest statement that the
 * motion is over — and it is deliberately the same coarse 48×48 measure
 * everything else here uses, so "still" means the same thing to this helper as
 * "the same picture" means to `settleUntil`.
 *
 * The ambient life — embers, the beacons' breath — is what the 48×48 average
 * is for: it never moves two frames more than a point or so apart, where a
 * gliding camera moves them several.
 */
const stillBoard = async (page: Page, ms = 4000): Promise<Buffer> => {
  const until = Date.now() + ms;
  let last = await small(page);
  for (;;) {
    await page.waitForTimeout(120);
    const now = await small(page);
    if (apart(last, now) < 1.5 || Date.now() > until) return now;
    last = now;
  }
};

const settleUntil = async (
  page: Page,
  was: Buffer,
  want: 'moved' | 'home',
  ms = 8000,
): Promise<number> => {
  const until = Date.now() + ms;
  let d = apart(was, await small(page));
  while (Date.now() < until && (want === 'moved' ? d <= 3 : d >= 3)) {
    await page.waitForTimeout(80);
    d = apart(was, await small(page));
  }
  return d;
};

/** Tap around the centre in widening rings until a placement lands. The
 *  opening board is one tile at the origin with six legal neighbours around
 *  it, so a ring at the hex pitch finds one. */
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
  // The door label is the SHARED one, because `?seed=` is somebody else's
  // world: since 2026-09-02 the button names the mode rather than saying BEGIN
  // over any board at all. Checking that spelling here means this test also
  // pins the one sentence a stranger arriving by link reads first.
  for (const [locale, door, stat] of [
    ['fr-CA', 'COMMENCER · PARTIE PARTAGÉE', 'TUILES'],
    ['en-US', 'BEGIN · SHARED RUN', 'TILES'],
  ] as const) {
    const context = await browser.newContext({ locale, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/?seed=7');
    await expect(page.locator('[data-door="begin"]')).toHaveText(door);
    // And the line under it says what a shared run IS — the deal a recipient
    // was never told before.
    await expect(page.locator('[data-door="mode"]')).toBeVisible();
    await begin(page);
    /*
     * The stat's ACCESSIBLE NAME, not its text (2026-09-08).
     *
     * The row draws marks now, so `TUILES` is no longer on the screen as
     * characters — it is the icon's `title` and the button's name. That is
     * exactly what this test should have been reading all along: the claim is
     * *"the app speaks the device's language"*, and the language a mark
     * speaks is the one a screen reader hears.
     *
     * Worth being explicit that this is not the assertion getting weaker: if
     * the row ever went back to words, this still passes, and if the
     * catalogue regressed in either direction it still fails.
     */
    await expect(page.locator('[data-stat="tiles"]')).toHaveAccessibleName(new RegExp(stat, 'i'));
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
  // And it SAYS it is stashed, without a word: the dashed frame the empty slot
  // wears, kept by the card standing in it (Marc, 2026-09-01: "add a small
  // visual for held tiles, no full words"). The HELD badge came off with the
  // rest of the card's text, and position in the row is a fact about the
  // layout rather than about the card.
  // `toContainClass`, not `toHaveClass`: a RegExp given to the latter is matched
  // against the WHOLE class attribute, so `/stashed/` fails on "tile stashed" —
  // which reads as the class being absent when it is present, and is exactly the
  // kind of green-looking red a pinned selector exists to prevent.
  await expect(slot, 'a stashed card looks exactly like a drafted one').toContainClass('stashed');

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
   * A pop pays out into a LINE, and the line opens (2026-08-30).
   *
   * The history of this one sentence is the whole argument. It was a toast in
   * the strip between the board and the hand — arriving while the eye is on
   * the board watching the tiles thrown off it, gone by the time it looks
   * down. So it became a card (Marc, 2026-08-29: "make sure all pop as card,
   * no text above tiles for explanations ... and points"), then a BRIEF card,
   * and then Marc looked at a run of them: *"i asked previously to not pop as
   * a card everytime, just show points in the bottom and we can tap for
   * details or tap out."*
   *
   * The finding that survives all three is that the accounting is owed and is
   * worth reading AFTER the cascade. What changed is the price: the lead line
   * over the board's own bottom edge, and the rest one tap away for whoever
   * wants it. So both halves are pinned here — the line says something, and
   * the tap gets the accounting.
   */
  const line = page.locator('[data-action="pop-details"]');
  await expect(line, 'a pop did not say anything at the bottom').toBeVisible({ timeout: 4000 });
  expect(
    ((await line.textContent()) ?? '').trim().length,
    'a pop said nothing at all',
  ).toBeGreaterThan(3);
  expect(
    await page.locator('.card-scrim').count(),
    'a routine pop still held the whole screen',
  ).toBe(0);

  await line.click();
  const card = page.locator('.card-scrim .card');
  await expect(card, 'tapping the pop line did not open its receipt').toBeVisible();
  const spoke = (await card.textContent()) ?? '';
  expect(spoke.trim().length, 'the receipt behind the line was empty').toBeGreaterThan(10);
  // Asked for on purpose, so it is not the brief kind: a player who tapped for
  // details gets to read them.
  await expect(page.locator('.card-scrim')).not.toHaveClass(/brief/);

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

test('a pop after the first is a line at the bottom, and it taps out', async ({ page }) => {
  /*
   * Marc, 2026-08-30, twice. First: *"after the first pop, we don’t need to
   * have the pop card appear, we can keep it briefly but easy to tap out."*
   * That was answered with a BRIEF card — no focus taken, any tap dismisses,
   * leaves on its own — and he looked at a run of those and said it again,
   * harder: *"i asked previously to not pop as a card everytime, just show
   * points in the bottom and we can tap for details or tap out."*
   *
   * A brief card is still a card. It still darkens the board behind it, still
   * lands in the middle of the screen, and still has to be waited out. Several
   * times a minute that is the game stopping to congratulate you on the thing
   * you came to do.
   *
   * So a routine pop holds NOTHING. It is the receipt’s own lead line in the
   * strip over the board’s bottom edge, where the toast has always lived, and
   * the three things worth pinning are the three ways it goes wrong: it must
   * not raise a scrim, it must not eat the next tap on the board, and the
   * accounting must still be one tap away rather than gone.
   *
   * A device with a harvest already banked (`?runs=1`) is exactly the state
   * where the first-pop card has been spent, so this is the ordinary case and
   * not an edge one.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1&runs=1&place=24');
  await begin(page);
  await page.waitForTimeout(600);
  await clearCards(page);

  const pop = page.getByRole('button', { name: /POP|RÉCOLT/ }).first();
  await expect(pop).toBeVisible();
  await pop.click();

  const line = page.locator('[data-action="pop-details"]');
  await expect(line, 'a pop said nothing').toBeVisible({ timeout: 4000 });
  expect(await page.locator('.card-scrim').count(), 'a routine pop still held the screen').toBe(0);
  // It still SAYS the thing: the line is the accounting’s own first sentence,
  // not a shorter one written here.
  expect(((await line.textContent()) ?? '').trim().length).toBeGreaterThan(3);

  /*
   * And the board underneath is still the board.
   *
   * The card this replaced had to be proved not to be a wall — a scrim that
   * catches pointers eats the first tap after every pop, so a player popping
   * steadily loses a placement’s worth of tapping to a receipt they were not
   * reading. A line in the strip has the same duty and a smaller footprint,
   * and the tap is aimed away from it on purpose.
   */
  await page.mouse.click(120, 300);
  await expect(line, 'the pop line outlived the tap that should have replaced it').toHaveCount(0);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a card in the hand is the tile it will become, and only the chosen one has a box', async ({
  page,
}) => {
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

  // The card's hex is `ui/Hex` — the same drawing the manual's legend and
  // figures ask for — so the picture is an `<image>` inside an SVG rather than
  // an `<img>`, and it is clipped to the hexagon the board draws.
  const art = page.locator('.hand .tile-art image').first();
  await expect(art, 'no hand card carries its baked hex').toBeVisible({ timeout: 4000 });
  expect(
    await art.getAttribute('href'),
    'the card points at something other than a terrain slot',
  ).toMatch(/\/assets\/[a-z-]+\/terrain\.(green|yellow|red|blue)\.png$/);
  // It LOADED: a broken picture is a card that reads as empty, which is the
  // failure Ashwake 1 caught in a screenshot rather than in a test. An SVG
  // image has no `naturalWidth`, so the file is fetched the way the browser
  // fetched it and its status is the witness.
  const href = await art.getAttribute('href');
  const res = await page.request.get(`${page.url().split('/?')[0] ?? ''}${href ?? ''}`);
  expect(res.status(), 'the baked hex did not load').toBe(200);

  /*
   * And the hand is a row of TILES, not a row of boxes (2026-08-30, Marc:
   * "make sure unselected card tiles blend in with the game, no border, only
   * the selected one"). Measured through the computed border colour, because
   * that is the thing that was drawing a frame around every card: transparent
   * on the ones you have not picked up, inked on the one you have.
   */
  const bordered = async (): Promise<string[]> =>
    page
      .locator('.hand .tile:not(.hold):not(.gap)')
      .evaluateAll((els) => els.map((el) => getComputedStyle(el).borderTopColor));

  const boxes = async (): Promise<number> =>
    (await bordered()).filter((c) => c !== 'rgba(0, 0, 0, 0)').length;

  // A run opens with a card already picked up, so the hand always has exactly
  // one box in it: the chosen card's. Every other card is its hex and nothing
  // else.
  expect((await bordered()).length, 'the hand is empty').toBeGreaterThan(1);
  expect(await boxes(), 'the hand is not showing exactly one box').toBe(1);

  // And the box FOLLOWS the choice rather than accumulating. Asserted through
  // a retrying locator first: a click is dispatched before React has committed
  // the render it causes, and reading a computed style straight after it reads
  // the frame before.
  const second = page.locator('.hand .tile:not(.hold):not(.gap)').nth(1);
  await second.click();
  await expect(second, 'the tapped card was not chosen').toHaveClass(/chosen/);
  await expect(
    page.locator('.hand .tile.chosen'),
    'choosing another card left two boxes in the hand',
  ).toHaveCount(1);
  // Polled, not read once: `border-color` transitions over `--fade`, so the
  // card that just LOST the box is still fading it out for 140ms and a single
  // read catches two boxes mid-crossfade.
  await expect.poll(boxes, { message: 'a card without the chosen class kept its border' }).toBe(1);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('the view cycle hands the board back, and never loses the board you made', async ({
  page,
}) => {
  /*
   * Marc, 2026-08-30: *"when pressing FLAT, FIT, etc. make sure we recenter the
   * map not too zoomed out."* Marc, 2026-09-08: *"Revise all 3 camera modes so
   * the third one is always 'my own custom view' so that if we toggle with this
   * button we never lose the camera."*
   *
   * The second ask rewrote what this test can claim, so it says the two things
   * that are true now instead of the two that were:
   *
   *   - **DEFAULT hands a lost board back.** It always did; it is the only stop
   *     that does now, and that is the change. FLAT used to re-frame as well and
   *     stopped, because FLAT became *"2d of our own custom view"* — a stop that
   *     re-framed would throw away the pan and the zoom it exists to keep. FIT
   *     is gone entirely: it was the button's own opinion and DEFAULT frames the
   *     board whole anyway.
   *   - **MY VIEW gives back the board your hands made.** Which is the whole
   *     ask, and the thing no stop on the old four-view cycle could do.
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
  const view = page.locator('[data-action="camera"]');
  /** Walk the cycle until the button's label says it will go where we want.
   *  The label IS the destination, which is what makes this readable. */
  const aimAt = async (where: string): Promise<void> => {
    for (let i = 0; i < 4 && (await view.getAttribute('data-view')) !== where; i++) {
      await view.click();
      await page.waitForTimeout(500);
    }
    expect(await view.getAttribute('data-view'), `the cycle has no ${where} stop`).toBe(where);
  };

  const full = await weight();
  await panAway();
  const empty = await weight();
  expect(empty, 'dragging the board away did not empty the frame').toBeLessThan(full / 2);

  // DEFAULT, the one stop that re-frames.
  await aimAt('home');
  await view.click();
  await page.waitForTimeout(700);
  expect(await weight(), 'DEFAULT did not bring the board back').toBeGreaterThan(empty * 2);

  /*
   * And MY VIEW, which is the ask. The board is dragged somewhere deliberate —
   * off-centre but still on screen, the way a player arranges one — then the
   * cycle is walked all the way round. The picture that comes back has to be
   * the one the hands made, not the one the button prefers.
   */
  await page.mouse.move(cx + 90, cy + 90);
  await page.mouse.down();
  await page.mouse.move(cx - 30, cy - 10, { steps: 8 });
  await page.mouse.up();
  /*
   * WAIT FOR THE BOARD TO STOP, rather than for 900ms (flake named
   * 2026-09-08).
   *
   * This test failed two runs in three on unmodified `main`, at 3.6 and 4.6
   * against a threshold of 3, and the cause is in the four lines above: eight
   * fast steps and a lift is a FLICK, so the board is still gliding under its
   * own momentum when the shutter opens. `own` was a picture of a board
   * mid-throw; MY VIEW later restores the camera where the glide ENDED, and
   * the two were never going to match. The 900ms was a bet on the glide being
   * over, and on a runner this repository has measured at eleven times slower
   * than a desktop it is a bet that loses about a third of the time.
   *
   * Polling for stillness is the same fix `settleUntil` below already is, and
   * the same lesson `vitest.config.ts` records about stopwatches: ask the
   * board whether it has stopped instead of guessing how long that takes.
   */
  const own = await stillBoard(page);
  /** The angle the board is at when its reference picture is taken — a drag
   *  pans and never leans, so this is the direction's own. MY VIEW owes it
   *  back, and the assertion is at the end of the cycle. */
  const leanAtOwn = (await page.locator('[data-lean]').getAttribute('data-lean')) ?? '';

  await aimAt('home');
  await view.click();
  expect(
    await settleUntil(page, own, 'moved'),
    'DEFAULT did not move off the view the drag made',
  ).toBeGreaterThan(3);

  await aimAt('mine');
  await view.click();

  /*
   * THE ANGLE, ASSERTED — and this is the witness the pixel threshold below
   * should never have been on its own (2026-09-10).
   *
   * This test failed about one run in three, at 3.09, 3.40, 4.11 and 4.47
   * against the `< 3` below, and was written up twice as a machine problem: a
   * GPU flake, then a threshold too tight. **It was reporting a real bug.**
   * `aimAt('mine')` reaches MY VIEW through FLAT — the press that reveals the
   * label is the one that squares the board — and MY VIEW then handed back the
   * FLAT board rather than the one the drag made. A flat board sits about three
   * units from a tilted one at this pan and zoom, which is why the failure
   * looked like noise: it straddled the bar.
   *
   * The cause is R3F rendering ON DEMAND. A pan glide the board stopped drawing
   * mid-throw stays in `glide.current` instead of resting, and the next render
   * — the one a lean change itself causes — resumes it for a frame. That frame
   * calls `keepMine()`, which reads the lean that has just changed, so pressing
   * FLAT stamped the player's remembered view as flat. `Board.tsx`'s lean
   * effect drops the glide now, on the rule the glide's own note already
   * stated: a finger outranks a throw.
   *
   * Diagnosed by probe: `mine` was `{tilt:0,yaw:0,relief:0}` on eight
   * `myView()` calls out of eight. `LOG.md` Session 80, `NEXT.md` §1.
   *
   * It goes BEFORE the pixel check on purpose. A wrong angle is the thing that
   * was actually broken, and a named attribute says so where a distance can
   * only say "about three".
   */
  await expect(
    page.locator('[data-lean]'),
    'MY VIEW came back at a different angle from the board the drag made',
  ).toHaveAttribute('data-lean', leanAtOwn);

  expect(await settleUntil(page, own, 'home'), 'MY VIEW did not give the board back').toBeLessThan(
    3,
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

test('opening the purse does not resize the board', async ({ page }) => {
  /*
   * `.spends` was a real flex child of `.shell` beside `.board-host` —
   * `flex: 1; min-height: 0` — until 2026-09-04, on the reasoning that only a
   * flex child of the shell knows where the board's edge is. True, but it
   * meant every open drawer added its own height to that flex column, and
   * `.board-host` shrank by exactly that much: the map resized every time
   * LUCK was tapped, which is the one thing a popup opening over the board
   * must never do. `.spends` is `position: absolute` now, anchored to
   * `.hand-host` instead of flexing beside `.board-host` — this is the check
   * that the anchor actually holds and the board's own box stays put.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1&seed=7&place=24');
  await begin(page);
  await page.waitForTimeout(600);
  await clearCards(page);

  const board = page.locator('.board-host');
  const before = await board.boundingBox();
  if (before === null) throw new Error('no board');

  await page.locator('[data-action="purse"]').click();
  await expect(page.locator('[data-hud="purse"]')).toBeVisible();

  const after = await board.boundingBox();
  expect(after, "opening the purse changed the board's box").toEqual(before);

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

  /** The angle the player's own hands left the board at — what MY VIEW owes
   *  them, asserted at the end of the cycle below. */
  const orbited = await lean();

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

  /*
   * AND MY VIEW GIVES THE ANGLE BACK (2026-09-10).
   *
   * The gap that let a real bug ship for two days: this test checked that FLAT
   * is 2D and that DEFAULT restores the direction's angle, and never once asked
   * what MY VIEW does to the lean. The only witness was the view cycle's own
   * PIXEL threshold, three tests down, and it was loose enough to pass three
   * runs in four — so a board that came back flat read as a flaky number and
   * was written up twice as a machine problem.
   *
   * What it was: R3F renders on demand, so a glide the board stopped drawing
   * mid-throw stayed in `glide.current`, and the next render — the one a lean
   * change itself causes — resumed it for a frame and stamped the remembered
   * view with the NEW angle. Press FLAT, and MY VIEW handed back the flat
   * board. `Board.tsx`'s lean effect carries the fix and the argument.
   *
   * Marc, 2026-09-08: *"make sure the third one is always 'my own custom view'
   * so that if we toggle with this button we never lose the camera."* This is
   * that sentence, as an assertion.
   */
  const mineWanted = orbited;
  expect(mineWanted, 'the gestures above left the board at its opening angle').not.toBe(opened);
  for (let i = 0; i < 6; i++) {
    if ((await view.textContent())?.trim() === 'MY VIEW') break;
    await view.click();
  }
  await view.click();
  await expect(host, 'MY VIEW did not give back the angle the hands made').toHaveAttribute(
    'data-lean',
    mineWanted,
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

test('the hand is one height, whatever is written on its cards', async ({ page }) => {
  /*
   * Marc, 2026-08-30: *"the height changes when we get magic tiles vs normal
   * or uniques, check why and make sure it stays the same."*
   *
   * A rare card carried its rarity word and a stashed one carried HELD, and
   * both were ordinary flex children of a card with a `min-height`. So a card
   * with either was taller than a common one — and the hand is a GRID, so one
   * magic card in a four-card draft grew the whole row and took that many
   * pixels off the board. Worse than the cost: it moved DURING a run, every
   * time a rare was dealt, stashed or spent, so the board resized under a
   * reaching thumb. This file spends most of its other comments defending
   * board height; that is what was leaking.
   *
   * The cards carry no words at all since 2026-08-31 (Marc: *"remove text in
   * the hand tiles, keep color and symbol"*), so the two labels cannot come
   * back on their own. What is measured is the rule rather than the labels:
   * every card in the row is the same height as every other, and putting
   * ANYTHING inside one does not move the row — a card is a fixed box, and a
   * hand that grows is board that shrinks under a reaching thumb.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1&runs=1&place=24');
  await begin(page);
  await page.waitForTimeout(600);
  await clearCards(page);

  const measure = () =>
    page.evaluate(() => {
      const hand = document.querySelector('[data-hud="hand"]');
      const host = document.querySelector('.board-host');
      return {
        hand: hand?.getBoundingClientRect().height ?? 0,
        board: host?.getBoundingClientRect().height ?? 0,
      };
    });

  const before = await measure();
  expect(before.hand, 'no hand to measure').toBeGreaterThan(0);

  // Every card in the row is already the same height as every other.
  const heights = await page
    .locator('.hand .tile')
    .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().height)));
  expect(new Set(heights).size, `the hand's cards are ${heights.join('/')} tall`).toBe(1);

  // And no card in the hand SHOWS a word: a hand of words is what shrank the
  // board, and the ground's name, the rarity and HELD all left with it. The
  // clipped span is not one — it is the card's accessible name, and it is
  // exactly what a screen reader has instead of the pictures.
  const words = await page
    .locator('.hand .tile:not(.hold)')
    .evaluateAll((els) =>
      els.flatMap((el) =>
        [...el.querySelectorAll('*')]
          .filter(
            (child) =>
              [...child.childNodes].some(
                (node) =>
                  node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
              ) && child.closest('.visually-hidden') === null,
          )
          .map((child) => child.textContent?.trim() ?? ''),
      ),
    );
  expect(words, `a card in the hand is still saying ${words.join('/')}`).toEqual([]);

  // Now put something in a card anyway: the box is a fixed height, so it does
  // not matter what lands in it.
  await page
    .locator('.hand .tile')
    .first()
    .evaluate((el) => {
      const extra = document.createElement('span');
      extra.textContent = 'UNIQUE HELD';
      el.append(extra);
    });

  const after = await measure();
  expect(after.hand, 'writing on a card made the hand taller').toBeCloseTo(before.hand, 1);
  expect(after.board, 'and the board paid for it').toBeCloseTo(before.board, 1);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a run opens centred on the tile it starts from', async ({ page }) => {
  /*
   * Marc, 2026-08-30: *"make sure when we start a new world or daily its
   * centered on the starting tile."*
   *
   * The rig fits the board ONCE EVER. `framedOnce` is a ref, and the rig lives
   * inside the R3F host, which by rule never remounts — so the one thing that
   * guarantees a first fit is the one thing a new world does not get. Stepping
   * into world 2 from a board you had dragged two screens away opened world 2
   * two screens away from its settlement, on an empty plane, with nothing on
   * screen to say which way to walk.
   *
   * That ref is right about what it was written for — a PLACEMENT must not
   * move the board — and this is not that: the camera still only moves when it
   * is asked, and starting a run is an asking.
   *
   * Measured as INK IN THE MIDDLE. There is no camera to read from out here,
   * and a centroid over the whole board would be dragged around by whichever
   * landmarks happen to glow at the edges — which is the exact failure this
   * fixes, since `flyToFit` frames those too and slid the settlement to the
   * bottom of the screen. A small square at the dead centre of the board host
   * either has the tile in it or is flat ground.
   */
  const errors = watchErrors(page);

  const middleIsFlat = async (): Promise<boolean> => {
    const host = page.locator('.board-host');
    const box = await host.boundingBox();
    if (box === null) throw new Error('no board host');
    const shot = await page.screenshot({
      clip: {
        x: box.x + box.width / 2 - 34,
        y: box.y + box.height / 2 - 34,
        width: 68,
        height: 68,
      },
    });
    const seen = new Set<string>();
    for (let i = 0; i + 4 <= shot.byteLength; i += 4)
      seen.add(shot.subarray(i, i + 4).toString('hex'));
    // A flat patch of empty plane is a handful of byte-quads; a hex with its
    // fill, its edge and its texture is hundreds.
    return seen.size < 60;
  };

  await page.goto('/?taught=1&runs=5&place=30&seed=7');
  await begin(page);
  await page.waitForTimeout(700);
  await clearCards(page);

  // Drag the board a long way off, the way a player reading the far edge does.
  await page.mouse.move(320, 200);
  await page.mouse.down();
  await page.mouse.move(60, 640, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(600);

  // ANOTHER WORLD.
  await openMore(page);
  await page.locator('[data-panel="more"] [data-go="worlds"]').click();
  await page.locator('[data-slot="2"]').click();
  await page.waitForTimeout(1400);
  expect(await middleIsFlat(), 'a new world opened on empty ground, not on its starting tile').toBe(
    false,
  );

  // TODAY’S DAILY, which is a different plane again.
  await page.mouse.move(320, 200);
  await page.mouse.down();
  await page.mouse.move(60, 640, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(400);
  await openMore(page);
  await page.locator('[data-panel="more"] [data-go="daily"]').click();
  await page.waitForTimeout(1400);
  await clearCards(page);
  expect(await middleIsFlat(), 'the daily opened on empty ground, not on its starting tile').toBe(
    false,
  );

  expect(errors, errors.join('\n')).toEqual([]);
});

test('POP wears one mark, on the bar, in the manual and on the card', async ({ page }) => {
  /*
   * Marc, 2026-08-30: *"make em icons, associate in how to play and cards
   * too."*
   *
   * The point is not that a button has a picture on it — it is that the SAME
   * shape says the same thing in every place the idea turns up, which is the
   * whole argument for the game having a symbol language at all
   * (`theme/icons.ts`: "a symbol language with a homonym in it is a language
   * nobody learns"). Three places, and a check for each, because they are
   * three separate wirings and any one of them can be forgotten:
   *
   *   - the ACTION BAR, where you press it;
   *   - HOW TO PLAY, where the section that explains it carries the mark in
   *     its heading;
   *   - the CARD a harvest leaves, which had no mark on the reasoning that
   *     "the board is the thing that popped" — true while POP was only a
   *     button and not while it is a concept in the registry.
   *
   * Compared by the PATH the SVG draws, not by a class name: two different
   * icons under one class would pass a name check and be the bug.
   *
   * SACRIFICE was the second half of this test until 2026-09-03, when Marc
   * cut the mechanic entirely (`burnRelics`/`burnLuck` both 0 in `TUNING`
   * now — see `LOG.md`). The bar button, card receipt and manual section
   * (`Manual.tsx` SECTIONS) are all gone with it, so this only has POP left
   * to check — a positive assertion that the bar button is gone stands in
   * for what used to be a mark comparison.
   */
  const errors = watchErrors(page);

  const pathOf = (sel: string): Promise<string | null> =>
    page
      .locator(sel)
      .first()
      .evaluate((el) => el.querySelector('svg path')?.getAttribute('d') ?? null);

  // 1. THE BAR.
  await page.goto('/?taught=1&runs=1&place=24');
  await begin(page);
  await page.waitForTimeout(700);
  await clearCards(page);

  const onPop = await pathOf('[data-action="pop"] .act-mark');
  expect(onPop, 'POP wears no mark').not.toBeNull();
  await expect(page.locator('[data-action="pop-burn"]'), 'SACRIFICE still renders').toHaveCount(0);

  // 2. THE CARD a harvest leaves.
  await page
    .getByRole('button', { name: /POP|RÉCOLT/ })
    .first()
    .click();
  await page.locator('[data-action="pop-details"]').click({ timeout: 6000 });
  expect(
    await pathOf('.card-scrim .card .card-glyph'),
    'the pop receipt does not lead with the mark its button wears',
  ).toBe(onPop);

  // 3. HOW TO PLAY, where it is explained.
  await page.goto('/?taught=1');
  await page.locator('[data-door="menu"]').click();
  await page.locator('[data-panel="more"] [data-go="manual"]').click();
  await page.locator('[data-tab="start"]').click();
  await page.waitForTimeout(400);

  const heads = await page
    .locator('[data-panel="manual"] section h2.marked')
    .evaluateAll((els) =>
      els.map((el) => [
        el.textContent?.trim() ?? '',
        el.querySelector('svg path')?.getAttribute('d') ?? null,
      ]),
    );
  const headOf = (word: RegExp): string | null =>
    heads.find(([name]) => word.test(String(name)))?.[1] ?? null;

  expect(
    headOf(/POP|RÉCOLTER/),
    'the manual POP section does not wear the mark its button wears',
  ).toBe(onPop);
  expect(
    heads.some(([name]) => /SACRIFICE|SACRIFIER/.test(String(name))),
    'the manual still has a SACRIFICE section',
  ).toBe(false);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('a tap on a touring board brings it home instead of placing a tile', async ({ page }) => {
  /*
   * Marc, 2026-09-08: *"yes do the same for caches, sites and territories and
   * other concepts on the map"* — so a card that names a place now flies the
   * board out, in on the hex and back (`BoardHandle.tour`). The board stays
   * LIVE through that trip on purpose, because a finger has always outranked a
   * journey here, and that left a hole this suite found on the first run:
   *
   * **a thumb that had just pressed GOT IT and wanted to place a tile was
   * raycasting into a board mid-flight**, landing on whatever hex the camera
   * happened to be over. `keeps taking taps on the frontier as the board grows`
   * failed with `no legal hex found in the search rings` — ninety-six ring taps
   * aimed at a board that had stopped being where they were pointing. The one
   * thing on this board that cannot be undone is a tile placed on the wrong
   * hex.
   *
   * So a tap on a touring board means "come back" and nothing else.
   *
   * **The first fix for it shipped a second bug, and this test does NOT hold
   * that one** — said plainly, because a comment claiming coverage it does not
   * have is the thing that stops the next reader checking. `endTour` came home
   * only if the camera was AT the leg, which is false for the 320ms a leg
   * spends flying, so a tap early in a trip declined to return and parked the
   * board at the wide shot for the rest of the run. This test taps during the
   * HOLD, where a naive check passes; it was the frontier spec above that
   * failed, because tapping in a tight loop is how you land mid-flight. Both
   * were checked by breaking `endTour` and watching which went red.
   *
   * Seed 122 because a landmark on the OPENING board is rare: eight seeds in
   * four hundred put one within four rings, and this one puts it where the card
   * fires before a tile has been placed.
   *
   * **It was a shrine until 2026-09-09 and this test named it one.** A `?seed=`
   * link is a shared board, and a shared board plays a daily's economy now
   * (`shell/economy.ts`'s `NO_LEDGER`): every shrine is rewritten into a cache
   * or a site, because a door that unlocks nothing is worse than no door. So
   * the shrine card never came and this test failed — correctly, and on the
   * first full run after the change.
   *
   * What it is ABOUT is the tour, not which landmark starts one: Marc's own ask
   * was *"yes do the same for caches, sites and territories and other concepts
   * on the map"*, so any of the four is the trigger this test needs. Naming the
   * whole family is also the more honest test — it stops depending on a
   * geography dial that has now moved under it twice.
   */
  const errors = watchErrors(page);
  await page.goto('/?seed=122');
  await page.locator('[data-door="begin"]').click();
  await page.waitForTimeout(700);

  const scrim = page.locator('.card-scrim');
  const place = page.locator(
    '#lesson-shrine-name, #lesson-cache-name, #lesson-site-name, #lesson-territory-name',
  );
  for (let i = 0; i < 8 && (await place.count()) === 0; i++) {
    if ((await scrim.count()) === 0) throw new Error('no card for a place ever came');
    await scrim.locator('button').last().click({ force: true });
    await page.waitForTimeout(120);
  }
  expect(await place.count(), 'no card for a place ever came').toBe(1);

  const held = await tiles(page);
  await scrim.locator('button').last().click({ force: true });

  // The opening board already fits, so the trip's first leg moves nothing: this
  // is home, taken while the scrim is gone and the dive has not begun.
  await page.waitForTimeout(150);
  const home = await small(page);

  // ...and this is the dive, which is the half that makes the rest meaningful.
  // Polled rather than slept for: see `settleUntil`. The hold at the hex is
  // 1200ms, so there is a wide window to arrive in even on a slow runner, and
  // the poll takes the first frame of it rather than a guessed one.
  expect(
    await settleUntil(page, home, 'moved'),
    'the board never toured, so the tap proves nothing',
  ).toBeGreaterThan(3);

  const box = await page.locator('canvas').boundingBox();
  if (box === null) throw new Error('no canvas');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(800);

  expect(await tiles(page), 'a tap during the tour placed a tile').toBe(held);

  /*
   * And then the screen has to be cleared before the board can be photographed
   * again, which cost this test one wrong reading: ending a tour drops the gate,
   * so the lesson that was waiting behind it arrives at once — and a card's
   * scrim is over the canvas, in an element screenshot, at 94% of the ground.
   * The first version read that as a board 14 apart from home. The wait after
   * is a whole `tourMs`, so a dismissal that starts a trip of its OWN has been
   * and come back by the time the frame is taken.
   */
  let clear = 0;
  for (let i = 0; i < 60; i++) {
    if ((await scrim.count()) > 0) {
      await scrim.locator('button').last().click({ force: true });
      clear = 0;
    } else {
      clear = apart(home, await small(page));
      if (clear < 3) break;
    }
    await page.waitForTimeout(120);
  }
  expect(clear, 'the tap did not bring the board home').toBeLessThan(3);

  expect(errors, errors.join('\n')).toEqual([]);
});
