import {
  buy,
  canAfford,
  equip,
  levelOf,
  perkText,
  PERKS,
  priceOf,
  slotsOf,
  upgradeText,
  UPGRADES,
  type Progress,
} from '@meta/progress';
import type { Theme } from '@theme/tokens';
import { Icon } from '../ui/Icon';
import type { LessonId } from '@view/lessons';
import { perkRows } from '@view/tips';
import type { Strings } from '@text/Strings';
import { Fold } from '../ui/Fold';
import { Panel } from '../ui/Panel';
import { Prose } from '../ui/Prose';
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

export type ShopProps = {
  readonly progress: Progress;
  readonly theme: Theme;
  readonly s: Strings;
  readonly onProgress: (next: (was: Progress) => Progress) => void;
  readonly onTerm: (id: LessonId) => void;
  /** Given, the shop is a panel; omitted, it is a section of another screen. */
  readonly onBack?: (() => void) | undefined;
};

export function Shop({ progress, theme, s, onProgress, onTerm, onBack }: ShopProps) {
  const body = (
    <>
      <p className="note">
        <Icon name="relic" /> {progress.relics}
      </p>

      <section>
        {UPGRADES.map((upgrade) => {
          const words = upgradeText(upgrade.id, s);
          const level = levelOf(progress, upgrade.id);
          const price = priceOf(progress, upgrade);
          const done = price === null;
          return (
            <div key={upgrade.id} className="shop-row">
              <div>
                <span className="fact-value">{words.name}</span>{' '}
                {level > 0 && <span className="fact-label">{level}</span>}
                <p className="note">
                  <Prose text={words.note} s={s} onTerm={onTerm} />
                </p>
              </div>
              <button
                type="button"
                data-buy={upgrade.id}
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
        <h2 className="fact-label">
          <Icon name="fame" /> {progress.found.length}/{PERKS.length}
        </h2>
        {progress.found.length === 0 && (
          <p className="note">
            <Prose text={s.lesson.relic.core} s={s} onTerm={onTerm} />
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
                // One slot today (`slotsOf`), so wearing one takes the other
                // off. The number is the core's, not this screen's opinion.
                disabled={worn && progress.equipped.length <= slotsOf()}
                onClick={() => onProgress((was) => equip(was, perk.id))}
              >
                {worn ? s.ui.worn : s.ui.wear}
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
