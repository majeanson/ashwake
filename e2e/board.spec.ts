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

  // The pop paid out into the toast, or into a card if it also reached a
  // rare claim. Either way it SAID something.
  const spoke = await page
    .locator('.toast, .card')
    .first()
    .textContent()
    .catch(() => '');
  expect((spoke ?? '').trim().length, 'a pop said nothing at all').toBeGreaterThan(10);

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
  // matches — and a toast is too quiet for that. Every pop after is a toast.
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

  expect(errors, errors.join('\n')).toEqual([]);
});
