import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { begin, boardDrawn, clearCards, placeOneTile } from '../helpers';

/**
 * WHAT THIS BOARD COSTS, ONE SETTING AT A TIME (`PASS.md` P5).
 *
 * `IMPROVEMENTS.md` B4.16 shipped two low-end defaults nobody had measured —
 * cap the pixel ratio at 1.5 on a dense screen, and drop MSAA above ratio 2 —
 * from a session that could not see a phone. Half of that has since been
 * answered by LOOKING (`board/quality.ts`, 2026-09-05: Marc picked the phone's
 * own ratio on the device, and the cap is gone). The other half is still a
 * guess, and it cannot become a dial: antialiasing is a WebGL context flag,
 * fixed when the canvas is created, and the canvas may never remount.
 *
 * **The numbers here are RELATIVE and that is the whole design.** A desktop
 * runner draws through a software path that is not a phone's, so an absolute
 * frame time would read like a measurement and not be one — B8.6's argument
 * against running the screen audit in CI, and it applies double to this. What
 * a runner CAN say honestly is *the same board, the same walk, one setting
 * changed*: twice the pixels costs this much more work; a CPU six times slower
 * spends this much longer on the first frame.
 *
 * A report somebody reads, not a gate (B8.6's ruling), so it lives with the
 * screen audit rather than in `pnpm test:e2e`.
 *
 * ## The axes, and why the two are tangled
 *
 * `deviceScaleFactor` 2 and 3, at CPU throttle 1×, 4× and 6×. Ratio 3 is a
 * current phone and 2 is the one before it; 6× is roughly a five-year-old
 * mid-range phone against this laptop.
 *
 * **Ratio also decides MSAA**, because `Board.tsx`'s `DENSE` reads
 * `devicePixelRatio > 2` — so the ratio-3 rows are drawing 2.25× the fragments
 * of the ratio-2 rows AND drawing them without antialiasing. That is not a
 * flaw in the instrument, it is the shape of the decision being graded: the
 * two defaults are one constant, and nothing can separate them without a
 * second context. Said plainly in the report rather than averaged away.
 */

const PERF = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'perf');

/** The board every row measures: one seed, one opening, twelve tiles down. */
const BOARD = '/?seed=7&taught=1&place=12&tilt=35&light=1&materials=1';

const THROTTLES = [1, 4, 6] as const;
const RATIOS = [2, 3] as const;

/** Phases per cell: boot, first board, the walk, the same walk with the MSAA
 *  default flipped, idle, idle without motion, and the blank-page control. */
const PHASES = 7;

/** How many placements the walk makes — enough to pay for several redraws. */
const WALK_TILES = 5;

/** What one phase cost, in the units a runner can honestly report. */
type Phase = {
  readonly ratio: number;
  readonly throttle: number;
  readonly phase: string;
  /** Wall clock, which throttling stretches and a player feels. */
  readonly wallMs: number;
  /** Main-thread task time — the number that is actually about the work. */
  readonly cpuMs: number;
  /** Of that, time inside script rather than layout, style or paint. */
  readonly scriptMs: number;
};

/*
 * NO FRAME COUNT, and the first version of this file had one.
 *
 * Chromium's `Performance.getMetrics` reports a `Frames` counter and it is not
 * the number of frames this page drew: the column came back as 4, then −3,
 * then 0, for phases that plainly drew. A negative frame count is a metric
 * being read wrong, and a table that prints one teaches its reader to distrust
 * the columns that ARE right. Three's own `info.render.frame` is the honest
 * source and it is not reachable from the page, so the count is simply not
 * claimed.
 */

const rows: Phase[] = [];

/** Chromium's own counters, by name. */
async function metrics(cdp: CDPSession): Promise<Record<string, number>> {
  const got = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(got.metrics.map((m) => [m.name, m.value]));
}

/**
 * Measure one phase: take the counters, do the thing, take them again.
 *
 * Durations come back in SECONDS and are reported in milliseconds, which is
 * the one unit slip in this file worth naming — a table of "0.184" that turns
 * out to be seconds reads as a fast phase rather than a slow one.
 */
async function phase(
  cdp: CDPSession,
  label: string,
  ratio: number,
  throttle: number,
  work: () => Promise<void>,
): Promise<void> {
  const before = await metrics(cdp);
  const began = Date.now();
  await work();
  const after = await metrics(cdp);
  rows.push({
    ratio,
    throttle,
    phase: label,
    wallMs: Date.now() - began,
    cpuMs: Math.round(((after['TaskDuration'] ?? 0) - (before['TaskDuration'] ?? 0)) * 1000),
    scriptMs: Math.round(((after['ScriptDuration'] ?? 0) - (before['ScriptDuration'] ?? 0)) * 1000),
  });
}

/** A CDP session with the counters on and the CPU slowed to `rate`. */
async function throttled(page: Page, rate: number): Promise<CDPSession> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  return cdp;
}

for (const ratio of RATIOS) {
  test.describe(`at device pixel ratio ${ratio}`, () => {
    test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: ratio });

    for (const throttle of THROTTLES) {
      test(`ratio ${ratio} · cpu ${throttle}x`, async ({ page }) => {
        const cdp = await throttled(page, throttle);

        // BOOT: nothing but the front door, which is what a stranger waits for.
        await phase(cdp, 'boot to the door', ratio, throttle, async () => {
          await page.goto(BOARD);
          await expect(page.locator('[data-door="begin"]')).toBeVisible();
        });

        /*
         * THE FIRST BOARD — P5.5, and the number P6.1 already made famous:
         * 95 ms on Chromium against 2,597 ms on WebKit at 1×. This is where
         * the `Board` chunk is parsed, the shaders are compiled and the first
         * instanced draw happens, all at once, on a CPU that may be six times
         * slower than the one measuring it.
         */
        await phase(cdp, 'BEGIN to a drawn board', ratio, throttle, async () => {
          await begin(page);
          await boardDrawn(page, 60_000);
        });

        await clearCards(page);

        // THE WALK: placements, which is the loop a player is in.
        await phase(cdp, `${WALK_TILES} placements`, ratio, throttle, async () => {
          for (let i = 0; i < WALK_TILES; i++) await placeOneTile(page);
        });

        /*
         * AND THE BOARD DOING NOTHING — P5.4.
         *
         * The ember pool and the beacon breath run for the whole run whether or
         * not anything is happening, and `HexField.tsx` already records what
         * that cost before it was bounded ("invalidate every frame, for the
         * whole run"). This is the row that says what it costs now: five
         * seconds of a board nobody is touching.
         */
        await phase(cdp, 'five seconds idle', ratio, throttle, async () => {
          await page.waitForTimeout(5000);
        });

        /*
         * AND THE OTHER HALF OF B4.16, SEPARATED — P5.3.
         *
         * Every row above conflates the two defaults: a high ratio is also an
         * MSAA-off ratio, because one constant decides both. `?aa=` overrides
         * the flag at context creation (`Board.tsx`) so this row is the SAME
         * resolution as the one above it with antialiasing turned the other
         * way. A fresh page, necessarily: the flag is fixed when the canvas is
         * built and the canvas may never remount.
         */
        await page.goto(`${BOARD}&aa=${ratio > 2 ? 1 : 0}`);
        await begin(page);
        await boardDrawn(page, 60_000);
        await clearCards(page);
        await phase(
          cdp,
          `${WALK_TILES} placements (MSAA ${ratio > 2 ? 'on' : 'off'})`,
          ratio,
          throttle,
          async () => {
            for (let i = 0; i < WALK_TILES; i++) await placeOneTile(page);
          },
        );

        /*
         * THE SAME IDLE BOARD WITH THE MOTION TURNED OFF — P5.4's other half.
         *
         * The idle row above is the question; this is the arithmetic. `App`
         * FOLLOWS `prefers-reduced-motion` rather than sampling it once, so
         * emulating it here reaches the live board without a reload, and what
         * it switches off is the ember pool and the beacon breath. The gap
         * between these two rows is what the ambient life of the board costs,
         * measured rather than argued.
         */
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await phase(cdp, 'five seconds idle (reduced motion)', ratio, throttle, async () => {
          await page.waitForTimeout(5000);
        });
        await page.emulateMedia({ reducedMotion: 'no-preference' });

        /*
         * THE CONTROL, and without it the idle row cannot be read at all.
         *
         * The first run of this instrument reported that five idle seconds cost
         * three and a half of CPU, which would be a battery finding worth
         * stopping everything for. It is not one until a blank page is measured
         * the same way, on the same throttle, in the same browser: whatever
         * `about:blank` spends is what this instrument charges for existing —
         * the harness's polling, the browser's housekeeping, the counters
         * themselves.
         *
         * A number with no control is a number that reads like a measurement.
         */
        await page.goto('about:blank');
        await phase(cdp, 'five seconds idle (blank page)', ratio, throttle, async () => {
          await page.waitForTimeout(5000);
        });

        // Put the CPU back before the context closes, so a crashed run cannot
        // leave a throttled browser behind for the next test.
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      });
    }
  });
}

/**
 * THE RECORD, and only a whole run writes it.
 *
 * The screen audit learned this the hard way (2026-09-03): a filtered run
 * replaced 265 findings with two, under a header that honestly said so, and
 * the good data was gone anyway. A report is a RECORD; a partial run is not
 * one, so it prints what it found and leaves the file alone.
 */
test.afterAll(async () => {
  const expected = RATIOS.length * THROTTLES.length * PHASES;
  if (rows.length < expected) {
    console.log(
      `\nperf: ${rows.length} of ${expected} phases measured — ` +
        'report.md left alone (a partial run is not the record)',
    );
    return;
  }

  /** The CPU cost of one phase, at one cell, or null if it was not measured. */
  const cost = (ratio: number, throttle: number, phase: string): number | null =>
    rows.find((r) => r.ratio === ratio && r.throttle === throttle && r.phase === phase)?.cpuMs ??
    null;

  /** `a ÷ b`, to one decimal, or `—` if either row is missing. */
  const times = (a: number | null, b: number | null): string =>
    a === null || b === null || b === 0 ? '—' : `${(a / b).toFixed(1)}×`;

  /*
   * The two comparisons this instrument exists to make, computed rather than
   * retyped — a summary a human copies out of a table is a summary that goes
   * stale on the next run and is believed anyway.
   */
  const readings = RATIOS.flatMap((ratio) =>
    THROTTLES.map((throttle) => {
      const idle = cost(ratio, throttle, 'five seconds idle');
      const still = cost(ratio, throttle, 'five seconds idle (reduced motion)');
      const walk = cost(ratio, throttle, `${WALK_TILES} placements`);
      const flipped = cost(
        ratio,
        throttle,
        `${WALK_TILES} placements (MSAA ${ratio > 2 ? 'on' : 'off'})`,
      );
      return (
        `| ${ratio} | ${throttle}× | ${times(idle, still)} | ` +
        `${ratio > 2 ? times(flipped, walk) : times(walk, flipped)} |`
      );
    }),
  );

  const cell = (r: Phase): string =>
    `| ${r.ratio} | ${r.throttle}× | ${r.phase} | ${r.wallMs} | ${r.cpuMs} | ${r.scriptMs} |`;

  const lines = [
    '# Performance',
    '',
    `Written by \`pnpm audit:perf\`. ${rows.length} of ${expected} phases measured,`,
    `${RATIOS.length} pixel ratios × ${THROTTLES.length} CPU throttles × ${PHASES} phases,`,
    'on one board (`?seed=7&place=12`) so every row is the same work.',
    '',
    '**Relative, not absolute.** A desktop runner draws through a software path',
    'that is not a phone’s, so the interesting number is always a RATIO between',
    'two rows of this table — never the millisecond itself. `cpu` is main-thread',
    'task time and `script` the part of it inside JavaScript.',
    '',
    '**Read every row against the blank-page control on its own throttle.** That',
    'row is `about:blank` doing nothing for five seconds, measured the same way,',
    'and it is what this instrument charges for existing — the harness’s polling,',
    'the browser’s housekeeping, the counters themselves. The first run of this',
    'file had no control and reported that an idle board costs 3.5 s of CPU in 5,',
    'which read like a battery emergency and was mostly the instrument.',
    '',
    '**Ratio 3 is also MSAA off by default**, because `Board.tsx`’s `DENSE` reads',
    '`devicePixelRatio > 2`: those rows draw 2.25× the fragments of the ratio-2',
    'rows and draw them unantialiased. One constant decides both defaults, which',
    'is why the walk is measured twice per cell — once as the build ships and',
    'once with `?aa=` flipping the flag at context creation.',
    '',
    '## The two readings',
    '',
    '**motion** is the idle board divided by the same board with reduced',
    'motion on — what the embers and the beacon breath cost while nobody is',
    'touching anything. **msaa** is antialiasing on divided by off at that',
    'ratio, which needs the `?aa=` override because one constant decides both',
    'defaults (`Board.tsx`).',
    '',
    '| dpr | cpu | motion | msaa |',
    '| --- | --- | ------ | ---- |',
    ...readings,
    '',
    '**MSAA here is drawn by a software rasterizer on the CPU**, so these',
    'multiples are an upper bound on what a phone GPU pays and must not be',
    'read as a device measurement. What they do say is which way each default',
    'leans, and by how much, on the same board.',
    '',
    '## Every phase',
    '',
    '| dpr | cpu | phase | wall ms | cpu ms | script ms |',
    '| --- | --- | ----- | ------- | ------ | --------- |',
    ...rows.map(cell),
    '',
  ];

  await mkdir(PERF, { recursive: true });
  await writeFile(join(PERF, 'report.md'), lines.join('\n'));
  console.log(`\nperf: ${rows.length} phases → perf/report.md`);
});
