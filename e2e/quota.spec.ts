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
 * The ladder's FIRST rung, which the tests below have to be able to empty.
 *
 * Same reasoning as the diary's key above, and one more: a rung that frees
 * something is a rung the ladder can stop on, so a test about a LATER rung has
 * to know this one's name to make sure it frees nothing.
 */
const ERROR_KEY = 'ashwake.error.v1';

/**
 * HOW BIG THE DIARY IS, NEVER WHAT IT SAYS — and this is a hang, not a tidy-up.
 *
 * The two tests below seed a diary of a million characters and then assert it
 * is GONE. Written as `expect(getItem(TIMELINE_KEY)).toBeNull()` that reads
 * well and fails catastrophically: a failure message carries the received
 * value, so one failing run writes a single 1,048,576-character line to
 * stdout.
 *
 * On 2026-09-11 the Actions runner would not take it. `pnpm test:e2e` printed
 * all 134 of its results at 22:57:00, reached that line, and **did not exit
 * until 00:06:05** — sixty-nine minutes with the pipe blocked, no summary, no
 * counts, and a log that ends mid-report on `expect(received).toBeNull()`. No
 * other line in the whole 167 KB log is over 400 characters. The two runs
 * either side of it failed on WebKit, whose messages are short, and finished
 * in eleven minutes each.
 *
 * So the claim travels as a NUMBER. `null` still means shed, and what these
 * two tests prove is unchanged; what they can no longer do is print the diary.
 * It is also the better witness — `1048576` says the diary is WHOLE and the
 * ladder never ran at all, where a truncated wall of `x` says neither.
 *
 * *An assertion's message is written to a pipe somebody else has to drain.*
 */
const diaryLength = (page: Page): Promise<number | null> =>
  page.evaluate((key) => localStorage.getItem(key)?.length ?? null, TIMELINE_KEY);

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
  try {
    await expect
      .poll(() => said(page), { message: 'the diary was shed and the player was not told which' })
      .toContain(STRINGS_FR.shed.timeline);
  } catch (e) {
    /*
     * WHAT TWO FAILURES DID NOT LEAVE BEHIND (2026-09-11). This test failed in
     * two full WebKit runs and passed in the next two, three of three alone,
     * and with its file alone — always as a toast that said NOTHING in five
     * seconds after a placement that landed. Nothing in `said` means nothing
     * to read, so on the next failure this prints every non-fill storage key
     * with its size, the last-error record (the ladder's first rung) and the
     * toast's live text. `NEXT.md` §2 carries the entry; delete both when the
     * flake has been explained or has not recurred in a week.
     */
    /*
     * AND THE DIAGNOSTIC HAD NEVER ONCE PRINTED (2026-09-14). `ERROR_KEY` is a
     * constant of this FILE, and this function runs in the BROWSER — so the
     * one time the flake fired on CI with this in place, the line that
     * `NEXT.md` §0 says to read before anything else was
     * `ReferenceError: Can't find variable: ERROR_KEY`. A diagnostic that
     * throws on its own failure path is worse than none, because it looks
     * like one. The key travels in as an argument now, the way `TIMELINE_KEY`
     * does everywhere else in this file.
     */
    const diag = await page.evaluate((errorKey) => {
      const out: Record<string, number | string | null> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i) ?? '';
        if (!k.startsWith('fill.')) out[k] = localStorage.getItem(k)?.length ?? null;
      }
      // Its FIRST 200 characters, for the reason `diaryLength` above is a
      // number: this record is a stack trace, rung one frees "a few tens of
      // kilobytes" of it, and `JSON.stringify` puts all of that on one line.
      out.__error = localStorage.getItem(errorKey)?.slice(0, 200) ?? null;
      out.__errorLength = localStorage.getItem(errorKey)?.length ?? null;
      out.__toast = document.querySelector('.toast')?.textContent ?? null;
      return out;
    }, ERROR_KEY);
    throw new Error(`DIAG ${JSON.stringify(diag)}\n${String(e)}`, { cause: e });
  }
  expect(
    await diaryLength(page),
    'the diary was reported as shed and is still there, at this many characters',
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
 * A RUNG SPENT AT BOOT IS SAID AT THE FIRST BOARD FRAME — BUILT, AND NOT
 * PROVABLE HERE (2026-09-13, `PASS.md` P8.2).
 *
 * Fill a device, put a diary on it, and open the game: the very first write
 * runs the ladder and the diary is dropped to make room. For four stages the
 * player was never told. **Marc ruled: hold it until the first board frame** —
 * not the front door, because a stranger's first minute is the thing this
 * repository protects hardest and a diary nobody has written yet cannot be
 * missed there. `storage.ts` keeps a report that cannot be shown (`holdShed` /
 * `takeHeldSheds`), `App` spends it through `speakAfter` when `started` turns
 * true, and `shell/shed.test.ts` pins all four cases.
 *
 * ## AND THIS TEST WAS NEVER TESTING WHAT IT SAID
 *
 * It seeded a megabyte as the diary, filled the disk, reloaded, and asserted
 * the diary was gone — reading that as *the ladder shed it*. It is not. **A
 * Chromium store that is at quota loses a seeded value across a reload whether
 * or not this game is running at all.** Measured, five ways, on this machine:
 *
 *   - a 1 MB diary with the disk NOT filled survives the reload;
 *   - the same diary with the disk filled is gone;
 *   - **a 2 KB diary with the disk filled is also gone** — so it is not size;
 *   - written AFTER the fill, into room made for it, and topped back up: gone;
 *     written after the fill and NOT topped back up: survives. So it is the
 *     store being at quota across the reload, and nothing else;
 *   - and with **every script aborted by `page.route`**, so that not one line
 *     of this game runs: still gone.
 *
 * The last of those is the whole argument. The game is not shedding it and the
 * game is not losing it; the browser is. So `toBeNull()` passed for the wrong
 * reason on this machine, and on the Linux runner — where the value survives —
 * the same line reported `Received: 1048576` and went red three pushes running
 * while everyone read it as a flake.
 *
 * **What that costs, stated rather than hidden:** there is no end-to-end proof
 * that the held sentence reaches a real screen. The pen and the drain are unit
 * tested; the joining of them is not, and this is the one gap in this file's
 * opening claim that nothing had ever filled a real quota. It cannot be closed
 * by trying harder — a diary that survives to the reload is a diary on a device
 * with headroom, and a device with headroom spends no rung. The two conditions
 * this test needs are mutually exclusive in Chromium.
 *
 * `NEXT.md` §1 carries it as a line for Session A: on a genuinely full phone,
 * does the strip say the diary is gone once the board is up? That is a real
 * device answering a question a harness cannot.
 *
 * *A test whose precondition the browser can quietly refuse is a test that
 * reports on the browser.*
 */
test.skip('a diary shed before the game is on screen is said at the board', () => {
  // Deliberately a body-less skip: there is no arrangement of `localStorage`
  // that stages this in Chromium, so there is nothing here to repair when
  // somebody comes back to it. The measurements are above and the behaviour
  // is pinned in `shell/shed.test.ts`.
});
