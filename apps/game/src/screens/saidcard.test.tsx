import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { pickLocale } from '@content/locale';
import { stringsFor } from '@text/index';
import { resolveTheme } from '@theme/index';
import { perkRows } from '@view/tips';
import { SaidCard } from './SaidCard';

/**
 * The find card's own WEAR button (2026-09-05, Marc: *"i should see a card
 * popping explaining, a way to equip/unequip"*).
 *
 * The card already explained — `receipts.ts` attaches `perkRows`, so the three
 * rows naming what a perk gives, what it takes and how to play it have been on
 * it since 2026-09-02. What it did not have was a way to ACT: its last sentence
 * was directions, *"WEAR it in THE SHOP, on the end screen"*, and since
 * `grantFind` only auto-wears the FIRST perk a world finds, every find after it
 * was a thing you had been handed, explained, and could not use until the run
 * was over.
 *
 * Tested here rather than in the Playwright suite because a find cannot be
 * reached by a scripted run: they are generated far from the origin, and a
 * search over twenty thousand seeds turned up none within three hexes of it.
 * So this pins the control and its callback; that `App` supplies them is held
 * by the types and by the branch that sets `cardPerk`.
 */

const s = stringsFor(pickLocale(['en']));
const theme = resolveTheme(null);

const card = (wear?: { label: string; onWear: () => void }) =>
  render(
    <SaidCard
      text={s.claim.found('ROOTBOUND', false)}
      rows={perkRows('rootbound', s)}
      theme={theme}
      s={s}
      onDismiss={() => {}}
      onTerm={() => {}}
      {...(wear === undefined ? {} : { wear })}
    />,
  );

describe('the card a find pops', () => {
  it('explains the perk it just gave, in three rows', () => {
    const { container } = card();
    const shown = container.textContent ?? '';
    // What it gives, what it takes, how to play it — the catalogue's own
    // sentences, not a summary of them.
    const words = s.perk.rootbound;
    for (const line of [words.gain, words.lose, words.play]) {
      expect(shown.includes(line), 'a find card that does not explain the find').toBe(true);
    }
  });

  it('offers no way to wear it when the shell hands it none', () => {
    card();
    expect(document.querySelector('[data-action="wear-found"]')).toBeNull();
  });

  it('wears it from the card, and says so in the catalogue’s words', async () => {
    let worn = 0;
    card({
      label: s.ui.wear,
      onWear: () => {
        worn += 1;
      },
    });
    const button = document.querySelector('[data-action="wear-found"]');
    expect(button, 'the find card has no way to wear what it just gave').not.toBeNull();
    expect(button?.textContent).toBe(s.ui.wear);
    await userEvent.click(button as HTMLElement);
    expect(worn, 'the card’s WEAR button is drawn and wired to nothing').toBe(1);
  });

  it('says TAKE OFF for one already worn, so the toggle reads both ways', () => {
    card({ label: s.ui.takeOff, onWear: () => {} });
    expect(document.querySelector('[data-action="wear-found"]')?.textContent).toBe(s.ui.takeOff);
  });
});
