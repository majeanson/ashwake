import type { TeachId } from '@meta/progress';
import type { Strings } from '@text/Strings';
import { lessonOf, rowName } from '@view/lessons';
import { opensAt } from '../shell/teaching';

/**
 * What the game has to say that is not worth stopping for (2026-10-12).
 *
 * Marc's rule for the lessons that are about a thing rather than about the
 * game: _"card with new dot"_. A magic tile, a unique tile, a territory and a
 * shrine each get a small NEW chip over the hand while they are in view, and
 * the card opens only when the chip is tapped. The player who is busy playing
 * is never interrupted; the player who is wondering what that thing is has the
 * answer one tap away, in the same card an interruption would have shown.
 *
 * Which chips, and when, is `shell/teaching`'s `newDots`; this only draws them.
 * The name on the chip is the row's name where the lesson has rows and the
 * lesson's own otherwise, so a chip and its card can never disagree about what
 * is being offered.
 */
export function NewChips({
  ids,
  s,
  onOpen,
}: {
  readonly ids: readonly TeachId[];
  readonly s: Strings;
  readonly onOpen: (id: TeachId) => void;
}) {
  if (ids.length === 0) return null;
  return (
    <div className="new-chips" data-hud="new-chips">
      {ids.map((id) => {
        const { lesson: opened, row } = opensAt(id);
        const lesson = lessonOf(opened);
        if (lesson === undefined) return null;
        // The ROW's name where there is one (CACHE, SHRINE), the lesson's own
        // otherwise (MAGIC): a chip offers the thing in view, not its concept.
        const name = rowName(lesson, row, s);
        return (
          <button
            key={id}
            type="button"
            className="new-chip"
            data-new-chip={id}
            aria-label={`${s.ui.newChip}: ${name}`}
            onClick={() => onOpen(id)}
          >
            <span className="new-chip-dot" aria-hidden="true" />
            <span className="new-chip-new" aria-hidden="true">
              {s.ui.newChip}
            </span>
            <span className="new-chip-name">{name}</span>
          </button>
        );
      })}
    </div>
  );
}
