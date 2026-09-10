import { ICON_DATA_URI, NAME } from '@meta/identity';
import type { Strings } from '@text/Strings';
import type { ThemeId } from '@theme/tokens';
import { useArtSlot } from '../shell/art';

/**
 * The front door (Stage 3, 2026-08-29; cleared down to three choices,
 * 2026-09-03).
 *
 * The first screen anyone sees, and the one a stranger judges the whole game
 * by. Ashwake 1's shape: the mark, the name, one loud way in, and everything
 * else quiet underneath — except this body had grown a SECOND loud way in
 * (DAILY, now uniform with BEGIN rather than deliberately quieter — Marc's
 * direct ask) and a bottom row of three separate doors (HOW TO PLAY,
 * SETTINGS, MORE) that all led into the same tangle of overlapping menus.
 * The tagline and the three-paragraph story both came off this screen the
 * same session: the tagline's mood folded into `s.story`'s opening line
 * (`Strings.ts`), the story itself moved into the unified MENU as a row a
 * player opens on purpose rather than scrolls past by default.
 *
 * Three choices now, always: BEGIN, DAILY, MENU. Everything this screen used
 * to link to directly — how to play, settings, worlds, the shop, the story —
 * is one tap behind MENU, which is the same panel the board's own MENU
 * button and the end screen's own MENU button open. One menu, reached from
 * everywhere the same way, instead of three different lists that each led
 * to a different subset of the others.
 *
 * **Focus goes to the dialog rather than to BEGIN.** Ashwake 1's ruling, and
 * the reason is that landing on BEGIN puts a focus ring on the one control a
 * player was about to press anyway, which reads as the screen having already
 * been used.
 */

type FrontDoorProps = {
  readonly s: Strings;
  /** A run already in progress — BEGIN becomes RESUME. */
  readonly resuming: boolean;
  readonly onBegin: () => void;
  /** The one door to everything else — how to play, settings, worlds, the
   *  shop, the story, this device. Same panel the board's own MENU button
   *  and the end screen's own MENU button open. */
  readonly onMenu: () => void;
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
};

export function FrontDoor({
  s,
  resuming,
  onBegin,
  onMenu,
  onDaily,
  dailyBadge,
  themeId,
  mode,
  day,
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

        **ONE SENTENCE, NOT THE MANUAL'S (2026-09-09).** This printed
        `which.shared` — 190 characters, the longest string on any screen a
        player is trying to act on — with `settleNote` under it and a second
        button between the two. Seven lines about run modes before a stranger's
        first tap, on the screen a public link lands on. `doorShared` and
        `doorDaily` are the same deal in a breath; WHICH GAME still carries the
        whole of it, one tap away.
      */}
      {mode !== 'world' && (
        <p className="note" data-door="mode">
          {mode === 'shared' ? s.ui.which.doorShared : s.ui.which.doorDaily}
        </p>
      )}

      {/*
        KEEP THE SEED IS GONE (2026-09-09, Marc: *"Remove it"*).

        A quiet SETTLE HERE button stood here with its own paragraph under it,
        offering to keep this shared seed as WORLD 1. It was the second
        keep-offer on the screen — the ENDING makes the other, and the other is
        strictly better: it carries the ground walked and the territories
        claimed, and it lets the player name the slot instead of taking the
        first free one. It was also the only un-bordered control between two
        bordered buttons, which made it read as a caption rather than a thing
        you press.

        So keeping a board happens once, in one place, where it can carry what
        the run did. `App`'s `settleThisWorld`, `ui.settleWorld`,
        `ui.settleNote` and `storage.ts`'s `settleSlot` all went with it.
      */}

      {/* DAILY, uniform with BEGIN now — see the doc comment above and
          `.door-begin, .door-daily` in ui.css. Absent on a door that is
          already a daily's. */}
      {mode !== 'daily' && (
        <button type="button" className="door-daily" data-door="daily" onClick={onDaily}>
          {dailyBadge}
        </button>
      )}

      {/* The one door to everything else — see the doc comment above. */}
      <nav className="panel-menu door-menu">
        <button type="button" data-door="menu" onClick={onMenu}>
          {s.ui.menu}
        </button>
      </nav>
    </div>
  );
}
