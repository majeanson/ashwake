import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { AUDIT_IN_PAGE, type Finding } from './audit';

/**
 * Every screen, in every direction, photographed and measured (Stage 4,
 * 2026-08-29).
 *
 * Owed since the chrome was built. Ashwake 1's own verdict on the equivalent
 * gap was blunt — *"nothing visual is tested by this repository"* — and it only
 * paid the debt in its final week. This body pays it beside the screens.
 *
 * **It is not a gate, and that is the design.** It produces pictures to look at
 * and a table of measurements to read; it has its own config and its own
 * `*.audit.ts` suffix, so `pnpm test:e2e` cannot see it and no deploy waits on
 * it. A run that finds thirty things is a run that did its job.
 *
 * Deliberately not a pixel diff: baselines differ between this machine and
 * CI's renderer, and a picture that CHANGED tells you nothing about whether it
 * changed for the better. Every finding is a number with a published bar
 * beside it.
 *
 * `../tiles/audit-shots/` holds the same set for Ashwake 1, which is what makes
 * these comparable rather than merely present.
 */

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'audit-shots');

/**
 * Every direction offered (D12, 2026-09-03: two, not four — `torchlit`,
 * `torchlit-bright` and `placeholder` are retired; `daylight` is settlement's
 * own names reskinned bright). A screen is only as good as its worst
 * direction, and a direction nobody audits is a direction whose chrome nobody
 * has looked at — which is how a candidate gets chosen on the strength of its
 * BOARD and then ships with an unreadable settings panel.
 */
const DIRECTIONS = ['settlement', 'daylight'] as const;

/**
 * A device with history, so the screens that only exist once you have played
 * are not photographed empty.
 *
 * `?end=1` plays a whole deterministic run and banks it, which is what fills
 * the shop, the hall of fame and the diary. `?taught=1` is a device that has
 * met every lesson — without it, most of these are pictures of a teaching card.
 *
 * **The third axis, 2026-08-30.** Both of the above are facts about a SESSION.
 * `?runs=n` is a fact about a DEVICE — a world with shrines woken, territories
 * held, finds taken, relics banked, a shop part-built and a diary with rows
 * (`shell/fixture.ts`). Two ages of the SAME world seed, so the pair is a
 * before and an after rather than two unrelated places. This is the axis
 * `NEXT.md` §3 has asked for since it was written, and the instrument that
 * would have caught both of 2026-08-30's bugs at a glance: a three-hundred-run
 * world showing `0` relics is not subtle.
 */
/**
 * `PLAYED` used to be `taught=1&end=1&seed=7`, and it stopped being played on
 * 2026-08-30 without anybody noticing.
 *
 * `?seed=` is a DETOUR since the world seed was fixed that morning — a run on
 * somebody else's geography, which is correct and which by design banks
 * nothing. So this device finished a run and stayed VIRGIN, `More` hides SHOP
 * and FAME on a virgin device, and three tests sat on a click that could never
 * land until the 180-second timeout. They then kept their previous run's
 * screenshots, so the report looked complete and three of its pictures were a
 * day old.
 *
 * The eighth of this body's signature miss, and the first one found in the
 * instrument rather than in the game — which is the argument for the
 * instrument having tests of its own. The seed comes from `?runs=1` now: a
 * device one run deep, on a FIXED world seed, so the run banks AND the picture
 * is the same picture twice.
 */
const PLAYED = 'taught=1&end=1&runs=1';
const FRESH = 'taught=1&seed=7';
const FIVE = 'taught=1&runs=5';
const THIRTY = 'taught=1&runs=30';
const MANY = 'taught=1&runs=300';

/**
 * THE FIRST MINUTE — the one age of this game the instrument could not see
 * (2026-09-02).
 *
 * `FRESH` is the same seed with `taught=1` on it, and the docblock above says
 * exactly why that flag exists: *"without it, most of these are pictures of a
 * teaching card."* True, and it means **every fixture in this file is a device
 * that has already learned the game.** Twenty-nine screens × four directions,
 * and not one of them is what a stranger sees.
 *
 * That is the `PLAYTEST.md` Session C gate. It is also the one part of this
 * game a player cannot get back to: the teaching drip runs once per device,
 * over the first few placements, and it is the whole of somebody's first
 * impression. A screen nobody has photographed is a screen nobody has looked
 * at — that is this instrument's own argument, and the argument had a hole in
 * it exactly where it mattered most.
 *
 * The same seed as `FRESH`, so the teaching shots and the taught shots are the
 * same board with and without the lessons on it.
 */
const NEW = 'seed=7';

type Screen = {
  readonly name: string;
  /** Query on top of the history this screen needs. */
  readonly query: string;
  /** Get from the boot state to the screen. Some screens ARE the boot state. */
  readonly reach: (page: Page) => Promise<void>;
};

/** The boot state IS the screen — the front door needs no navigating to. */
const alreadyThere = (): Promise<void> => Promise.resolve();

const open = (selector: string) => async (page: Page) => {
  await page.locator(selector).click();
};

/**
 * Open the manual and LAND on one of its tabs (2026-09-03).
 *
 * The click alone is flaky, and this is the third time it has bitten: the tab
 * row scrolls horizontally at 390 and `data-grows` changes the tabs' widths
 * between one device and another, so a click can be dispatched at a row that
 * re-lays-out underneath it. It cost `menus.spec.ts` a red run roughly one time
 * in three, and it failed one screen of a 183-screen audit — which, because a
 * partial run no longer writes, cost the whole report.
 *
 * Polled rather than waited on: a click that landed on the wrong tab is not a
 * click that will come good on its own. The tab's own `aria-selected` is the
 * only honest statement that the screen being photographed is the screen this
 * function asked for.
 */
const viaTab = (tab: string) => async (page: Page) => {
  await page.locator('[data-door="how"]').click();
  const wanted = page.locator(`[data-tab="${tab}"]`);
  await expect
    .poll(async () => {
      if ((await wanted.getAttribute('aria-selected')) !== 'true') await wanted.click();
      return wanted.getAttribute('aria-selected');
    })
    .toBe('true');
};

/** Through MORE, which is where everything that is not the run lives. */
const viaMore = (go: string) => async (page: Page) => {
  await page.locator('[data-door="more"]').click();
  await page.locator(`[data-go="${go}"]`).click();
};

/** MENU, on the board, and the short list under it. */
const viaQuick = async (page: Page): Promise<void> => {
  await page.locator('[data-go="quick"]').click();
  await page.locator('[data-hud="quick"]').waitFor({ state: 'visible' });
};

/**
 * Wait for whatever the game is teaching, and photograph it standing.
 *
 * The opposite of `e2e/helpers.ts`'s `clearCards`, and for the opposite
 * reason: every gate in this repo dismisses the teaching to get at the board
 * behind it, which is why nothing has ever had a picture of the teaching.
 */
const teaching = async (page: Page): Promise<void> => {
  await page.locator('.card-scrim').first().waitFor({ state: 'visible' });
};

/** The board draws on demand and eases into its fit; the keyboard's marker
 *  rides the same camera. A key pressed before either has landed is a key
 *  pressed at a board that is still arriving. */
const settle = (page: Page): Promise<void> => page.waitForTimeout(600);

const SCREENS: readonly Screen[] = [
  { name: 'front-door', query: FRESH, reach: alreadyThere },
  { name: 'front-door-returning', query: `${FRESH}&place=12`, reach: alreadyThere },
  { name: 'board', query: `${FRESH}&place=12`, reach: begin },
  { name: 'board-grown', query: `${FRESH}&place=40`, reach: begin },
  {
    name: 'purse',
    query: `${FRESH}&place=12`,
    reach: async (page) => {
      await begin(page);
      await page.locator('[data-action="purse"]').click();
    },
  },
  { name: 'manual', query: FRESH, reach: open('[data-door="how"]') },
  /*
   * The manual's CONTENT, not just its front tab (2026-08-30).
   *
   * `manual` opens on MENU, which is three buttons, so the audit had eighty-odd
   * pictures of this game and not one of the page that teaches it. The two tabs
   * below are where every rule, every figure and the whole legend live, and
   * they are the longest prose in the build: the places a clipped line or an
   * unreadable note would actually happen.
   */
  { name: 'manual-play', query: FRESH, reach: viaTab('play') },
  { name: 'manual-expedition', query: FRESH, reach: viaTab('start') },
  { name: 'manual-hand', query: FRESH, reach: viaTab('hand') },
  { name: 'settings', query: FRESH, reach: open('[data-door="settings"]') },
  { name: 'more', query: FRESH, reach: open('[data-door="more"]') },
  { name: 'more-played', query: PLAYED, reach: viaMore('shop') },
  { name: 'worlds', query: FRESH, reach: viaMore('worlds') },
  { name: 'shop', query: PLAYED, reach: viaMore('shop') },
  { name: 'fame', query: PLAYED, reach: viaMore('fame') },
  { name: 'end', query: PLAYED, reach: begin },
  {
    name: 'end-payout-open',
    query: PLAYED,
    reach: async (page) => {
      await begin(page);
      await page.locator('[data-hud="end"] summary').first().click();
    },
  },

  /*
   * SIX SURFACES THAT HAD NEVER BEEN PHOTOGRAPHED (2026-09-02).
   *
   * Found by walking the `data-*` registry against this list rather than by
   * reading the list — the same move that has found everything else in this
   * body. Each is reachable with the helpers that were already here, which is
   * the point: they were not missing because they were hard.
   *
   * The ATLAS is deliberately absent from this block and is NOT a gap — it
   * renders inside the WORLDS panel, so `worlds`, `worlds-five`,
   * `worlds-thirty` and `worlds-many` have been photographing it all along.
   * Checked, not assumed.
   */
  {
    name: 'quick',
    query: FRESH,
    reach: async (page) => {
      await begin(page);
      await viaQuick(page);
    },
  },
  { name: 'device', query: PLAYED, reach: viaMore('device') },
  { name: 'daily', query: FRESH, reach: open('[data-door="daily"]') },
  /* The `?themes=1` picker, which is a debug surface that pins itself to the
     same corner MENU uses — the one overlap `ui.css` admits to and nothing has
     ever looked at. It is over the BOARD, not inside SETTINGS. */
  { name: 'directions', query: `${FRESH}&themes=1&place=12`, reach: begin },
  /*
   * A lens lit. Right-click IS the gesture — see `ui/Tile`'s `onContextMenu`,
   * which is the long press on a phone — so this is the real door and not a
   * test-only one.
   */
  {
    name: 'board-lens',
    query: `${FRESH}&place=12`,
    reach: async (page) => {
      await begin(page);
      await page.locator('.tile').first().click({ button: 'right' });
      await page.locator('[data-action="lens-off"]').waitFor({ state: 'visible' });
    },
  },
  /*
   * The ROUTINE pop line — the tappable receipt over the board, which is what
   * every pop after the first one looks like.
   *
   * `FIVE` rather than `FRESH`, and that is load-bearing: the first pop of the
   * first run on a device is a CARD, not this line (see `first` in `App`), so
   * a fresh device can only ever photograph the exception. A world five runs
   * deep has banked a harvest, so this is the line a player actually lives
   * with.
   */
  {
    name: 'pop-line',
    // `place=24`, not 12: twelve placements is not reliably a ripe pocket, and
    // a screen that depends on one has to open on a board that HAS one.
    // `e2e/targets.spec.ts` reaches the same line from the same opening.
    query: `${FIVE}&place=24`,
    reach: async (page) => {
      await begin(page);
      await settle(page);
      // By its WORD, in either language — `data-action` starts `pop` on four
      // buttons and one of them is SACRIFICE.
      await page
        .getByRole('button', { name: /POP|RÉCOLT/ })
        .first()
        .click();
      await page.locator('[data-action="pop-details"]').waitFor({ state: 'visible' });
    },
  },

  /*
   * THE TEACHING DRIP — see `NEW`.
   *
   * Three moments, because the drip is not one card: the door a stranger opens
   * on, the first thing the board says, and the lesson that arrives after the
   * first placement — which is the first time this game asks somebody to
   * understand something while they are holding it.
   *
   * The placement is made with the KEYBOARD, which is the only door into the
   * board that is not a canvas coordinate: Enter summons the marker at home,
   * an arrow steps it onto a legal neighbour, Enter spends the card. Exactly
   * what `e2e/keyboard.spec.ts` does, for the same reason.
   */
  { name: 'teaching-door', query: NEW, reach: alreadyThere },
  /*
   * The board a stranger arrives on, before it has said anything.
   *
   * Written first as `teaching-first`, waiting for a card — and there is no
   * card here, which is itself the finding: **the drip fires on ACTIONS, not
   * on arrival**, so the first thing a stranger sees after BEGIN is an empty
   * board with no instruction on it at all. That is a screen worth having a
   * picture of, and it is not the picture the name promised.
   */
  {
    name: 'teaching-board',
    query: NEW,
    reach: async (page) => {
      await begin(page);
      await settle(page);
    },
  },
  {
    name: 'teaching-placed',
    query: NEW,
    reach: async (page) => {
      await begin(page);
      await settle(page);
      // The first press only SUMMONS the marker, at home — see
      // `e2e/keyboard.spec.ts`. Everything after it steps and places.
      await page.keyboard.press('Enter');
      // PLAY UNTIL IT TEACHES. Which placement first says something is a
      // property of the board and of the drip, not a number this file gets to
      // assume: writing `place one tile` made this pass in one direction out
      // of four, which is a fixture that photographs a different moment
      // depending on the geography.
      for (let i = 0; i < 10; i++) {
        if ((await page.locator('.card-scrim').count()) > 0) break;
        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(120);
      }
      await teaching(page);
    },
  },

  /*
   * FIVE RUNS IN, THIRTY, and THREE HUNDRED — one world at three ages.
   *
   * These are the rows to read against each other. A screen that looks the
   * same in all three is a screen showing nothing the player earned, which is
   * exactly the failure mode the roguelite spent two sessions in.
   *
   * THIRTY is the middle on purpose and not a convenience: it is the only age
   * at which the shop has rows on both sides of the affordable line. Five is
   * a shop nobody can shop in, three hundred is a ladder already finished, and
   * from a distance those two pictures look the same as each other AND the
   * same as a purse that never earned anything.
   */
  { name: 'front-door-many', query: MANY, reach: alreadyThere },
  { name: 'worlds-five', query: FIVE, reach: viaMore('worlds') },
  { name: 'worlds-thirty', query: THIRTY, reach: viaMore('worlds') },
  { name: 'worlds-many', query: MANY, reach: viaMore('worlds') },
  { name: 'shop-thirty', query: THIRTY, reach: viaMore('shop') },
  { name: 'shop-many', query: MANY, reach: viaMore('shop') },
  { name: 'fame-thirty', query: THIRTY, reach: viaMore('fame') },
  { name: 'board-thirty', query: THIRTY, reach: begin },
  { name: 'end-many', query: `${MANY}&end=1`, reach: begin },
];

/** BEGIN, and wait for the door to leave. */
async function begin(page: Page): Promise<void> {
  const door = page.locator('[data-door="begin"]');
  await door.click();
  await door.waitFor({ state: 'detached' });
}

test.use({ viewport: { width: 390, height: 844 } });

/**
 * One row per finding, gathered across every test and written once at the end.
 *
 * A module-level array is why this config runs ONE worker: parallel workers are
 * separate processes, and each would write a third of the report over the other
 * two.
 *
 * `pass` is what the row was measured under — a direction at 390 in the phone's
 * own language, or one of the two passes below. It is a column rather than a
 * suffix on `direction` because a French clipping and a settlement contrast
 * failure are different findings and want to be sortable apart.
 */
const report: { screen: string; direction: string; pass: string; finding: Finding }[] = [];

/**
 * Photograph one screen and collect what it fails.
 *
 * The folder is the pass, not the direction: three passes writing
 * `settlement/board.png` would each be a picture of the last one to run.
 */
async function shoot(
  page: Page,
  screen: Screen,
  direction: string,
  pass: string,
  folder: string,
): Promise<void> {
  await page.goto(`/?theme=${direction}&${screen.query}`);
  await page.locator('canvas').waitFor({ state: 'attached' });
  await screen.reach(page);
  // The board draws on demand and the font has to land: a screen shot
  // before either is a picture of neither.
  await page.waitForTimeout(700);

  const dir = join(OUT, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${screen.name}.png`), await page.screenshot({ fullPage: false }));

  visited += 1;
  for (const finding of await page.evaluate(AUDIT_IN_PAGE)) {
    report.push({ screen: screen.name, direction, pass, finding });
  }
}

for (const direction of DIRECTIONS) {
  for (const screen of SCREENS) {
    test(`${direction} · ${screen.name}`, async ({ page }) => {
      await shoot(page, screen, direction, '390', direction);
    });
  }
}

/**
 * THE SHIPPING LANGUAGE (2026-09-02).
 *
 * `index.html` says `lang="fr-CA"`, the manifest ships `fr-CA`, and D4 makes
 * French the first catalogue and the fallback for a device that speaks neither
 * — **so French is what this game is by default**, and every shot in this
 * folder until today was English. Playwright's default locale is `en-US`, the
 * app reads `navigator.languages` (`shell/locale.ts`), and nobody set it.
 *
 * That matters here more than anywhere else, because French is the LONG
 * language: RÉCOLTER against POP, SACRIFIER against BURN, NOUVELLE PARTIE
 * against NEW RUN — roughly a fifth longer through the whole catalogue. Every
 * clipped-text and horizontal-scroll bar this instrument measures has only
 * ever been measured against the short one.
 *
 * One direction rather than four. The question a French pass asks is about
 * SENTENCE LENGTH, and a sentence is the same length in every direction; four
 * of them would be the same finding four times. Settlement because it is
 * `DEFAULT_THEME_ID` — the direction a player who changes nothing is in.
 */
test.describe('fr-CA', () => {
  test.use({ locale: 'fr-CA' });
  for (const screen of SCREENS) {
    test(`fr-CA · ${screen.name}`, async ({ page }) => {
      await shoot(page, screen, 'settlement', 'fr-CA', 'fr-CA');
    });
  }
});

/**
 * THE SMALLEST PHONE STILL SOLD (2026-09-02).
 *
 * 320×568 is the iPhone SE's CSS viewport and the floor this chrome has always
 * claimed to hold. `STATUS.md` records measurements taken there **by hand**,
 * once, and nothing has held them since — a number checked once and never
 * pinned is a number that is true on the day it was written.
 *
 * The board and the action bar rather than all of them: at this width the
 * failure mode is a ROW that cannot fit its own contents, and every row this
 * game has that can overflow is on one of these screens. The panels are a
 * scrolling column of full-width blocks and they narrow honestly.
 *
 * In French, because a narrow screen and a long language are the same bug
 * arriving from two directions, and the cheapest way to find it is both at
 * once.
 */
/*
 * The screens whose ROWS can overflow at 320. The board and the hand were the
 * original six; `worlds` and `worlds-many` joined on 2026-09-03, because
 * replacing the reach arrow with a word (B7.42) made that row longer and
 * nothing was measuring it — a change argued from one rule that could break
 * another, with no instrument pointed at it.
 */
const NARROW = [
  'board',
  'board-grown',
  'purse',
  'pop-line',
  'quick',
  'teaching-placed',
  'worlds',
  'worlds-many',
] as const;

test.describe('320', () => {
  test.use({ viewport: { width: 320, height: 568 }, locale: 'fr-CA' });
  for (const screen of SCREENS.filter((s) => (NARROW as readonly string[]).includes(s.name))) {
    test(`320 · ${screen.name}`, async ({ page }) => {
      await shoot(page, screen, 'settlement', '320', '320');
    });
  }
});

/**
 * How many screen-visits actually happened, so a PARTIAL run cannot pass
 * itself off as the record (2026-09-02).
 *
 * `afterAll` writes `report.md` unconditionally, and Playwright runs it after
 * a filtered run exactly as after a whole one — so
 * `playwright test -g "torchlit · teaching-first"`, one test, silently
 * replaced the entire report with an empty table. It did, this session. The
 * committed record of what this game's screens measure was overwritten by a
 * debugging command, and nothing said so.
 *
 * The count is what makes it visible: a header saying `4 of 216` is a report
 * that admits what it is, and a run that gathered nothing does not overwrite
 * a run that gathered something.
 */
let visited = 0;

test.afterAll(async () => {
  const expected = DIRECTIONS.length * SCREENS.length + SCREENS.length + NARROW.length;
  /*
   * ONLY A WHOLE RUN WRITES THE RECORD (tightened 2026-09-03).
   *
   * The first version of this guard refused to write only when NOTHING had
   * been visited, on the reasoning that an empty run must not erase a full
   * one. Too weak, and it was proved too weak the next day: a two-screen
   * `-g` run to measure one thing replaced 265 findings with a table of two,
   * under a header honestly saying `2 of 183` — self-describing, and the good
   * data gone anyway.
   *
   * A report is a RECORD, and a partial run is not one. It says what it found
   * on stdout, which is what somebody debugging a single screen actually
   * wanted, and leaves the file for the run that measured everything.
   */
  if (visited < expected) {
    console.log(
      `\naudit: ${visited} of ${expected} screens visited — ` +
        `${report.length} findings, report.md left alone (a partial run is not the record)`,
    );
    return;
  }

  // Sorted by how badly each finding misses its own bar, so the top of the
  // table is the thing worth fixing first rather than the first screen visited.
  const rows = [...report].sort(
    (a, b) => b.finding.bar - b.finding.value - (a.finding.bar - a.finding.value),
  );

  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.finding.kind, (counts.get(row.finding.kind) ?? 0) + 1);

  const lines = [
    '# Screen audit',
    '',
    `${rows.length} findings across ${visited} of ${expected} screen-visits:`,
    `${SCREENS.length} screens × ${DIRECTIONS.length} directions at 390×844,`,
    `the same ${SCREENS.length} again in fr-CA, and ${NARROW.length} of them at 320×568.`,
    '',
    'Bars: 4.5:1 for text, 3:1 for marks, 44px for a tap target,',
    'no horizontal page scroll, no clipped text.',
    '',
    'This is a report, not a gate. A number here is a thing to look at in the',
    'shot beside it — `audit-shots/<pass>/<screen>.png`, where a pass is a',
    'direction, `fr-CA`, or `320`.',
    '',
    ...[...counts].map(([kind, n]) => `- **${kind}** — ${n}`),
    '',
    '| screen | pass | direction | kind | where | text | measured | bar | detail |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| ${r.screen} | ${r.pass} | ${r.direction} | ${r.finding.kind} | \`${r.finding.where}\` | ${r.finding.text.replace(/\|/g, '\\|')} | ${r.finding.value} | ${r.finding.bar} | ${r.finding.detail} |`,
    ),
    '',
  ];

  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, 'report.md'), lines.join('\n'));
  console.log(
    `\naudit: ${rows.length} findings over ${visited}/${expected} visits → audit-shots/report.md`,
  );
});
