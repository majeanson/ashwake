import { TUNING } from '@content/tuning';
import type { Theme } from '@theme/tokens';
import type { Strings } from '@text/Strings';
import { groundGuide } from '@view/strategy';
import { Prose, ProseLines } from '../ui/Prose';
import { TipRows } from '../ui/TipRows';

/**
 * The manual's COLOURS tab (2026-10-12, Marc: _"add more strategy in how to
 * play towards colours … each colour could have their own explanation +
 * general strategy"_).
 *
 * General advice first, then one block per ground: its rule (the very
 * sentence the colour card says, `colourLesson`), then when to take it and
 * what undoes it. All of it comes from `groundGuide`, which reads the live
 * tuning, so a rebalanced ground changes this tab and not just the card.
 * Nothing here is tappable, like the rest of the manual.
 */
export function GroundGuide({ theme, s }: { readonly theme: Theme; readonly s: Strings }) {
  const guide = groundGuide(TUNING, theme, s);
  return (
    <>
      <section className="lesson">
        <h2 className="panel-title marked">
          <span>{guide.head}</span>
        </h2>
        <ProseLines text={guide.general.join('\n')} s={s} />
      </section>
      {guide.grounds.map((g) => (
        <section className="lesson" key={g.colour} data-ground={g.colour}>
          <TipRows rows={[{ colour: g.colour, text: g.rule }]} theme={theme} s={s} />
          <p className="ground-advice">
            <strong>{guide.pickWhen}</strong> <Prose text={g.pick} s={s} />
          </p>
          <p className="ground-advice">
            <strong>{guide.watchFor}</strong> <Prose text={g.watch} s={s} />
          </p>
        </section>
      ))}
    </>
  );
}
