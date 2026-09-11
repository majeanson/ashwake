import { expect, test, type Page } from '@playwright/test';
import { STRINGS_FR } from '../packages/core/src/text/fr-CA';
import { begin, clearCards, placeOneTile, tilesLeft } from './helpers';

/**
 * A FULL DISK, IN A REAL BROWSER, ALL THE WAY TO THE SENTENCE (`PASS.md` P8.2).
 *
 * The shed ladder is the most argued-over code in `shell/storage.ts`: it exists
 * because a two-rung version shed a world while keeping its run (2026-08-20),
 * the next boot minted a fresh world, resumed the old run against it, and
 * unioned a foreign geography into somebody's ground. It is unit-tested against
 * a `localStorage` stub, and the stub is where it ends: nothing had ever filled
 * a real quota, and **the rung a real browser takes is decided by real sizes**.
 *
 * The other half is the part a player actually meets. `App.tsx` subscribes to
 * `onShed` and says one sentence per rung; `prose.pin.test.ts` pins the
 * sentences and `storage.test.ts` pins the rungs, and until now nothing joined
 * them — a registry with no listener, a listener with no speaker, or a speaker
 * behind a screen would all have passed both.
 *
 * The harness P8.2 was promised to share with P7.6 turns out to be four lines
 * of `page.evaluate`, so P7.6's deferral (measured: a world 300 runs deep is
 * 24 KB, and three worlds is 2.3% of the store) stands on its own reasoning and
 * this row did not need it.
 *
 * **Both engines.** WebKit fills its quota, climbs the same ladder and says
 * the same sentences (P6.1, 2026-09-10) — which is worth having, since the
 * store this ladder protects is a phone's.
 *
 * **`fr-CA`, deliberately.** Marc's phone is French, the catalogue is written
 * French-first, and the sentences are compared against `STRINGS_FR` itself
 * rather than retyped — so this is also the one test that proves a shed report
 * is spoken in the language the page is being read in.
 */

test.use({ viewport: { width: 390, height: 844 }, locale: 'fr-CA' });

/**
 * The diary's key, which this file has to know and `storage.ts` keeps private.
 *
 * Written out rather than imported because it is built from a private `NS` and
 * a per-key version, and exporting it so a test could read it would put a
 * storage detail in the module's public surface for one caller. The duplication
 * is safe in the only way that matters: a rename makes this file seed a key
 * nothing sheds, the ladder runs out, and the test fails on the WRONG sentence
 * rather than passing quietly.
 */
const TIMELINE_KEY = 'ashwake.timeline.v1';

/**
 * FILL THE DEVICE, DOWN TO THE LAST BYTES — and the second half is the test.
 *
 * The first version wrote 64 K-character chunks until one threw and called that
 * full. It is not: the chunk that failed leaves up to its own size in headroom,
 * and **a saved run fits in that**. The placement below wrote
 * `ashwake.run.1.v1` without a murmur, the ladder never ran, and two tests sat
 * there waiting for a sentence about a disk that still had room on it.
 *
 * So the sizes step down — 64 K, 8 K, 1 K, 128, 16, 1 character — and each size
 * is written until IT throws. What is left afterwards is smaller than one
 * character, which is the only definition of full that a test can lean on.
 *
 * Chromium's origin quota is about 5 MB of UTF-16; it is per-browser,
 * per-profile and not published to the page, so writing until it throws is the
 * only honest way to find the edge.
 */
async function fillTheDisk(page: Page): Promise<number> {
  return page.evaluate(() => {
    let written = 0;
    for (const size of [64 * 1024, 8 * 1024, 1024, 128, 16, 1]) {
      const chunk = 'x'.repeat(size);
      try {
        // Bounded so a browser with a surprisingly large quota cannot hang the
        // test rather than fail it.
        for (let n = 0; n < 4000; n++, written++) localStorage.setItem(`fill.${written}`, chunk);
      } catch {
        // This size no longer fits. Try a smaller one.
      }
    }
    return written;
  });
}

/**
 * EVERY SENTENCE THE TOAST SAYS FROM NOW ON, rather than what it says when
 * asked.
 *
 * A rung that WORKS reports once: the room is freed, the retry succeeds, and
 * the line clears on its own timer a moment later. Polling for it — which is
 * what an ordinary `toHaveText` does — caught it in one sample out of twenty
 * and missed it in the assertion that mattered, so the second test failed
 * against code that was working correctly.
 *
 * The last rung hides this: with the disk still full, every later write reports
 * `lost` again and the line is continuously refreshed, so it can be read at
 * leisure. **The outcome that is easy to observe is the one where nothing was
 * saved**, which is worth knowing about any test of this ladder.
 */
async function recordWhatIsSaid(page: Page): Promise<void> {
  await page.evaluate(() => {
    const bag = window as unknown as { __said?: string[] };
    bag.__said = [];
    const node = document.querySelector('.toast');
    if (node === null) throw new Error('no toast element to watch');
    new MutationObserver(() => {
      const text = node.textContent?.trim() ?? '';
      if (text !== '' && bag.__said?.at(-1) !== text) bag.__said?.push(text);
    }).observe(node, { childList: true, characterData: true, subtree: true });
  });
}

/** What it has said since. */
async function said(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __said?: string[] }).__said ?? []);
}

test('a device with no room left says so, and keeps playing', async ({ page }) => {
  await page.goto('/?seed=7&taught=1');
  await begin(page);
  await clearCards(page);

  const chunks = await fillTheDisk(page);
  expect(chunks, 'the quota was never reached, so nothing below is a test').toBeGreaterThan(0);
  await recordWhatIsSaid(page);

  /*
   * A placement is a write: the keeper saves the run on every state change. The
   * ladder then sheds a diagnostic record, some receipts, the diary and every
   * other world — all of them small, none of them the megabytes above — so it
   * runs out, which is the outcome that was SILENT until 2026-09-02 and the one
   * a player can act on.
   */
  await placeOneTile(page);
  await expect
    .poll(() => said(page), { message: 'a device that saved nothing said nothing' })
    .toContain(STRINGS_FR.shed.lost);

  /*
   * AND THE RUN IS STILL PLAYABLE. Losing the save is not losing the game: the
   * state lives in memory and the board goes on answering. A device that cannot
   * write must not become a device that cannot play — that would turn a lost
   * autosave into a lost evening.
   */
  const held = await tilesLeft(page);
  await placeOneTile(page);
  expect(await tilesLeft(page), 'the board stopped taking placements').toBeLessThan(held);
});

test('a rung that frees enough room says which one, and takes it', async ({ page }) => {
  await page.goto('/?seed=7&taught=1');
  await begin(page);
  await clearCards(page);

  /*
   * A DIARY BIG ENOUGH TO MATTER, which is what makes this a test of the
   * ladder rather than of its last rung. Seeded after boot so nothing decodes
   * it; 1 M characters is 2 MB of the quota, so dropping it leaves room the
   * three cheaper rungs could never have found.
   */
  await page.evaluate((key) => localStorage.setItem(key, 'x'.repeat(1024 * 1024)), TIMELINE_KEY);
  const chunks = await fillTheDisk(page);
  expect(chunks, 'the quota was never reached').toBeGreaterThan(0);
  await recordWhatIsSaid(page);

  await placeOneTile(page);
  await expect
    .poll(() => said(page), { message: 'the diary was shed and the player was not told which' })
    .toContain(STRINGS_FR.shed.timeline);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), TIMELINE_KEY),
    'the diary was reported as shed and is still there',
  ).toBeNull();
});

/**
 * AND A DEVICE THAT IS ALREADY FULL WHEN THE PAGE OPENS.
 *
 * The two tests above fill the disk mid-run, which is the tidy version. The
 * ordinary one is a phone that has been full for a week because of everybody
 * else's sites: the game is opened on it, and every write it makes — the
 * direction, the language, the features, the first save — is a throw before the
 * player has touched anything.
 *
 * What is asserted is that this is a playable game and not a failure panel.
 * Nothing in `storage.ts` may escape as an exception, because a quota error
 * that reaches the boundary is a full disk reported as *"something broke"*,
 * with the run it was trying to protect thrown away in the retelling.
 */
test('a device that was already full still opens the game', async ({ page }) => {
  await page.goto('/?seed=7&taught=1');
  await fillTheDisk(page);

  await page.reload();
  await begin(page);
  await clearCards(page);
  await expect(page.locator("[data-hud='stats']")).toBeVisible();

  const held = await tilesLeft(page);
  await placeOneTile(page);
  expect(await tilesLeft(page), 'a full device could not play at all').toBeLessThan(held);
  await expect(page.locator('#boot-failure'), 'a full disk was reported as a crash').toHaveCount(0);
});

/**
 * AND THE ONE GAP THIS ROW FOUND: A RUNG SPENT AT BOOT IS SPENT IN SILENCE.
 *
 * Fill a device, put a diary on it, and open the game: the very first write
 * runs the ladder, the diary is dropped to make room, and **the player is never
 * told** — not then, and not afterwards. The report is made the way every other
 * one is; there is simply nothing on screen to say it with. The front door has
 * no toast, and by the time the board does, the line has been delivered to a
 * listener that could not show it.
 *
 * The ladder is right, the sentence exists in both languages, and the shell
 * subscribes. What is missing is a decision about WHERE a storage message that
 * arrives before the game is on screen belongs — which is a screen question,
 * so it is written up in `NEXT.md` §1 with two options and a lean, and nothing
 * is built for it here. `CLAUDE.md`: where the answer lives on a screen, the
 * finding is the deliverable.
 *
 * This test pins today's behaviour, including the silence, so the gap cannot
 * close or widen without somebody editing the sentence above.
 */
/**
 * CHROMIUM-ONLY, AND WHAT WEBKIT DOES INSTEAD IS THE REASON (P6.1).
 *
 * Filled to the last byte the same way, WebKit's boot write SUCCEEDS: the run
 * key already exists and rewriting a value of about its own size costs nothing
 * there, so the ladder is never climbed and the diary this test seeds is still
 * on the device afterwards. The three tests above pass on both engines; this
 * one is about a write that WebKit does not make.
 *
 * Which is worth knowing rather than hiding: the gap it documents — a rung
 * spent before the game is on screen says nothing — is reachable on Chromium's
 * accounting and not on WebKit's, so whether a player meets it depends on
 * their browser's idea of what a full disk is.
 */
test('a diary shed before the game is on screen goes unmentioned', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== 'chromium',
    'WebKit rewrites the run key in place, so no rung is spent',
  );
  await page.goto('/?seed=7&taught=1');
  await begin(page);
  await page.evaluate((key) => localStorage.setItem(key, 'x'.repeat(1024 * 1024)), TIMELINE_KEY);
  await fillTheDisk(page);

  await page.reload();
  await begin(page);
  await recordWhatIsSaid(page);
  await clearCards(page);
  await placeOneTile(page);

  expect(
    await page.evaluate((key) => localStorage.getItem(key), TIMELINE_KEY),
    'the boot write did not run the ladder, so this test is about nothing',
  ).toBeNull();
  expect(
    await said(page),
    'the diary is now MENTIONED — good, and this test needs rewriting',
  ).not.toContain(STRINGS_FR.shed.timeline);
});
