import type { Progress } from '@meta/progress';
import { hasBeenPlayed, type WorldMemory } from '@meta/world';
import type { Theme } from '@theme/tokens';
import { arcNote, type HudView } from '@view/view';
import type { LessonId } from '@view/lessons';
import { GOALS, type GoalId } from '@content/goals';
import type { Strings } from '@text/Strings';
import { FactGrid } from '../ui/FactGrid';
import { Icon } from '../ui/Icon';
import { Prose } from '../ui/Prose';
import { useEffect, useRef, useState } from 'react';
import type { Standing } from '../shell/settle';
import { SLOTS, type Slot } from '../shell/storage';
import { Atlas } from './Atlas';
import { Payout } from './Payout';
import { Shop } from './Shop';
import { statLabel } from './Hud';
import { useArtSlot } from '../shell/art';

/**
 * How a run ended (Stage 3, 2026-08-29).
 *
 * Score and feel are two separate rewards by ruling (Ashwake 1, 2026-08-19): a
 * run thick with caches and shrines may feel better than its number says, and
 * that is the design rather than a bug. So the score is not the only thing on
 * this screen — the epitaph is what the run WAS, and what still glows past the
 * edge is why there is another one.
 *
 * **NEW RUN sits directly under the score.** Ashwake 1 moved it there after
 * finding players hunting two screens down for the way back in, and that is the
 * whole of "chose to start another" — the gate v2.0 turns on.
 *
 * Every sentence here is the core's: the epitaph is hash-picked from a pool per
 * language, the arc note is `arcNote`, and what glows comes through the HUD.
 * The labels are the same marks the stat row uses, imported rather than
 * re-typed, so the screen cannot invent a word for a number.
 */

type EndScreenProps = {
  readonly hud: HudView;
  /** Every scoring harvest's points, in order — the run's shape. */
  readonly harvests: readonly number[];
  readonly s: Strings;
  readonly theme: Theme;
  readonly progress: Progress;
  readonly onNewRun: () => void;
  readonly onTerm: (id: LessonId) => void;
  readonly onProgress: (next: (was: Progress) => Progress) => void;
  readonly onMore: () => void;
  /**
   * Hand this run to somebody. Returns what happened so the button can say
   * COPIED where there was no share sheet — a tap that appears to do nothing
   * is the whole reason this needs a return value.
   */
  readonly onShare: () => Promise<'shared' | 'copied' | 'failed'>;
  /** Goals this run was the one to meet, for this world. */
  readonly goals: readonly GoalId[];
  /**
   * Back onto the board this run just ended on.
   *
   * Marc, 2026-08-29: *"in the end screen i loved having my real map to check
   * it back again, keep it that way just like we did."* That was answered with
   * a PNG snapshot, and on 2026-08-30 he looked at it: *"the ground you walked
   * 'picture' is ugly, i dont want a picture i want to actual screengame where
   * we can move around."*
   *
   * He is right, and the picture was never the thing he asked for — "check it
   * back again" is a verb. The board is still MOUNTED behind this screen (the
   * R3F canvas lives once, above every scene, and never remounts), still
   * holding the exact cells the run ended on, still able to pan, pinch and
   * FIT. It was simply covered by an opaque page. So this hands the screen
   * back to it and `App` puts a way out at the bottom; the snapshot is still
   * taken, because the hall of fame's diary rows are the one place a picture
   * IS the right answer.
   */
  readonly onWalk: () => void;
  /**
   * WATCH THE RUN AGAIN (2026-09-23, Marc: *"i'd like to be able to replay the
   * pops and tile placements too"*).
   *
   * Absent when there is no film to play — a run whose replay could not be
   * kept, or one finished by a build that did not record them. The door is
   * simply not drawn then, rather than drawn and apologising, which is the
   * same rule the import button and the crossing offer already keep.
   */
  readonly onWatch?: (() => void) | undefined;
  /**
   * What this run CHANGED, as opposed to what it scored.
   *
   * Perks found and shrine unlocks woken. An ending that reports only a number
   * cannot tell a player that the next run starts different, which is the one
   * thing that makes them press NEW RUN.
   */
  readonly newPerks?: readonly string[];
  readonly newUnlocks?: readonly string[];
  /**
   * The world this run left behind, where there is one (2026-09-01).
   *
   * Marc, of a run whose shrine handed him the fourth draft card: *"in this
   * game I got the shrine 4th tile, id like it shown in the end screen."*
   *
   * The WOKE line above answers "what changed" and cannot answer "where does
   * that leave me" — three shrines of five, and WHICH three. Those are the two
   * facts the atlas already carries, and until now they were three taps away in
   * MORE, on the one screen where they have just been earned. So the atlas is
   * shown here, unchanged: a world is described in one place however you arrive
   * at it, exactly as a cache is.
   *
   * Absent on a detour and on a daily, neither of which has a world.
   */
  readonly world?: WorldMemory | null;
  /** Back to the front door: an ending needs a way out that is not another run. */
  readonly onMainMenu: () => void;
  /**
   * WHERE THIS RUN STANDS (2026-09-02).
   *
   * `settle` has computed all three since the rules were lifted and returned
   * none of them, so this screen has never once said NEW BEST. See
   * `shell/settle.ts`'s `Standing`.
   *
   * Null on a daily and on a detour, neither of which competes for the shelf.
   */
  readonly standing?: Standing | null;
  /**
   * The daily this ending belongs to, and the way back onto it.
   *
   * Ashwake 1 put TRY AGAIN here because this is where the itch is: the tries
   * counter above confesses every press, which is the design's honesty rule,
   * and the retry has to be beside the confession or the confession is just a
   * number. NEW RUN on a daily LEAVES the daily, so without this there was no
   * way back onto today's board except three taps through MORE.
   */
  readonly daily?: {
    readonly try: number;
    readonly onRetry: () => void;
    /**
     * CONSECUTIVE DAYS PLAYED, ENDING TODAY (2026-09-09).
     *
     * `dailyStreak` has existed since Stage 4 and was printed in exactly one
     * place — the front door's badge, which is read BEFORE playing. The moment
     * a streak does any work is the moment a run ends, and this screen said
     * `TRY 3` and nothing else.
     *
     * Computed by the shell, not here: it is a fact about the daily BOOK, and
     * a screen that derived it would be a second place for it to be wrong (the
     * same reason `dailyBadge` computes it rather than taking it — "a badge
     * that could be handed a streak from a different device is a badge that
     * can lie").
     */
    readonly streak: number;
  } | null;
  /**
   * KEEP THIS BOARD: turn the board just played into one of the three worlds
   * (2026-09-05; a shared board too, 2026-09-09).
   *
   * Present on a daily and on a shared link, absent in a world, and **the
   * shell decides which** — this screen used to gate the offer on `daily`
   * as well, which is how a shared board came to be offered nothing. One
   * condition, in one place, is the whole fix: `App`'s `importDaily` is
   * undefined wherever there is nothing to keep.
   *
   * The worlds come in whole rather than as a count, because the row has to
   * say what picking it would COST — a world with runs on it is one this
   * would abandon, and a player deciding that deserves to see the runs, the
   * best and the reach before the confirmation asks.
   */
  readonly importDaily?:
    | {
        readonly worlds: Readonly<Record<Slot, WorldMemory | null>>;
        readonly onImport: (slot: Slot) => void;
      }
    | undefined;
  /*
   * The install offer lived here from 2026-09-02 to 2026-09-16 — Chrome's
   * dialog as a button, the iOS gesture as a sentence, once ever. It is on the
   * FRONT DOOR now (Marc: "right away"), where a friend who never finishes a
   * run still meets it; `screens/FrontDoor.tsx` and `shell/installDue.ts`.
   */
  /**
   * THAT A WORLD CAN BE LOST, said once, when there is something to lose
   * (2026-09-09).
   *
   * BACK UP works and lives three taps deep behind SETTINGS ▸ DEVICE; the only
   * proactive storage warning fires inside an in-app browser. So an ordinary
   * player with a world worth keeping was never told it lives in one place —
   * and storage loss is the one failure nobody comes back from.
   *
   * The shell decides the threshold, for the reason it decides the other
   * three: "is there something to lose" is a fact about the device's ledgers,
   * and a screen that derived it would be a second place for it to be wrong.
   */
  readonly backUp?: boolean | undefined;
  /** This run came from a shared link, so the chain can carry on from here. */
  readonly fromLink?: boolean;
};

/** How long COPIED stands before the button goes back to being a button. Long
 *  enough to be read on a phone that has just come back from a share sheet,
 *  short enough that it is gone before a second tap is considered. */
const SAID_MS = 2000;

export function EndScreen({
  onWalk,
  onWatch,
  newPerks,
  newUnlocks,
  world,
  onMainMenu,
  standing,
  daily,
  importDaily,
  backUp,
  fromLink,
  hud,
  harvests,
  s,
  theme,
  progress,
  onNewRun,
  onTerm,
  onProgress,
  onMore,
  onShare,
  goals,
}: EndScreenProps) {
  /* The daily's KEEP THIS BOARD picker: shut until asked for, and `armed` is
     the slot whose second press would abandon it. Both reset with the screen,
     which is the whole of their lifetime — there is no way back to this
     ending once a world has been taken. */
  const [picking, setPicking] = useState(false);
  const [armed, setArmed] = useState<Slot | null>(null);
  /*
   * WHAT THE SHARE BUTTON SAYS AFTER IT HAS BEEN TAPPED.
   *
   * A share sheet needs no word — the sheet IS the feedback — but a silent
   * copy is a tap that looks like it did nothing.
   *
   * Three things were wrong with saying it by replacing the label
   * (2026-09-02).
   *
   * **It never went back.** `said` was set to COPIED and nothing ever cleared
   * it, so the SECOND share on the same ending changed nothing on screen: the
   * button already read COPIED, and the one tap that most needs an
   * acknowledgement — the one where you are not sure the first worked — is the
   * one that got none.
   *
   * **The accessible name went with it,** permanently. A button whose name is
   * COPIED is a button that says it has been pressed, not one that says what
   * it does; a screen-reader user arriving at the end of the run afterwards is
   * offered a control called COPIED.
   *
   * **And nothing announced it.** A label that changes under a focus is not an
   * event; a live region is.
   *
   * So: the visible label still swaps, because that is the feedback the screen
   * was designed around and a phone has nowhere else to put it; the button
   * keeps its own name through `aria-label`; the word is announced from a
   * region that is in the document before it has anything to say; and it goes
   * back to SHARE after a beat.
   */
  const [said, setSaid] = useState<string | null>(null);
  const saidFor = useRef<ReturnType<typeof setTimeout> | 0>(0);
  useEffect(
    () => () => {
      if (saidFor.current !== 0) clearTimeout(saidFor.current);
    },
    [],
  );
  const onShare2 = () => {
    void onShare().then((how) => {
      // `'shared'` needs no word — the sheet IS the feedback. The other two
      // both do, and `'failed'` was mapped to `null`, which on this button is
      // indistinguishable from never having tapped it.
      setSaid(how === 'copied' ? s.ui.copied : how === 'failed' ? s.ui.shareFailed : null);
      if (saidFor.current !== 0) clearTimeout(saidFor.current);
      saidFor.current = setTimeout(() => {
        saidFor.current = 0;
        setSaid(null);
      }, SAID_MS);
    });
  };

  // The direction's own board scene, where one is baked. `ui.runEnd` was a
  // declared slot with no file in any direction until 2026-08-29 — the screen
  // simply had no hero, which is a supported state and not the intended one.
  const hero = useArtSlot(theme.id, 'ui.runEnd');

  const summary = hud.summary;
  const arc = summary === null ? null : arcNote(summary, s);

  return (
    /*
     * `role="main"` (2026-09-03): a run's end is the primary content while it
     * is on screen, not a dialog stacked over something else — it does not go
     * through `<Panel>`'s `role="dialog"`, and nothing else here named it a
     * landmark at all. `board-host` goes `inert` for exactly this state
     * (`App.tsx`), so the two never compete for the one `role="main"`.
     */
    <div className="end" data-hud="end" role="main">
      {hero !== null && <img className="end-hero" src={hero} alt="" width={876} height={330} />}

      {/*
        WHICH RUN THIS WAS, over the score (2026-09-02).

        A number with no ordinal is a number with no story: RUN 41 says a device
        has a history and this score belongs somewhere in it, and TRY 3 says
        today's board has been played twice already. Both facts were computed
        and discarded — see `standing` and `daily` above.
      */}
      {(standing != null && standing.run > 0) || daily != null ? (
        <p className="end-run" data-hud="which-run">
          {daily != null ? s.ui.ending.try(daily.try) : s.ui.ending.run(standing?.run ?? 0)}
        </p>
      ) : null}

      {/*
        WHY COME BACK, on the one screen where the answer lands (2026-09-09).

        This game has no backend by ruling (D13): no push, no email, no store
        listing. The home-screen icon and this sentence are the entire habit
        loop, which made a streak that was computed and never printed the
        cheapest retention bug in the app.

        Above the score rather than below the buttons: a player who has just
        finished reads down from the top, and the thing that has to survive the
        glance is what the streak is worth. Two sentences and not one with a
        fork inside it — on day one there is nothing to protect and the honest
        line is an invitation.
      */}
      {daily != null && (
        <p className="note end-streak" data-hud="streak">
          {daily.streak > 1 ? s.ui.ending.streak(daily.streak) : s.ui.ending.comeBack}
        </p>
      )}

      {/* The page's one `h1`, and it is the score — see `s.ui.ending.scored`.
          The digits stay on screen; the sentence is what the heading list and
          the screen reader get, because "heading level 1, 4210" is a landmark
          that names nothing. */}
      <h1 className="end-score">
        <span aria-hidden="true">{hud.points}</span>
        <span className="visually-hidden">{s.ui.ending.scored(hud.points)}</span>
      </h1>

      {/*
        NEW BEST, or how far short of it (2026-09-02).

        The loudest line the ending can carry, and this body has never printed
        it. `shortOfBest` rather than restating the record: "how far short" is
        the question a player has, and it is silent where there is no standing
        best rather than claiming a run is zero short of nothing.
      */}
      {standing?.isNewBest === true && (
        <p className="end-best" data-hud="new-best">
          {s.ui.ending.newBest}
        </p>
      )}
      {standing?.isNewBest === false && standing.previousBest !== null && (
        <p className="note end-best-short" data-hud="short-of-best">
          {s.ui.ending.shortOfBest(Math.max(0, standing.previousBest - hud.points))}
        </p>
      )}

      {hud.epitaph !== null && (
        <p className="end-epitaph">
          <Prose text={hud.epitaph} s={s} onTerm={onTerm} />
        </p>
      )}

      {/*
        THE PRIMARY LOOP ACTION, over the score — unchanged ruling for a world
        ending (see the doc comment above). A daily's itch is TRY AGAIN, not
        NEW RUN: this board is everybody's, so the button beside the tries
        confession is the retry, and NEW RUN — which leaves the daily for this
        device's own world — moves to the bottom nav as CONTINUE IN MY WORLD
        (2026-09-03, Marc: didn't see a way back to his world from a daily's
        end screen; the door was there, worded for the wrong context).
      */}
      {daily != null ? (
        <button type="button" className="door-begin" data-action="retry" onClick={daily.onRetry}>
          {s.ui.ending.tryAgain}
        </button>
      ) : (
        <button type="button" className="door-begin" data-action="new-run" onClick={onNewRun}>
          {s.ui.newRun}
        </button>
      )}

      {hud.glowBeyondEdge !== null && (
        <p className="note">
          <Prose text={hud.glowBeyondEdge} s={s} onTerm={onTerm} />
        </p>
      )}

      {/*
        THE RUN'S SHAPE, in the six facts Ashwake 1 fixed this grid at
        (2026-09-02).

        It was TILES · POINTS · MAP · LUCK: two numbers already printed larger
        higher up the screen, and LUCK, which double-counts — the ending bonus
        has already folded the unspent purse into the relics line below. So the
        grid restated the score and then told a small lie about the currency.

        These six are what a run WAS rather than what it scored, and every one
        was already in `hud.summary`, on its way into the diary entry, unread by
        the screen it came off. Fixed at six so the ending does not change shape
        between a short run and a long one.
      */}
      <FactGrid
        facts={[
          { label: statLabel('map', s), value: hud.depthValue },
          { label: s.ui.ending.placements, value: hud.placements },
          { label: s.ui.ending.popped, value: summary?.harvests ?? 0 },
          {
            label: s.ui.ending.biggestPop,
            // How big, and how far through the run it landed — the second half
            // is Gate D's whole subject, and the arc below draws the same fact
            // as a picture.
            value:
              summary != null && summary.biggestHarvest > 0
                ? s.ui.ending.biggestPopAt(
                    summary.biggestHarvest,
                    Math.round(summary.biggestAt * 100),
                  )
                : s.ui.ending.none,
          },
          { label: s.ui.ending.destinations, value: summary?.claims ?? 0 },
          { label: s.ui.ending.bounties, value: summary?.quests ?? 0 },
        ]}
      />

      {/*
        WHAT THE RUN PAID INTO THE NEXT ONE (2026-09-02).

        As distinct from what it scored, which is everything above. `hud.relics`
        is `endingPayout`'s own number and had no reader: every ending in this
        body reported a score and then said nothing at all about the currency
        the whole roguelite loop is built on, with the shop sitting directly
        below asking to be spent in it.

        Absent on a detour and a daily, where nothing is banked and saying so
        would be the ending lying about the one thing those modes promise.
      */}
      {world != null && hud.relics > 0 && (
        <p className="note end-banked" data-hud="banked">
          <Icon name="relic" /> {s.ui.ending.relicsBanked(hud.relics)}
        </p>
      )}

      {arc !== null && (
        <p className="note">
          <Prose text={arc} s={s} onTerm={onTerm} />
        </p>
      )}

      {/*
        WHAT CHANGED, as opposed to what was scored (2026-08-29).

        Marc: *"make sure we identify new perks, new shrine unlocks, etc."* A
        perk found and a shrine woken are the two things that make the NEXT run
        different, and both were silent here — the shelf simply had one more on
        it the next time you looked. An ending that reports only a number
        cannot say why to press NEW RUN.

        Above the payout for the same reason the survey is: rare beats routine,
        and the breakdown is always there.
      */}
      {(newPerks ?? []).length + (newUnlocks ?? []).length > 0 && (
        <ul className="goals-met" data-hud="gained">
          {(newUnlocks ?? []).map((label) => (
            <li key={`u-${label}`}>{s.ui.woke(label)}</li>
          ))}
          {(newPerks ?? []).map((label) => (
            <li key={`p-${label}`}>{s.ui.perkFound(label)}</li>
          ))}
        </ul>
      )}

      {/*
        WHERE THAT LEAVES THE WORLD (2026-09-01) — see `world` above.

        Directly under the WOKE line, because the two are one sentence: this
        run woke A FOURTH DRAFT CARD, and this world now stands at three
        shrines of five with these three awake. The same component the WORLDS
        panel shows, so a world reads the same wherever you meet it.
      */}
      {world != null && (
        <>
          <h2 className="fact-label end-world-head">{s.ui.thisWorld}</h2>
          <Atlas world={world} s={s} />
        </>
      )}

      {/*
        The SURVEY: what this run was the one to finish, for this world.
        Above the breakdown, because a goal met is the rarest thing an ending
        can carry and the payout is always there.
      */}
      {goals.length > 0 && (
        <ul className="goals-met">
          {goals.map((id) => (
            <li key={id}>{s.goalMet(s.goal[id], GOALS.find((g) => g.id === id)?.reward ?? 0)}</li>
          ))}
        </ul>
      )}

      {/* Why the number was what it was, one tap down — see `Payout`. */}
      {summary !== null && (
        <Payout
          summary={summary}
          points={hud.points}
          reach={hud.depthValue}
          harvests={harvests}
          theme={theme}
          s={s}
        />
      )}

      {/* The relics this run earned are spent HERE, on the screen where they
          were earned — Ashwake 1's ruling, and the whole of the roguelite
          loop: a run that ends on a purchase is a run that ends pointing at
          the next one. The shop is the same component the shop panel is, with
          its own back button omitted because this is not a panel.

          Absent on a detour and a daily (`world == null`), the same gate
          `relicsBanked` above uses: neither banks a thing, so a shop asking to
          spend a currency this ending could not have earned is world-chrome
          bleeding onto a board that has no world (2026-09-03, Marc: "when
          playing dailies, dont show the shop or anything world-related"). */}
      {world != null && (
        <Shop progress={progress} theme={theme} s={s} onProgress={onProgress} onTerm={onTerm} />
      )}

      {/*
        THAT A WORLD CAN BE LOST, said once (2026-09-09).

        After the actions because it is an invitation rather than a gate, and
        said once ever, marked when SHOWN: a player who read an invitation has
        been invited. The install offer that stood beside it from 2026-09-02
        moved to the front door on 2026-09-16 (Marc: "right away") — see
        `FrontDoor`.
      */}
      {backUp === true && (
        <p className="note end-install-note" data-hud="back-up">
          {s.ui.backUpNote}
        </p>
      )}

      <nav className="panel-menu">
        {/*
          KEEP THIS BOARD, off a daily's ending (2026-09-05) or a shared
          board's (2026-09-09 — Marc: *"For a shared world, it should be able to
          be played like a daily for a first run, then the same question goes:
          do we continue in a world?"*).

          It was `onNewRun` — the same door NEW RUN opens everywhere else,
          relabelled — which left the daily for a fresh expedition into
          whichever world you came from. Marc, on what the words had always
          meant to him: *"i want to import this seed in one of my 3 worlds as a
          new world that i'd like to explore further, with this first run in
          mind."* So it opens a picker instead.

          Two taps to destroy a world and not one: a slot that has been played
          ARMS with `newWorldArmed`'s own words — the same two-step NEW WORLD
          already uses — and only a second press on the armed row goes through.
          An empty slot needs no arming, because there is nothing to lose.
        */}
        {importDaily !== undefined && !picking && (
          <button type="button" data-action="import-daily" onClick={() => setPicking(true)}>
            {s.ui.ending.continueInWorld}
          </button>
        )}
        {importDaily !== undefined && picking && (
          <>
            <p className="fact-label">{s.ui.ending.importInto}</p>
            <p className="note">{s.ui.ending.importKeeps}</p>
            {SLOTS.map((slot) => {
              const world = importDaily.worlds[slot];
              // The same sentence `isFreeSlot` reads, from the one place it
              // is written (`meta/world.ts`). It was spelled here as well,
              // negated, and the two now gate the same door: as of 2026-09-09
              // a shared board is kept through this picker too.
              const played = hasBeenPlayed(world);
              const isArmed = armed === slot;
              return (
                <button
                  key={slot}
                  type="button"
                  data-slot={slot}
                  className={isArmed ? 'armed' : undefined}
                  onClick={() => {
                    if (played && !isArmed) {
                      setArmed(slot);
                      return;
                    }
                    importDaily.onImport(slot);
                  }}
                >
                  {isArmed
                    ? s.ui.newWorldArmed(slot)
                    : `${s.ui.worldN(slot)} · ${
                        world !== null && played
                          ? `${world.runs} · ${world.bestPoints} · ${s.ui.stats.map} ${world.farthestReach}`
                          : s.ui.emptyWorld
                      }`}
                </button>
              );
            })}
          </>
        )}
        {/* SHARE is the game's entire distribution mechanism: it has no store
            listing and no account, so a run reaches another person because
            somebody pasted this. It sits under the score rather than beside
            NEW RUN, which is the one button the v2.0 gate turns on. */}
        <button type="button" data-action="share" aria-label={s.ui.share} onClick={onShare2}>
          {said ?? s.ui.share}
        </button>
        {/* In the document before it has anything to say — the rule
            `screens/Device` states and the reason a live region works at all. */}
        <span className="visually-hidden" role="status">
          {said ?? ''}
        </span>
        <button type="button" data-door="main" onClick={onMainMenu}>
          {s.ui.mainMenu}
        </button>
        <button type="button" data-door="more" onClick={onMore}>
          {s.ui.menu}
        </button>
      </nav>

      {/*
        THE ONWARD INVITATION (2026-09-02).

        A run that arrived by link gets the same SHARE button as everybody, and
        the chain propagates — but nothing ever said so, so a recipient read it
        as an offer to share a run they felt they had borrowed. One quiet line,
        beside the button that acts on it. Ashwake 1 added it for the same
        reason and called it the cheapest growth in the game.
      */}
      {fromLink === true && <p className="note">{s.ui.cameByLink}</p>}

      {/*
        THE MAP, last: the run you just walked, and you can walk it again.

        Marc: *"in the end screen i loved having my real map to check it back
        again."* It sits under everything because it is the thing you scroll
        BACK to — the numbers answer "how did I do", and this answers "what did
        it look like", which is the question you ask second and the one that
        makes a run memorable.

        It was a PNG of the board and is a DOOR onto the board (2026-08-30) —
        see `onWalk`. Nothing is drawn in the slot, deliberately: a thumbnail
        beside a button that opens the real thing is the ugly picture again, at
        a smaller size.
      */}
      <button type="button" className="end-map" data-action="walk-map" onClick={onWalk}>
        <span className="end-map-name">{s.ui.theMap}</span>
        <span className="end-map-note">{s.ui.walkTheMap}</span>
      </button>
      {/*
        AND THE RUN, PLAYED BACK (2026-09-23).

        Beside the door onto the board rather than up with NEW RUN, because it
        belongs to the same thought: those two are what you do with the run
        that just ended, and NEW RUN is what you do next. Only drawn when a
        film was kept — see `onWatch`.
      */}
      {onWatch !== undefined && (
        <button type="button" className="end-map" data-action="watch-run" onClick={onWatch}>
          <span className="end-map-name">{s.ui.watchRun}</span>
        </button>
      )}
    </div>
  );
}
