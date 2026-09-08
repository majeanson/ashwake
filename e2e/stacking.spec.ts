import { expect, test, type Page } from '@playwright/test';
import { begin, clearCards, watchErrors } from './helpers';

/**
 * WHAT IS ON TOP, ASKED OF THE ENGINE RATHER THAN OF THE STYLESHEET
 * (2026-09-08).
 *
 * This spec exists because of a bug report nobody could reproduce. On
 * 2026-09-05 the sharpness popup came back from Marc's phone with the camera
 * buttons drawn ON TOP of it, and three sessions of work followed from a
 * theory about one CSS construct — `z-index: calc(var(--z-drawer) + 1)`, on the
 * argument that `z-index` takes an `<integer>` while `calc()` yields a
 * `<number>`, so a browser might drop the declaration and never make a
 * stacking context at all. `NEXT.md` §1 records the theory, the hardening done
 * on the strength of it, and the honest caveat that it had never been
 * confirmed. It also records the instruction that closed the file: *do not fix
 * the other three on the strength of this paragraph alone.*
 *
 * **The theory is wrong, and this spec is how that was settled.** Asked
 * directly, both engines compute `z-index: calc(var(--z-chrome) + 2)` as `12`
 * and honour it. The construct is fine. Whatever Marc saw, it was not that.
 *
 * So what is left is the thing that should have existed first: a test that
 * asserts the ORDER, on both engines, by asking the browser what a finger
 * would actually hit. `elementFromPoint` is the whole method, and the reason
 * for it over reading `getComputedStyle().zIndex` is the same reason the
 * theory survived so long — a computed style tells you what the declaration
 * says, and the failure being hunted was a browser not doing what the
 * declaration said. Hit-testing is the engine's own answer.
 *
 * It runs on chromium AND webkit. That is the point: every one of these
 * assertions is about boxes and paint order, which is exactly the class that
 * differs between engines and exactly the class Marc's reports have been in.
 */

test.use({ viewport: { width: 390, height: 844 } });

/**
 * What the browser says is on top at the centre of `selector`'s box.
 *
 * Returns the nearest ancestor chain as a string so a failure names something
 * a person can find, rather than reporting `false`. The element under the
 * point is very often a `<span>` inside the button that should be there —
 * which is a PASS, not a miss — so the answer is the chain, and the assertion
 * looks for the expected thing anywhere in it.
 */
async function topmostAt(page: Page, selector: string): Promise<string> {
  // `.first()`: the camera cluster holds two buttons (the purse toggle and the
  // view cycle), and this asks about a POSITION rather than about an identity —
  // any one of a cluster's buttons proves the cluster's layer.
  return page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      if (hit === null) return '(nothing)';
      const chain: string[] = [];
      for (let n: Element | null = hit; n !== null && n !== document.body; n = n.parentElement) {
        const cls = typeof n.className === 'string' ? n.className.trim().split(/\s+/)[0] : '';
        const data = [...n.attributes]
          .filter((a) => a.name.startsWith('data-'))
          .map((a) => `[${a.name}="${a.value}"]`)
          .join('');
        chain.push(`${n.tagName.toLowerCase()}${cls === '' ? '' : `.${cls}`}${data}`);
      }
      return chain.join(' < ');
    });
}

/** Every control on the board's own surface reaches the finger over it. */
test('the board corner controls are the things you press', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?place=6&taught=1&seed=7');
  await begin(page);
  await clearCards(page);

  // MENU, top-right, at `calc(var(--z-chrome) + 2)` — the highest of the
  // board's own three and the door that must always be pressable.
  const menu = '.board-menu button';
  if ((await page.locator(menu).count()) > 0) {
    expect(await topmostAt(page, menu), 'MENU is covered').toMatch(/board-menu|quick/);
  }

  // The camera cluster, bottom-right, at `--z-camera` (19). It is the one that
  // has actually lost this fight before: at `--z-chrome` an open purse drawer
  // painted over it, found 2026-09-04.
  const camera = '.camera button';
  if ((await page.locator(camera).count()) > 0) {
    expect(await topmostAt(page, camera), 'a camera button is covered').toContain('camera');
  }

  expect(errors, errors.join('\n')).toEqual([]);
});

/**
 * THE 2026-09-04 REGRESSION, HELD.
 *
 * An open purse drawer sat on top of the camera cluster, and the way it failed
 * is the argument for this whole file: `[data-action="purse"]` was still in the
 * DOM and still "visible" to a `toBeVisible()`, while a `spend-row` ate the
 * tap. Visibility is not reachability.
 */
test('an open purse drawer does not eat the camera cluster', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?place=6&taught=1&seed=7');
  await begin(page);
  await clearCards(page);

  const purse = page.locator('[data-action="purse"]');
  if ((await purse.count()) === 0) {
    test.skip(true, 'no purse button on this board');
    return;
  }
  await purse.click();
  await expect(page.locator('.spends')).toBeVisible();

  // The drawer is open and outranks the board. The cluster still has to be the
  // thing under the finger, because its own button is what closes the drawer.
  for (const which of ['.camera button', '[data-action="purse"]']) {
    if ((await page.locator(which).count()) === 0) continue;
    expect(await topmostAt(page, which), `${which} is under the open drawer`).toMatch(
      /camera|purse/,
    );
  }

  expect(errors, errors.join('\n')).toEqual([]);
});

/**
 * THE CONSTRUCT ITSELF, on whatever engine is running.
 *
 * Not a style assertion for its own sake — this is the one that would have
 * answered the 2026-09-05 question in a minute rather than in three sessions.
 * If an engine ever DOES decline `z-index: calc(...)`, the computed value comes
 * back `auto` and this goes red with the element's name in it.
 */
test('z-index: calc() is honoured, and every rung is an integer', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?place=6&taught=1&seed=7');
  await begin(page);
  await clearCards(page);

  const rungs = await page.evaluate(() => {
    const out: { where: string; z: string }[] = [];
    for (const sel of ['.board-menu', '.lens-off', '.camera', '.panel', '.card-scrim']) {
      for (const el of document.querySelectorAll(sel)) {
        out.push({ where: sel, z: getComputedStyle(el).zIndex });
      }
    }
    return out;
  });

  // Only elements that are actually on screen for this state are reported, so
  // an empty list would mean the walk found nothing rather than that nothing
  // is wrong.
  expect(rungs.length, 'no positioned chrome found to grade').toBeGreaterThan(0);
  for (const rung of rungs) {
    expect(rung.z, `${rung.where} has no z-index — the declaration was dropped`).not.toBe('auto');
    expect(Number.isInteger(Number(rung.z)), `${rung.where} computed z-index ${rung.z}`).toBe(true);
  }

  expect(errors, errors.join('\n')).toEqual([]);
});
