import { expect, test, type Page } from '@playwright/test';
import { begin, clearCards, watchErrors } from './helpers';

/**
 * Every control a thumb can reach is at least 44px to that thumb.
 *
 * Ashwake 1 shipped this as a CI-blocking spec and this body did not — the same
 * measurement survived only inside `audit:screens`, which is deliberately
 * non-gating and produces a report rather than a failure. So a control under
 * the floor could merge green, which is exactly the class Ashwake 1 grew this
 * test to hold after it recurred (`NEXT.md` §4 there, 2026-08-28).
 *
 * The shape of the measurement is the part worth carrying over, because the
 * obvious version does not work:
 *
 *   - **The size is usually not declared.** A stat's height is content plus
 *     padding, with no `min-height` at all, so a source scan for small values
 *     finds nothing where the misses actually are.
 *   - **The target is usually not the element.** Small controls are grown with
 *     a transparent pseudo-element. Reading the box alone reports every one of
 *     them as a miss; reading only `::before` reports the others as misses.
 *
 * So it is measured where all of that is already resolved: in a real browser,
 * on the rendered page, as the union of the element and both its pseudos. A
 * handful of screens rather than a survey — this is a gate, and a gate's job is
 * to hold a class, not to describe the game. `audit:screens` is the survey.
 */

test.use({ viewport: { width: 390, height: 844 } });

/** The union of an element's own box and both its pseudo-elements', which is
 *  what a finger actually gets. Runs in the page. */
const SMALLEST_TARGETS = (): { where: string; w: number; h: number; argued: boolean }[] => {
  const out: { where: string; w: number; h: number; argued: boolean }[] = [];
  for (const el of document.querySelectorAll('button, [role="button"], summary, textarea')) {
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    // Inert is not reachable, and a scene under an open panel is inert on
    // purpose (D6) — measuring it would report the whole board behind a menu.
    if (el.closest('[inert]') !== null) continue;
    const box = el.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;

    let w = box.width;
    let h = box.height;
    for (const which of ['::before', '::after'] as const) {
      const pseudo = getComputedStyle(el, which);
      if (pseudo.content === 'none') continue;
      const pw = parseFloat(pseudo.width);
      const ph = parseFloat(pseudo.height);
      if (Number.isFinite(pw)) w = Math.max(w, pw);
      if (Number.isFinite(ph)) h = Math.max(h, ph);
    }

    const cls = el.className;
    const classes = typeof cls === 'string' && cls !== '' ? `.${cls.trim().split(/\s+/)[0]}` : '';
    out.push({
      // An exemption has to be DECLARED on the control, not assumed by this
      // test — see the `data-compact` note on the HUD's stat button.
      argued: el.closest('[data-compact]') !== null,
      where: `${el.tagName.toLowerCase()}${classes} "${(el.textContent ?? '').trim().slice(0, 24)}"`,
      // Rounded, like the audit: 43.98px is 44px to a thumb, and an un-rounded
      // compare fails with "44 is less than 44".
      w: Math.round(w),
      h: Math.round(h),
    });
  }
  return out;
};

async function assertAllThumbable(page: Page, screen: string): Promise<void> {
  const targets = await page.evaluate(SMALLEST_TARGETS);
  expect(targets.length, `${screen}: no controls found at all — the walk is wrong`).toBeGreaterThan(
    1,
  );
  const small = targets.filter((t) => Math.min(t.w, t.h) < 44 && !t.argued);
  expect(
    small,
    `${screen}: controls under the 44px thumb floor — either grow the box, ` +
      `give them a pseudo-element target, or declare the exemption with ` +
      `data-compact and say why on the control`,
  ).toEqual([]);

  /*
   * And the escape hatch is pinned shut.
   *
   * A `data-compact` that anybody may add is a floor that erodes one control
   * at a time. Exactly one thing in this game has argued its way under the
   * line — the HUD's stats, which explain rather than act — so anything else
   * wearing the marker fails here and has to make its own argument in a diff.
   */
  const exempt = [...new Set(targets.filter((t) => t.argued).map((t) => t.where.split(' "')[0]))];
  expect(
    exempt.filter((where) => where !== 'button.stat'),
    `${screen}: a NEW compact control`,
  ).toEqual([]);
}

test('every control on the front door and its panels is thumbable', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?taught=1');
  await page.locator('[data-door="begin"]').waitFor({ state: 'visible' });
  await assertAllThumbable(page, 'the front door');

  await page.locator('[data-door="more"]').click();
  await page.locator('[data-panel="more"]').waitFor({ state: 'visible' });
  await assertAllThumbable(page, 'MORE');

  await page.locator('[data-go="settings"]').click();
  await page.locator('[data-panel="settings"]').waitFor({ state: 'visible' });
  await assertAllThumbable(page, 'SETTINGS');

  expect(errors).toEqual([]);
});

test('every control on the board is thumbable, with the purse open and shut', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1');
  await begin(page);
  await page.locator('canvas').waitFor({ state: 'attached' });
  await clearCards(page);
  await assertAllThumbable(page, 'the board');

  // The purse is the fold with the most controls in the game, and the one
  // whose rows spend a currency a mis-tap cannot give back.
  const purse = page.locator('[data-action="purse"]');
  if (await purse.isVisible().catch(() => false)) {
    await purse.click();
    await assertAllThumbable(page, 'the purse, open');
  }

  expect(errors).toEqual([]);
});
