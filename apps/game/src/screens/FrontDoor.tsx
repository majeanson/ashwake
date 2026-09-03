import { ICON_DATA_URI, NAME } from '@meta/identity';
import type { Strings } from '@text/Strings';
import type { ThemeId } from '@theme/tokens';
import { useArtSlot } from '../shell/art';

/**
 * The front door (Stage 3, 2026-08-29).
 *
 * The first screen anyone sees, and the one a stranger judges the whole game
 * by. Ashwake 1's shape: the mark, the name, the tagline, one loud way in, and
 * everything else quiet underneath.
 *
 * **Focus goes to the dialog rather than to BEGIN.** Ashwake 1's ruling, and
 * the reason is that landing on BEGIN puts a focus ring on the one control a
 * player was about to press anyway, which reads as the screen having already
 * been used.
 */

export type FrontDoorProps = {
  readonly s: Strings;
  /** A run already in progress — BEGIN becomes RESUME. */
  readonly resuming: boolean;
  readonly onBegin: () => void;
  readonly onHowToPlay: () => void;
  readonly onSettings: () => void;
  readonly onMore: () => void;
  readonly onDaily: () => void;
  /** Today's standing, already worded by the catalogue — `dailyBadge`. */
  readonly dailyBadge: string;
  /** Which direction's lockup to look for. */
  readonly themeId: ThemeId;
  /**
   * WHICH GAME IS BEHIND THIS DOOR (2026-09-02).
   *
   * A `?seed=` link is how a stranger meets Ashwake, and this screen greeted
   * them identically to a returning player standing in their own world: the
   * same BEGIN, no mention that the board belongs to somebody else and that
   * nothing they do on it will be kept. Ashwake 1 named the mode on the button
   * and again in a line under it, and its reason is the sharper one: the person
   * who most needs to be told what game this is, is the person who did not
   * choose it.
   */
  readonly mode: 'world' | 'shared' | 'daily';
  /** Which day a daily door is for, already named by the catalogue. The badge
   *  beside it is a whole standing and far too long for a button. */
  readonly day?: string | undefined;
  /**
   * SETTLE THIS WORLD — keep this shared seed as one of your three.
   *
   * Present only on a shared door with a free slot. Ashwake 1's answer to a
   * board worth keeping, and the one thing on this screen that becomes
   * permanent, so it names the slot it would take.
   */
  readonly settle?: { readonly slot: number; readonly onSettle: () => void } | null;
};

export function FrontDoor({
  s,
  resuming,
  onBegin,
  onHowToPlay,
  onSettings,
  onMore,
  onDaily,
  dailyBadge,
  themeId,
  mode,
  day,
  settle,
}: FrontDoorProps) {
  const lockup = useArtSlot(themeId, 'ui.logo');
  return (
    <div className="front-door" role="dialog" aria-modal="true" aria-label={NAME} tabIndex={-1}>
      {/*
        The baked lockup where a direction has one, the drawn mark where it
        does not — and the NAME stays either way.

        `ui.logo` has been a declared slot since the core was lifted and was
        empty in every direction until the bakers came back (2026-08-29). The
        heading is not replaced by the picture: the lockup already reads
        ASHWAKE, so the `<h1>` is hidden from sight and kept for the document
        outline and for anyone listening rather than looking. A screen whose
        title exists only inside a PNG has no title.
      */}
      {lockup === null ? (
        <img className="door-mark" src={ICON_DATA_URI} alt="" width={72} height={72} />
      ) : (
        <img className="door-lockup" src={lockup} alt="" width={876} height={450} />
      )}
      <h1 className={lockup === null ? 'door-name' : 'door-name visually-hidden'}>{NAME}</h1>
      <p className="note door-tagline">{s.tagline}</p>

      {/*
        The hook (Marc, 2026-08-29: "we need a little story, a small hook for
        this game towards the settlement").

        Plain paragraphs rather than `Prose`, deliberately: every other piece of
        text in the game runs the glossary matcher so a term is tappable
        wherever it appears, and this is the one passage written to contain no
        terms at all. A field and a road are not vocabulary a lesson has to
        teach — they are what the four grounds ARE — and a term card opening
        over the front door would answer a question nobody has asked yet.
      */}
      <div className="door-story">
        {s.story.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <button type="button" className="door-begin" data-door="begin" onClick={onBegin}>
        {resuming
          ? s.ui.resume
          : mode === 'shared'
            ? s.ui.beginShared
            : mode === 'daily' && day !== undefined
              ? s.ui.beginDaily(day)
              : s.ui.begin}
      </button>

      {/*
        WHICH GAME (2026-09-02) — see `mode`.

        Only where the board is not this device's own: standing in your own
        world needs no explanation, and a paragraph under BEGIN saying so on
        every visit is chrome. On the two doors that DO need it, it is the
        difference between a stranger understanding the deal and finding out
        afterwards that their run banked nothing.
      */}
      {mode !== 'world' && (
        <p className="note" data-door="mode">
          {mode === 'shared' ? s.ui.which.shared : s.ui.which.daily}
        </p>
      )}

      {/*
        Keep the seed — see `settle`. Above the quiet choices and under the
        explanation of what a shared run IS, because it is the answer to the
        sentence directly above it.
      */}
      {settle != null && (
        <>
          <button type="button" className="quiet" data-door="settle" onClick={settle.onSettle}>
            {s.ui.settleWorld(settle.slot)}
          </button>
          <p className="note">{s.ui.settleNote}</p>
        </>
      )}

      {/* Today's board, under BEGIN and above the quiet choices: it is the
          second thing a returning player wants and never the first thing a
          stranger should meet. The badge is the catalogue's sentence — this
          screen counts nothing. Absent on a door that is already a daily's. */}
      {mode !== 'daily' && (
        <button type="button" className="door-daily" data-door="daily" onClick={onDaily}>
          {dailyBadge}
        </button>
      )}

      <nav className="panel-menu door-more">
        <button type="button" data-door="how" onClick={onHowToPlay}>
          {s.ui.howToPlay}
        </button>
        <button type="button" data-door="settings" onClick={onSettings}>
          {s.ui.settings}
        </button>
        {/* Everything that is not the first minute lives one tap deeper. The
            door stays three choices wide for a stranger; MORE is where a
            returning player's worlds, shop and hall of fame are. */}
        <button type="button" data-door="more" onClick={onMore}>
          {s.ui.more}
        </button>
      </nav>
    </div>
  );
}
