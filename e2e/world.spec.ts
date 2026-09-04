import { expect, test, type Page } from '@playwright/test';
import { begin, clearCards, watchErrors } from './helpers';

/**
 * The world memory, in a real browser (2026-08-30).
 *
 * Two things this repository had built, tested in the core, and reached from
 * nothing — the invisible half of `CLAUDE.md`'s standing warning, where the
 * missing consumer is a NUMBER rather than a control:
 *
 * 1. **`mergeRun` had no caller.** World memory was written only at `settle`,
 *    so every claim was provisional until a run ended: a shrine woken at
 *    placement 40 did not reach the atlas, and a player who closed the tab
 *    lost the territory they had just walked to. Both were live bugs in
 *    Ashwake 1 and both were reintroduced here.
 * 2. **`newRun`'s `wakeAt` was hard-wired null**, so the fifth shrine — BEGIN
 *    AT CAMP — woke a door onto nothing.
 *
 * Asserted through `localStorage` rather than through a screen on purpose. The
 * screens were never wrong: the atlas rendered, the shrine toasted, the unlock
 * listed itself. What disagreed was the disk.
 */

test.use({ viewport: { width: 390, height: 844 } });

/** This device's world memory for slot 1, decoded. */
const worldOf = async (page: Page): Promise<Record<string, unknown> | null> =>
  page.evaluate(() => {
    const raw = localStorage.getItem('ashwake.world.1.v1');
    return raw === null ? null : (JSON.parse(raw) as Record<string, unknown>);
  });

test('the world remembers the ground a run is walking, before the run ends', async ({ page }) => {
  const errors = watchErrors(page);
  // A scripted opening: thirty placements, played through the same reducer a
  // finger would, and the run is still going when they are done.
  await page.goto('/?taught=1&place=30');
  await begin(page);

  // The keeper debounces; a phone that is closed inside that window is what
  // `flush` on hide is for, and this is simply longer than the window.
  await page.waitForTimeout(1200);

  const world = await worldOf(page);
  expect(world, 'no world was minted at all').not.toBeNull();
  expect(
    (world?.['revealed'] as string[] | undefined)?.length ?? 0,
    'the run walked thirty placements and the world remembered none of it',
  ).toBeGreaterThan(1);
  // The RUN COUNT is the one field that waits for a run to be over — this is
  // `mergeRun`'s whole difference from `rememberRun`, and when it bumped here
  // too (Ashwake 1, 2026-08-18) the atlas called every tap a run.
  expect(world?.['runs'], 'a run in progress counted itself as finished').toBe(0);

  // Still playing, so this is a mid-run write and not a settle.
  await expect(page.locator('[data-hud="end"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a fully-awake world offers BEGIN AT CAMP, and camping wakes out there', async ({ page }) => {
  const errors = watchErrors(page);
  // `?runs=300` is the audit's own device history: a world with every shrine
  // woken and territories held, which is the only state that can offer this.
  await page.goto('/?taught=1&runs=300');

  await page.locator('[data-door="menu"]').click();
  await page.locator('[data-go="worlds"]').click();

  const camp = page.locator('[data-go="camp"]');
  await expect(camp, 'the fifth shrine still wakes a door onto nothing').toHaveCount(1);
  // It names the ring, because how far out the climb begins is the whole of
  // what the player is choosing.
  await expect(camp).toContainText(/\d/);

  await camp.click();
  await clearCards(page);
  await page.waitForTimeout(1200);

  const run = await page.evaluate(() => {
    const raw = localStorage.getItem('ashwake.run.1.v1');
    return raw === null ? null : (JSON.parse(raw) as Record<string, unknown>);
  });
  expect(run, 'BEGIN AT CAMP started no run').not.toBeNull();
  expect(typeof run?.['wakeAt'], 'the camp run woke at origin like every other run').toBe('string');
  // And it is a territory this world actually holds — a camp is ground you
  // walked to, not a hex the shell picked.
  const world = await worldOf(page);
  expect(world?.['territories']).toContain(run?.['wakeAt']);

  expect(errors).toEqual([]);
});

test('a run that gains nothing says it gained nothing', async ({ page }) => {
  const errors = watchErrors(page);
  /*
   * The first run of a PAGE, in a world that already holds everything.
   *
   * `perksAtStart` and `unlocksAtStart` were set by every door into a run
   * except the one the page opens on — BEGIN on the front door, or `?end=1`
   * before React has mounted — so that run measured its gains against empty
   * lists and the end screen told a returning player they had just woken every
   * shrine and found every perk their world already held. Invisible on a fresh
   * device, where empty IS the right answer, which is how it survived; found
   * in the audit's `end-many` shot, which is what the fixture axis is for.
   */
  await page.goto('/?taught=1&runs=300&end=1');
  await begin(page);
  await expect(page.locator('[data-hud="end"]')).toHaveCount(1);

  // The block only renders when something was gained, so its absence IS the
  // assertion — and its presence would name five shrines this run did not wake.
  await expect(
    page.locator('[data-hud="gained"]'),
    'a run in a finished world claimed it had just unlocked the world',
  ).toHaveCount(0);

  expect(errors).toEqual([]);
});

test('a world three hundred runs deep does not look like a fresh one', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1&runs=300');
  await page.locator('[data-door="menu"]').click();
  await page.locator('[data-go="worlds"]').click();

  const panel = page.locator('[data-panel="worlds"]');
  // The instrument, asserted rather than only photographed: the numbers on
  // this panel are the ones that read `0` through both of 2026-08-30's bugs.
  await expect(panel).toContainText('300');
  await expect(panel.locator('[data-slot="3"]')).toContainText(/begin new|nouvelle partie/);

  // A shop with relics in it, and a build already bought. `0` here is what a
  // purse that never banked looks like, and it is what this device showed for
  // the whole of Stage 4.
  await page.locator('[data-panel="worlds"] .panel-back').click();
  await page.locator('[data-go="shop"]').click();
  const relics = await page
    .locator('[data-panel="shop"] .note')
    .first()
    .evaluate((el) => Number((el.textContent ?? '').replace(/\D/g, '')));
  expect(relics, 'three hundred runs banked no relics').toBeGreaterThan(0);

  expect(errors).toEqual([]);
});

test('remembered ground answers a tap, lights its biome, and the lens has a way out', async ({
  page,
}) => {
  /*
   * Three things that were built, documented as working, and unreachable
   * (2026-09-01).
   *
   * `INTERACTIONS.md` has listed "tap remembered fog (the biome lens)" as
   * working in this body since the matrix was written. `App`'s `onTap` has a
   * whole branch for it — `rememberedNativeAt`, the spotlight, the sentence —
   * and `HexField`'s raycast refused remembered ground outright, so the branch
   * had no way to run. The keyboard could reach the fog (`cursor.ts` walks it
   * on purpose); the finger could not.
   *
   * Marc: *"discovered biomes should be highlightable and a quick 'Lens off'
   * button (see other repo)."* Both halves are here: the tap that lights a
   * biome, and the control that puts it down.
   *
   * `?runs=300` is the only device history with fog to tap — a world with a
   * few hundred runs of revealed ground around a run that has just started.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1&runs=300');
  await begin(page);
  await clearCards(page);
  // The camera eases into its fit before a ray can land where the eye is —
  // measured 2026-08-29, taps miss at 300ms and land at 400ms.
  await page.waitForTimeout(700);

  // A run opens flown to its wake hex, close in, where the live board is.
  // Zoom out until the world this device remembers is under the probe ring:
  // the fog begins where this run has not grown, which is a few rings out.
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('-');
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(400);
  const box = await page.locator('canvas').boundingBox();
  if (box === null) throw new Error('no canvas');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const lensOff = page.locator('[data-action="lens-off"]');
  const toast = page.locator('.toast');

  // The fit frames the remembered world, so the fog is most of the screen and
  // the live structure is a speck at the middle. Probe outward until one tap
  // lands on fog that knows its colour: not every remembered hex has a native
  // one, and a wall or a remembered landmark answers with a sentence instead.
  const said = new Set<string>();
  for (const r of [60, 90, 120, 150, 40, 20]) {
    for (let i = 0; i < 12 && (await lensOff.count()) === 0; i++) {
      const a = (Math.PI / 6) * i;
      await page.mouse.click(cx + r * Math.cos(a), cy + r * Math.sin(a));
      const text = (await toast.textContent())?.trim() ?? '';
      if (text !== '') said.add(text);
    }
    if ((await lensOff.count()) > 0) break;
  }

  // A tap on ground you cannot build on still SAYS something, which is the
  // rule this whole gesture belongs to.
  expect(said.size, 'every tap on the fog was a silent no-op').toBeGreaterThan(0);

  await expect(lensOff, 'no tap on remembered ground ever lit a biome').toHaveCount(1);
  // The button names the colour it is holding up, in its own mark.
  await expect(lensOff).toHaveAttribute('data-lens', /green|yellow|red|blue/);

  // And it lets go, out loud — the half neither gesture that clears a lens
  // has ever said.
  await lensOff.click();
  await expect(lensOff).toHaveCount(0);
  await expect(toast).not.toHaveText('');

  expect(errors, errors.join('\n')).toEqual([]);
});

test('the ending says what this world has become, not only what the run scored', async ({
  page,
}) => {
  /*
   * Marc, of a run whose shrine handed him the fourth draft card: *"in this
   * game I got the shrine 4th tile, id like it shown in the end screen."*
   *
   * The WOKE line answers "what changed" and could not answer "where does that
   * leave me" — the two facts the atlas carries were three taps away in MORE,
   * on the one screen where they had just been earned.
   */
  const errors = watchErrors(page);
  await page.goto('/?taught=1&runs=300&end=1');
  await begin(page);

  const end = page.locator('[data-hud="end"]');
  await expect(end).toHaveCount(1);
  const atlas = end.locator('.atlas');
  await expect(atlas, 'the ending said nothing about the world it was played in').toHaveCount(1);
  // The shrine ledger, as a fraction: the number Marc went looking for.
  await expect(atlas).toContainText(/\d\/\d/);

  expect(errors).toEqual([]);
});
