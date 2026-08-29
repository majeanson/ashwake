import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, type Page } from '@playwright/test';
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
 * Every direction offered, candidates included. A screen is only as good as
 * its worst one, and a direction nobody audits is a direction whose chrome
 * nobody has looked at — which is how a candidate gets chosen on the strength
 * of its BOARD and then ships with an unreadable settings panel.
 */
const DIRECTIONS = ['torchlit', 'daylight', 'torchlit-bright', 'settlement'] as const;

/**
 * A device with history, so the screens that only exist once you have played
 * are not photographed empty.
 *
 * `?end=1` plays a whole deterministic run and banks it, which is what fills
 * the shop, the hall of fame and the diary. `?taught=1` is a device that has
 * met every lesson — without it, most of these are pictures of a teaching card.
 */
const PLAYED = 'taught=1&end=1&seed=7';
const FRESH = 'taught=1&seed=7';

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

/** Through MORE, which is where everything that is not the run lives. */
const viaMore = (go: string) => async (page: Page) => {
  await page.locator('[data-door="more"]').click();
  await page.locator(`[data-go="${go}"]`).click();
};

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
 */
const report: { screen: string; direction: string; finding: Finding }[] = [];

for (const direction of DIRECTIONS) {
  for (const screen of SCREENS) {
    test(`${direction} · ${screen.name}`, async ({ page }) => {
      await page.goto(`/?theme=${direction}&${screen.query}`);
      await page.locator('canvas').waitFor({ state: 'attached' });
      await screen.reach(page);
      // The board draws on demand and the font has to land: a screen shot
      // before either is a picture of neither.
      await page.waitForTimeout(700);

      const dir = join(OUT, direction);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, `${screen.name}.png`), await page.screenshot({ fullPage: false }));

      for (const finding of await page.evaluate(AUDIT_IN_PAGE)) {
        report.push({ screen: screen.name, direction, finding });
      }
    });
  }
}

test.afterAll(async () => {
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
    `${rows.length} findings across ${SCREENS.length} screens × ${DIRECTIONS.length} directions,`,
    'at 390×844. Bars: 4.5:1 for text, 3:1 for marks, 44px for a tap target,',
    'no horizontal page scroll, no clipped text.',
    '',
    'This is a report, not a gate. A number here is a thing to look at in the',
    'shot beside it — `audit-shots/<direction>/<screen>.png`.',
    '',
    ...[...counts].map(([kind, n]) => `- **${kind}** — ${n}`),
    '',
    '| screen | direction | kind | where | text | measured | bar | detail |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| ${r.screen} | ${r.direction} | ${r.finding.kind} | \`${r.finding.where}\` | ${r.finding.text.replace(/\|/g, '\\|')} | ${r.finding.value} | ${r.finding.bar} | ${r.finding.detail} |`,
    ),
    '',
  ];

  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, 'report.md'), lines.join('\n'));
  console.log(`\naudit: ${rows.length} findings → audit-shots/report.md`);
});
