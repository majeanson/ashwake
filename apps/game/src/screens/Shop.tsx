import {
  buy,
  canAfford,
  equip,
  levelOf,
  perkText,
  PERKS,
  priceOf,
  upgradeText,
  UPGRADES,
  type Progress,
} from '@meta/progress';
import type { Theme } from '@theme/tokens';
import { Icon } from '../ui/Icon';
import { perkRows } from '@view/tips';
import type { Strings } from '@text/Strings';
import { Fold } from '../ui/Fold';
import { Panel } from '../ui/Panel';
import { Prose, type OnTerm } from '../ui/Prose';
import { TipRows } from '../ui/TipRows';

/**
 * THE SHOP (Stage 4, 2026-08-29).
 *
 * Where relics go. Two halves and they are different things: **upgrades** are
 * bought and stay bought, **perks** are FOUND in the world and only worn — you
 * cannot buy your way to a perk, which is what keeps a find worth walking to.
 *
 * Ashwake 1 hosted this twice, on the front door and inside the end screen, and
 * extracted `shopParts()` so the two could not drift. Here it is one component
 * used in both places for the same reason.
 *
 * Every price, level and cap is the core's; every sentence is the catalogue's.
 * The shop decides nothing — it shows what `priceOf` says and dispatches what
 * `buy` returns.
 */

type ShopProps = {
  readonly progress: Progress;
  readonly theme: Theme;
  readonly s: Strings;
  readonly onProgress: (next: (was: Progress) => Progress) => void;
  readonly onTerm: OnTerm;
  /** Given, the shop is a panel; omitted, it is a section of another screen. */
  readonly onBack?: (() => void) | undefined;
};

export function Shop({ progress, theme, s, onProgress, onTerm, onBack }: ShopProps) {
  const body = (
    <>
      {/*
        The balance said "412" — a mark that is a picture of a word, and a
        number with nothing naming it.

        Two spans rather than an `aria-label`, because a `<p>` is a `paragraph`
        and a paragraph takes no accessible name: the attribute would simply be
        dropped, which is the same silence with a fix in front of it. The
        digits stay for the eye and the sentence goes to the reader.
      */}
      {/*
        NAMED, ON THE ENDING (2026-10-16, Marc: "rework this screen its
        bloated"). As a section of the end screen the shop had no name at all —
        the first-run line said "LA BOUTIQUE plus bas" and the tour lit a block
        with a coin and a number at its head. One heading row: the name the
        panel already wears, and the balance at its end. In the panel the title
        bar says the name, so only the balance is printed.
      */}
      {onBack === undefined ? (
        <h2 className="fact-label shop-head">
          <span>{s.ui.shop}</span>
          <span>
            <Icon name="relic" /> <span aria-hidden="true">{progress.relics}</span>
            <span className="visually-hidden">{s.ui.relicsHeld(progress.relics)}</span>
          </span>
        </h2>
      ) : (
        <p className="note">
          <Icon name="relic" /> <span aria-hidden="true">{progress.relics}</span>
          <span className="visually-hidden">{s.ui.relicsHeld(progress.relics)}</span>
        </p>
      )}

      <section>
        {UPGRADES.map((upgrade) => {
          const words = upgradeText(upgrade.id, s);
          const level = levelOf(progress, upgrade.id);
          const price = priceOf(progress, upgrade);
          const done = price === null;
          return (
            <div key={upgrade.id} className="shop-row">
              <div>
                {/* The name and where it stands on its ladder, one line: a bare
                    level under a long name wrapped onto a row of its own. The
                    fraction is the one this screen already speaks (0/5). */}
                <div className="shop-title">
                  <span className="shop-name">{words.name}</span>
                  <span className="fact-label shop-level">
                    {level}/{upgrade.levels}
                  </span>
                </div>
                <p className="note">
                  <Prose text={words.note} s={s} onTerm={onTerm} />
                </p>
              </div>
              <button
                type="button"
                data-buy={upgrade.id}
                // A button whose content is a price is a button CALLED `12`.
                // The name says what the tap does and to which row; the face
                // keeps the number, which is what the eye is comparing.
                {...(done ? {} : { 'aria-label': s.ui.buy(words.name, price) })}
                disabled={done || !canAfford(progress, upgrade)}
                onClick={() => onProgress((was) => buy(was, upgrade))}
              >
                {/* The top of the ladder is shown rather than hidden: a ladder
                    you can see the end of is one you know you have climbed. */}
                {done ? s.ui.maxed : `${price}`}
              </button>
            </div>
          );
        })}
      </section>

      <section>
        {/* A heading called `3/5` is a landmark nobody can navigate by: heading
            lists are how a screen reader skims a panel, and a fraction says
            nothing about what it heads. */}
        {/* The sentence, not the fraction (2026-10-16): "0/5" under a trophy
            named nothing on the ending. The same words the reader already got. */}
        <h2 className="fact-label">
          <Icon name="fame" /> {s.ui.perksTally(progress.found.length, PERKS.length)}
        </h2>
        {/* What a relic IS, on an empty shelf — in the panel only. On the
            ending the relics line above is a term that opens the same card,
            and a paragraph of rules under the shop was the bloat. */}
        {onBack !== undefined && progress.found.length === 0 && (
          <p className="note">
            <Prose text={s.lesson.end.row.relic.core} s={s} onTerm={onTerm} />
          </p>
        )}
        {PERKS.filter((perk) => progress.found.includes(perk.id)).map((perk) => {
          const words = perkText(perk.id, s);
          const worn = progress.equipped.includes(perk.id);
          return (
            <div key={perk.id} className="shop-row">
              <Fold summary={words.name}>
                <TipRows rows={perkRows(perk.id, s)} theme={theme} s={s} onTerm={onTerm} />
              </Fold>
              <button
                type="button"
                data-wear={perk.id}
                aria-pressed={worn}
                /*
                 * One slot today (`slotsOf`), so wearing one takes the other
                 * off — the number is the core's, not this screen's opinion.
                 *
                 * It ALSO used to disable the row you were wearing, which with
                 * one slot meant the only worn perk could never come off: there
                 * was no way to wear nothing, on any screen, ever (2026-09-05,
                 * Marc: *"a way to equip/unequip"*). That matters for the perks
                 * that take something as well as give it — ROOTBOUND pays less
                 * on strayed ground and nothing at all at full luck — so "none"
                 * is a real choice and was an unreachable one. `equip` in the
                 * core has always been a toggle; this screen was the half that
                 * refused.
                 */
                onClick={() => onProgress((was) => equip(was, perk.id))}
              >
                {worn ? s.ui.takeOff : s.ui.wear}
              </button>
            </div>
          );
        })}
      </section>
    </>
  );

  if (onBack === undefined) return body;
  return (
    <Panel id="shop" title={s.ui.shop} back={s.ui.back} closeAll={s.ui.closeAll} onBack={onBack}>
      {body}
    </Panel>
  );
}
