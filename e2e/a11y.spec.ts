import { expect, test, type Page } from '@playwright/test';
import { AUDIT_IN_PAGE } from './audit/audit';
import { boardDrawn, watchErrors } from './helpers';

/**
 * A WHOLE RUN, WITHOUT A POINTER (`PASS.md` P4.3).
 *
 * The board declares `role="application"`, which is a promise: *the app owns
 * the keys*. `INTERACTIONS.md`'s closing lesson is what makes that worth
 * proving — **a role is a promise about behaviour, and declaring one without
 * keeping it is worse than declaring neither** — and the keyboard specs, good
 * as they are, each prove one gesture. None of them has ever asked the
 * question this item asks: *can a run be FINISHED without seeing it?*
 *
 * So this walks the whole arc on keys alone — the door, the board, placements,
 * a harvest, the ending, and out into a new run — and **asserts that no
 * pointer event was dispatched at all**. Not "did not use the mouse helpers":
 * a listener installed before the first byte records every `pointerdown`,
 * `mousedown` and `touchstart` that reaches the page, and the test fails on
 * one. A keyboard path with a click hidden in its setup proves nothing.
 *
 * A phone viewport, deliberately, though a keyboard is a desktop thing:
 * `keyboard.spec.ts` runs at 1280×800 because that is the screen the keys are
 * FOR, and this one runs at 390×844 because a screen reader on a phone is the
 * player this exists for. The two viewports ask different questions of the
 * same keys, which is why both are worth having.
 */

test.use({ viewport: { width: 390, height: 844 } });

/*
 * THREE MINUTES, because a keyboard run is a keyboard run.
 *
 * Every placement is a summon, a walk and an act — four key presses and three
 * reads of the purse — and a whole run is twenty-odd of them plus its
 * harvests. The suite's one-minute default is right for a spec that proves a
 * gesture; this one proves an ARC, and the arc is the point of the item.
 */
test.setTimeout(180_000);

/**
 * What has focus, in a form a failure message can be read out of.
 *
 * **The BODY is reported as bare `BODY`, with no name**, and that is a bug fix
 * rather than tidiness. Tabbing from the top of a document focuses the body
 * first in WebKit and not in Chromium, and the body's `textContent` is the
 * whole page — so a matcher looking for the door found "BEGIN" inside the
 * body's text, pressed Enter on the document, and reported that WebKit could
 * not open its own front door. Four tests failed on an engine difference that
 * was really a greedy string match.
 */
async function focus(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (el === null) return 'nothing';
    if (el === document.body) return 'BODY';
    const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30);
    return `${el.tagName}${el.getAttribute('role') === null ? '' : `[${el.getAttribute('role')}]`} ${name}`;
  });
}

/**
 * Tab until `match` has focus, and say so if it never does.
 *
 * Bounded by the length of the focus ring rather than by a guess: the board's
 * ring is a dozen controls and it cycles, so anything not found in two laps is
 * not reachable by keyboard at all — which is the finding this helper exists
 * to be able to report.
 */
async function tabTo(page: Page, match: RegExp, laps = 28): Promise<string[]> {
  const seen: string[] = [];
  for (let i = 0; i < laps; i++) {
    const now = await focus(page);
    if (match.test(now)) return seen;
    seen.push(now);
    await page.keyboard.press('Tab');
  }
  throw new Error(
    `nothing matching ${String(match)} took focus in ${laps} tabs: ${seen.join(' → ')}`,
  );
}

/**
 * Dismiss whatever card is up, by key.
 *
 * `helpers.ts`'s `clearCards` clicks, which is exactly what this file may not
 * do. Escape is the gesture a keyboard player would try first and the one the
 * scrim answers; the Tab-and-Enter fallback is there because a card that
 * declines Escape is a finding rather than a reason to stop the run.
 */
async function dismissCards(page: Page): Promise<void> {
  for (let i = 0; i < 12; i++) {
    if ((await page.locator('.card-scrim').count()) === 0) return;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(60);
    if ((await page.locator('.card-scrim').count()) === 0) return;
    await tabTo(page, /^BUTTON /);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(60);
  }
  throw new Error('a card would not close on a key');
}

/**
 * THE WHOLE BOARD IN ONE ROUND TRIP.
 *
 * A keyboard run is a hundred-odd actions, and the first draft asked the page
 * four separate questions before each one — is a card up, is it over, is there
 * a pop, how many tiles — at a couple of hundred milliseconds each. That is
 * two and a half seconds per key press, which turned a three-minute budget
 * into a test that could not finish a run it was proving could be finished.
 * One `evaluate` reads all four.
 */
async function look(page: Page): Promise<{
  cards: number;
  over: boolean;
  pop: boolean;
  tiles: number;
}> {
  return page.evaluate(() => ({
    cards: document.querySelectorAll('.card-scrim').length,
    over: document.querySelector('[data-hud="end"]') !== null,
    pop: [...document.querySelectorAll('button')].some((b) =>
      (b.textContent ?? '').includes('POP'),
    ),
    tiles: Number(document.querySelector('[data-stat="tiles"] .stat-value')?.textContent ?? '0'),
  }));
}

/**
 * EVERY LIVE REGION, WATCHED FROM BEFORE THE FIRST WORD.
 *
 * P4.4 asked to prove there is ONE speaker. There are four, and each one has a
 * docblock arguing for itself: the toast (`say`), the service-worker update
 * line, the in-app-browser warning, and the hidden region that carries a BRIEF
 * card's text — which lives outside the card precisely because *a live region
 * inserted together with its content is not reliably announced*.
 *
 * So the honest question is not how many regions exist, it is whether two of
 * them ever hold text at the same moment — because that is what a reader hears
 * as one sentence over another. This records every change to all of them.
 */
async function watchTheVoices(page: Page): Promise<void> {
  await page.evaluate(() => {
    const bag = window as unknown as { __voices?: string[][] };
    bag.__voices = [];
    const regions = (): Element[] => [
      ...document.querySelectorAll('[aria-live], [role="status"], [role="alert"]'),
    ];
    const sample = (): void => {
      const speaking = regions()
        .map((el) => `${el.className || el.tagName}: ${(el.textContent ?? '').trim()}`)
        .filter((line) => !line.endsWith(': '));
      if (speaking.length > 0) bag.__voices?.push(speaking);
    };
    new MutationObserver(sample).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });
}

/** Every moment at which at least one region held text. */
async function voices(page: Page): Promise<string[][]> {
  return page.evaluate(() => (window as unknown as { __voices?: string[][] }).__voices ?? []);
}

test('a run can be started, played, finished and restarted on keys alone', async ({ page }) => {
  const errors = watchErrors(page);

  /*
   * THE WITNESS, installed before the page exists.
   *
   * Capture phase and on `window`, so nothing can stop it short, and the three
   * event families that mean "a pointer touched this" — a keyboard `Enter` on
   * a focused button fires `click`, which is why `click` is deliberately NOT
   * on this list; `pointerdown` and friends are only ever a real device or a
   * test driving one.
   */
  await page.addInitScript(() => {
    const bag = window as unknown as { __pointer?: string[] };
    bag.__pointer = [];
    for (const type of ['pointerdown', 'mousedown', 'touchstart']) {
      window.addEventListener(
        type,
        (event) => {
          const target = event.target as HTMLElement | null;
          bag.__pointer?.push(`${type} on ${target?.tagName ?? '?'}`);
        },
        true,
      );
    }
  });

  await page.goto('/?seed=7&taught=1');

  /*
   * THE DOOR. A stranger with no pointer arrives here, and the way IN is the
   * first control in the ring — worth asserting rather than assuming.
   *
   * Asserted as "no other BUTTON comes first" rather than as "one Tab lands on
   * it", because the two engines disagree about where a tab walk starts:
   * Chromium goes straight to the first control, WebKit focuses the document
   * body on the way. Neither is wrong and only one of them was in the first
   * draft of this test. The label varies too — BEGIN on a fresh device,
   * RESUME on one with a run in progress, and both in two languages — so the
   * door is matched by what it DOES, not by what it says.
   */
  const beforeTheDoor = await tabTo(page, /^BUTTON .*(BEGIN|RESUME|REPRENDRE|COMMENCER)/i);
  expect(
    beforeTheDoor.filter((stop) => stop.startsWith('BUTTON')),
    'something else is ahead of the door in the tab order',
  ).toEqual([]);
  await page.keyboard.press('Enter');
  await expect(page.locator("[data-hud='stats']")).toBeVisible();
  /*
   * AND WAIT FOR THE BOARD TO JOIN THE RING, WHICH IS NOT WHEN IT EXISTS.
   *
   * Measured, five runs of five: a moment after BEGIN the board host is in the
   * DOM with `tabindex="0"`, not `aria-hidden`, not `inert` — and Tab walks
   * straight past it, because it has no size yet and a zero-sized element is
   * not in the tab order. `Board` is behind `lazy()`, so "the HUD is up" and
   * "the board can be reached by keyboard" are two different moments.
   *
   * The window is short and it is real: a keyboard player who tabs the instant
   * the stats appear finds the hand, the stats, MENU and the purse, and no
   * board. Waiting for the picture is what this file does about it; the finding
   * is written down at P4 rather than patched, because what to do about a
   * control that arrives late is a question about the door, not about a test.
   */
  await boardDrawn(page);
  await dismissCards(page);

  /*
   * THE RUN: hold the board's focus and play it.
   *
   * The first draft walked the tab ring back to the board before every single
   * action, which is both slower than a keyboard player and a worse test —
   * what a player does is arrive at the board once and stay there, and what
   * that proves is that the board KEEPS the keys through placements, harvests
   * and the cards they raise.
   *
   * The bound is on actions rather than on time, and it is generous: what it
   * protects against is a run that cannot END on keys, which would be the
   * finding — a game a keyboard player can start and never finish.
   */
  await tabTo(page, /\[application\]/);
  const ARROWS = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'] as const;
  let popped = 0;
  let placed = 0;
  let over = false;
  for (let action = 0; action < 240 && !over; action++) {
    const board = await look(page);
    over = board.over;
    if (over) break;
    if (board.cards > 0) {
      await dismissCards(page);
      await tabTo(page, /\[application\]/);
      continue;
    }

    /*
     * A ripe pocket first: the harvest is the half of the loop that pays, and
     * a keyboard player who could place but never pop would be playing a
     * different game from everybody else.
     *
     * The POP BUTTON is only one of the two ways, and the run found the other
     * on its own: standing the marker on a ripe tile and pressing Enter
     * harvests it where a tile would otherwise go down. Both are counted — a
     * purse that GREW is a harvest however it was asked for.
     */
    if (board.pop) {
      await tabTo(page, /^BUTTON .*POP/);
      await page.keyboard.press('Enter');
      popped += 1;
      await page.waitForTimeout(300);
      await tabTo(page, /\[application\]/);
      continue;
    }

    await page.keyboard.press(ARROWS[action % ARROWS.length] as string);
    await page.keyboard.press('Enter');
    const after = await look(page);
    if (after.tiles < board.tiles) placed += 1;
    if (after.tiles > board.tiles) popped += 1;
  }

  expect(placed, 'not one tile went down on keys alone').toBeGreaterThan(0);
  expect(popped, 'the board was never harvested without a pointer').toBeGreaterThan(0);

  // THE ENDING, reached by playing rather than by `?end=1`.
  await expect(
    page.locator('[data-hud="end"]'),
    'a keyboard player can start a run and never finish one',
  ).toBeVisible();

  // AND OUT AGAIN: an ending nobody can leave is an ending that ends the game.
  await tabTo(page, /^BUTTON .*(AGAIN|NEW RUN|ENCORE|NOUVELLE|MONDE)/i);
  await page.keyboard.press('Enter');
  await expect(page.locator("[data-hud='stats']")).toBeVisible();

  const pointed = await page.evaluate(
    () => (window as unknown as { __pointer?: string[] }).__pointer ?? [],
  );
  expect(pointed, 'a pointer event reached the page during a keyboard-only run').toEqual([]);
  expect(errors, errors.join('\n')).toEqual([]);
});

/**
 * THE PROMISE THE BOARD MAKES, AND THE SENTENCE THAT KEEPS IT (P4.2).
 *
 * `role="application"` tells a screen reader to stop using the arrow keys for
 * reading and hand them to the page. That is a trade the reader cannot undo,
 * and it is only honest if the page then TELLS the player what the arrows do —
 * which is what `board-keys` is for, and what `aria-describedby` points at.
 * A role with no description is the exact shape `INTERACTIONS.md` warns about:
 * a promise about behaviour, declared and not kept.
 */
test('the board says what its keys do, to the reader it took them from', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1');
  await tabTo(page, /^BUTTON .*(BEGIN|RESUME|REPRENDRE|COMMENCER)/i);
  await page.keyboard.press('Enter');
  await boardDrawn(page);

  const board = page.locator('.board-view');
  await expect(board, 'the board no longer claims the arrows').toHaveAttribute(
    'role',
    'application',
  );
  await expect(board, 'the board is not in the tab order').toHaveAttribute('tabindex', '0');

  const describedBy = await board.getAttribute('aria-describedby');
  expect(describedBy, 'the board took the arrow keys and described nothing').toBe('board-keys');

  /*
   * And the description is a SENTENCE about the keys rather than a label.
   * Checked by naming the keys it must mention: a description that says "the
   * board" tells a reader nothing they could act on, and this is the one place
   * in the game where the controls cannot be discovered by looking.
   */
  const help = (await page.locator('#board-keys').textContent()) ?? '';
  expect(help.toLowerCase(), 'the key help does not mention the arrows').toMatch(
    /arrow|flèche|fleche/,
  );
  expect(help.length, 'the key help is a label, not a description').toBeGreaterThan(20);

  expect(errors, errors.join('\n')).toEqual([]);
});

/**
 * NO TWO VOICES AT ONCE (P4.4).
 *
 * Four live regions exist and the count is not the finding — what would be a
 * finding is two of them holding text at the same instant, because that is a
 * reader hearing one sentence interrupt another. Watched across a real
 * keyboard run rather than at a moment, in both languages: a region added for
 * one locale's layout is exactly the kind of thing that is only true in the
 * other.
 */
for (const locale of ['fr-CA', 'en-CA'] as const) {
  test(`the board never speaks over itself, in ${locale}`, async ({ page }) => {
    const errors = watchErrors(page);
    await page
      .context()
      .addInitScript(
        (lang) => Object.defineProperty(navigator, 'languages', { get: () => [lang] }),
        locale,
      );
    await page.goto('/?seed=7&taught=1&place=12');
    await tabTo(page, /^BUTTON .*(BEGIN|RESUME|REPRENDRE|COMMENCER)/i);
    await page.keyboard.press('Enter');
    await boardDrawn(page);
    await watchTheVoices(page);

    await dismissCards(page);
    await tabTo(page, /\[application\]/);
    const ARROWS = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'] as const;
    for (let i = 0; i < 24; i++) {
      const board = await look(page);
      if (board.over) break;
      if (board.cards > 0) {
        await dismissCards(page);
        await tabTo(page, /\[application\]/);
        continue;
      }
      if (board.pop) {
        await tabTo(page, /^BUTTON .*POP/);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(300);
        await tabTo(page, /\[application\]/);
        continue;
      }
      await page.keyboard.press(ARROWS[i % ARROWS.length] as string);
      await page.keyboard.press('Enter');
    }

    const heard = await voices(page);
    expect(heard.length, 'nothing was announced at all during a whole walk').toBeGreaterThan(0);
    const doubled = heard.filter((moment) => moment.length > 1);
    expect(
      doubled,
      `two regions spoke at once in ${locale}: ${doubled[0]?.join(' || ') ?? ''}`,
    ).toEqual([]);

    expect(errors, errors.join('\n')).toEqual([]);
  });
}

/**
 * WHAT A READER IS TOLD WHEN THE BOARD MOVES UNDER THEM (P4.5).
 *
 * A harvest is the loudest thing in this game and nearly all of it is
 * pictures: the camera flies, the tiles leap, the ground changes colour. The
 * question is not whether the pop is pretty, it is whether a player who cannot
 * see it is told anything at all.
 *
 * **They are, and not the way this test first assumed.** The toast stays empty
 * through a harvest — sampled every 150 ms for two seconds, it never says a
 * word — because the receipt is a CARD, and the card takes focus, and a
 * focused card is read for being focused. That is `ui/Card.tsx`'s own ruling:
 * it used to carry `role="status"` as well and the doubling was removed
 * deliberately, *"announcing it twice is worse than not at all"*.
 *
 * So what this pins is the promise that ruling rests on — **something takes
 * the reader to the receipt** — rather than the mechanism it happens to use.
 * A card that stopped taking focus would pass a toast test and leave a blind
 * player with a silent screen and a board that has rearranged itself.
 */
test('a harvest takes the reader to its receipt', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/?seed=7&taught=1&place=12');
  await tabTo(page, /^BUTTON .*(BEGIN|RESUME|REPRENDRE|COMMENCER)/i);
  await page.keyboard.press('Enter');
  await boardDrawn(page);
  await dismissCards(page);

  // Walk until the board offers a harvest, which `?place=12` makes quick.
  await tabTo(page, /\[application\]/);
  const ARROWS = ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown'] as const;
  for (let i = 0; i < 40; i++) {
    const board = await look(page);
    if (board.pop) break;
    if (board.cards > 0) {
      await dismissCards(page);
      await tabTo(page, /\[application\]/);
      continue;
    }
    await page.keyboard.press(ARROWS[i % ARROWS.length] as string);
    await page.keyboard.press('Enter');
  }
  expect((await look(page)).pop, 'the board never ripened, so this test saw no harvest').toBe(true);

  await watchTheVoices(page);
  await tabTo(page, /^BUTTON .*POP/);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);

  /*
   * Either a live region spoke, or the reader was MOVED to what happened. One
   * of the two has to be true; which one is the app's business.
   */
  const spoken = (await voices(page)).flat().join(' | ');
  /*
   * `sentence`, not `text`, and the rename is the sweep's doing.
   *
   * `pnpm sweep`'s field pass matches by NAME, so this local object having a
   * `text` field made `e2e/audit/audit.ts#Finding.text` look read — and the
   * gate failed on the ruling that says the only reader of that field is its
   * own test, because the ruling had stopped matching anything. The subject had
   * not changed; an unrelated field of the same name in another file had
   * silenced it. Worth a distinct name, and worth knowing about the tool.
   */
  const receipt = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    const card = active?.closest('.card-scrim, .card') ?? null;
    return {
      moved: card !== null,
      sentence: (card?.textContent ?? '').trim(),
    };
  });

  expect(
    spoken.length > 0 || receipt.moved,
    'the board leapt, the camera flew, and a reader was told nothing and taken nowhere',
  ).toBe(true);
  if (receipt.moved) {
    expect(
      receipt.sentence.length,
      'focus moved to a card with nothing in it, which is a reader taken somewhere silent',
    ).toBeGreaterThan(20);
  }

  expect(errors, errors.join('\n')).toEqual([]);
});

/**
 * AND THE AXIS THAT GRADES ALL THIS CAN FAIL (`PASS.md` P4.1, 2026-09-11).
 *
 * `e2e/audit/audit.ts` gained a fourth axis — every control a reader can reach
 * has a name made of words — and it now reports **nothing** across a hundred
 * and twenty-six screen-visits in two languages at two widths. A grade that
 * finds nothing is indistinguishable from a grade that cannot find anything,
 * and this one has already been wrong twice in a single afternoon: it reported
 * 164 false findings against the stat row (a name is built from an `<img alt>`
 * child, which `textContent` drops) and three against the restore box (a form
 * control is named by its wrapping `<label>`).
 *
 * So the axis is checked in both directions, the way `pnpm sweep` is: three
 * defects are planted in a real screen and each must be named. **This is the
 * only reason the zero above means anything.**
 */
test('the spoken-screen axis catches what it claims to', async ({ page }) => {
  await page.goto('/?seed=7&taught=1');
  await tabTo(page, /^BUTTON .*(BEGIN|RESUME|REPRENDRE|COMMENCER)/i);
  await page.keyboard.press('Enter');
  await boardDrawn(page);

  await page.evaluate(() => {
    const box = 'width:60px;height:60px;font-size:16px';
    const holder = document.createElement('div');
    // A button with nothing in it, one named only by a number, and one a
    // keyboard can reach inside an `aria-hidden` subtree.
    holder.innerHTML =
      `<button id="plant-unnamed" style="${box}"></button>` +
      `<button id="plant-number" style="${box}">42</button>` +
      `<div aria-hidden="true"><button id="plant-hidden" style="${box}">SETTLE</button></div>`;
    document.body.append(holder);
  });

  const planted = (await page.evaluate(AUDIT_IN_PAGE))
    .filter((finding) => finding.where.includes('plant-'))
    .map((finding) => `${finding.kind} ${finding.where}`);

  expect(planted, 'an unnamed button went unreported').toContain('unnamed-control #plant-unnamed');
  expect(planted, 'a button named "42" went unreported').toContain(
    'name-is-not-words #plant-number',
  );
  expect(planted, 'a focusable control inside aria-hidden went unreported').toContain(
    'focusable-but-hidden #plant-hidden',
  );
});
