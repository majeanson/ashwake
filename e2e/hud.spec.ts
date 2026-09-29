import { expect, test } from '@playwright/test';
import { begin, watchErrors } from './helpers';

/*
 * TILES AND POINTS FIRST (Marc, 2026-09-29, round nine) — `MINOR` in
 * `screens/Hud.tsx`, `.stat.minor` in `ui.css`.
 *
 * Two claims, at the three widths the header was measured at when it was
 * sized to its box (2026-09-25): the two numbers that matter are drawn larger
 * than the two that do not, and no number in the row is cut by its own box or
 * runs under its own mark. The widest case is staged rather than played for —
 * a five-digit score and a two-digit reach and cost, written into the row the
 * way `Hud` writes them (the text and `--len`) — because `?place=` cannot buy
 * a score that size, and a row that fits only the numbers a test happens to
 * reach is the bug the first header build shipped with ("5517").
 */
for (const width of [320, 360, 390]) {
  test(`the header puts tiles and points first, and fits at ${width}px`, async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width, height: 740 });
    await page.goto('/?seed=7&taught=1&place=12');
    await begin(page);
    await page.locator('[data-stat="tiles"] .stat-value').waitFor({ state: 'visible' });

    const staged = { tiles: '88', points: '55170', map: '14', cost: '12' } as const;
    await page.evaluate((values) => {
      for (const [id, text] of Object.entries(values)) {
        const stat = document.querySelector<HTMLElement>(`[data-stat="${id}"]`);
        const value = stat?.querySelector('.stat-value');
        if (stat === null || value == null) continue;
        value.textContent = text;
        stat.style.setProperty('--len', String(text.length));
      }
    }, staged);

    const rows = await page.evaluate((ids) => {
      return ids.map((id) => {
        const stat = document.querySelector<HTMLElement>(`[data-stat="${id}"]`)!;
        const value = stat.querySelector<HTMLElement>('.stat-value')!;
        const mark = stat.querySelector<HTMLElement>('.stat-label')!;
        const box = stat.getBoundingClientRect();
        const v = value.getBoundingClientRect();
        const m = mark.getBoundingClientRect();
        return {
          id,
          size: parseFloat(getComputedStyle(value).fontSize),
          inside: v.left >= box.left - 0.5 && v.right <= box.right + 0.5,
          clear: v.left >= m.right - 0.5,
        };
      });
    }, Object.keys(staged));

    const size = Object.fromEntries(rows.map((r) => [r.id, r.size]));
    for (const major of ['tiles', 'points']) {
      for (const minor of ['map', 'cost']) {
        expect(size[major], `${major} drawn larger than ${minor} at ${width}px`).toBeGreaterThan(
          size[minor]!,
        );
      }
    }
    for (const r of rows) {
      expect(r.inside, `${r.id} cut by its own box at ${width}px`).toBe(true);
      expect(r.clear, `${r.id} runs under its own mark at ${width}px`).toBe(true);
    }

    await page
      .locator('[data-hud="stats"]')
      .screenshot({ path: test.info().outputPath(`header-${width}.png`) });
    expect(errors).toEqual([]);
  });
}
