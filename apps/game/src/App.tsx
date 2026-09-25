import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GoalId } from '@content/goals';
import type { Colour } from '@content/tuning';
import { dailyBadge, dailyName, dailySeed, dailyStreak } from '@meta/daily';
import { appendEntry } from '@meta/timeline';
import { startingPerk } from '@engine/reduce';
import { NAME } from '@meta/identity';
import type { Action, GameState, HarvestChoice } from '@engine/state';
import type { CellView } from '@render/Renderer';
import { distance, key, parse, type HexKey } from '@engine/hex';
import { namesOf } from '@theme/tokens';
import {
  colourLesson,
  debugLine,
  describeHexOf,
  pocketNote,
  purseLesson,
  rememberedNativeAt,
} from '@view/view';
import { isEnabled } from '@meta/features';
import {
  EMPTY_PROGRESS,
  equip,
  grantFind,
  hasMet,
  perkText,
  withWorldPerks,
  type PerkId,
  type Progress,
  type TeachId,
} from '@meta/progress';
import { metGoalIds, sealGoals } from '@meta/goals';
import { ONLY_WORLD } from '@meta/records';
import {
  worldFromRun,
  mergeRun,
  newWorld,
  UNLOCKS,
  unlockedBy,
  unlockLabel,
  type UnlockId,
  type WorldMemory,
} from '@meta/world';
import { economyFor } from './shell/economy';
import { parseRoute } from '@meta/route';
import { stringsFor } from '@text/index';
import { parseThemeId } from '@theme/index';
import { LESSON_FOR_REWARD, type LessonId } from '@view/lessons';
import { tourMs } from './board/flight';
import type { BoardHandle } from './board/Board';
import { preloadAssets } from './board/assets';
import { commandFor, focusKindOf, takesKey, PAN_STEP, ZOOM_STEP } from './board/keys';
import { cascadeMs } from './board/leap';
import { MAX_RENDER_SCALE } from './board/quality';
import { ActionBar, PocketActions } from './screens/ActionBar';
import { Camera, useCameraCycle } from './screens/Camera';
import { MenuButton } from './screens/Menu';
import { Directions } from './screens/Directions';
import { EndScreen } from './screens/EndScreen';
import { FrontDoor } from './screens/FrontDoor';
import { Hud } from './screens/Hud';
import { LensOff } from './screens/Lens';
import { LensPanel } from './screens/LensPanel';
import { LessonCard } from './screens/LessonCard';
import { SaidCard } from './screens/SaidCard';
import { Fame } from './screens/Fame';
import { Manual } from './screens/Manual';
import { Device } from './screens/Device';
import { More } from './screens/More';
import { Purse } from './screens/Purse';
import { Settings } from './screens/Settings';
import { Shop } from './screens/Shop';
import { Worlds } from './screens/Worlds';
import {
  activeSlot,
  markSaid,
  clearDailyRun,
  clearEverything,
  clearRun,
  clearSlot,
  readDailyBook,
  readDailyRun,
  writeDailyBook,
  readRecords,
  readRun,
  runFor,
  readTimeline,
  readWorld,
  wasSaid,
  readProgress,
  memoryFor,
  type RunMemory,
  freshWorldSeed,
  worldSeedFor,
  onShed,
  holdShed,
  takeHeldSheds,
  settleWorldInto,
  setActiveSlot,
  writeRecords,
  hasReplay,
  readReplay,
  writeReplay,
  writeTimeline,
  type Slot,
} from './shell/storage';
import { tourTarget } from './shell/tourTarget';
import { onceARun, type OnceId } from './shell/onceARun';
import { runningDry } from './shell/dry';
import { aim, perkAt, wornPerk, forgetShelf } from './shell/finds';
import { signpostFor } from './shell/signpost';
import { feelOf, whatHappened } from './shell/happened';
import { handOverOf } from './shell/handOver';
import { holdMeans, tapMeans } from './shell/tap';
import { mayTeach, useSpeaking } from './shell/speaking';
import { bootPlan } from './shell/boot';
import { useHeldWorld } from './shell/held';
import { dial, lookFrom, themeFor, vignetteStyle } from './shell/look';
import { enterRun, type StartedFrom } from './shell/beginning';
import { useOnce } from './shell/useOnce';
import { useLedgers } from './shell/ledgers';
import { shedNote } from '@meta/shedLadder';
import * as voice from './shell/voice';
import { buzz, stopBuzz } from './shell/touch';
import { registerWorker } from './shell/worker';
import { carriedBy, cross, dowryOf } from './shell/cross';
import { useInstallOffer, useToday } from './shell/platform';
import {
  deviceName,
  emptySheet,
  mark,
  note as noteOnSheet,
  startClock,
  startedAnother,
  unnote,
  type Mark,
  type NoteKind,
} from './shell/playtest';
import { Playtest } from './screens/Playtest';
import { renderShareCard } from './shell/shareCard';
import { settle, settleDaily, type Standing } from './shell/settle';
import { share, type ShareResult } from './shell/share';
import {
  campFor,
  createSession,
  paragraphs,
  useSession,
  type Said,
  type Session,
  type Snapshot,
} from './shell/store';
import { useFilm } from './shell/watching';
import type { Replay } from '@meta/replay';
import { useMediaQuery, useReducedMotion } from './shell/useMedia';
import { useDevice } from './shell/useDevice';
import { nextLesson, toastLine, told } from './shell/teaching';
import { walk, walkToEnd } from './shell/walk';
import { Boundary } from './ui/Boundary';
import { DialogStack, useAnyDialogOpen, useDialogStack, useDoor } from './ui/dialog';
import { useDocumentLocale, useThemeVars } from './ui/theme';
import './ui/ui.css';

/**
 * The whole first minute (Stage 3, 2026-08-29).
 *
 * Front door, board, HUD, hand, action bar, purse, teaching, manual, settings,
 * end screen. Everything a stranger touches.
 *
 * **The board mounts once, above every scene** (`CLAUDE.md`): it is rendered
 * for the life of the app and the panels lie OVER it, because unmounting the
 * canvas loses the WebGL context and iOS does not always give one back. That is
 * why the front door is a sibling rather than a route.
 *
 * The look dials are read off the query string so an angle can be argued with
 * by looking: `?tilt=`, `?yaw=`, `?relief=`, `?light=`, `?materials=`, `?art=`,
 * and `?themes=1` for a direction strip over the board.
 * `?seed=` picks a world, `?theme=` a direction, `?place=` plays a fixed
 * opening so two screenshots are two pictures of one board, `?end=1` plays a
 * whole run, and `?taught=1` is a device that has met every lesson.
 *
 * **A run is remembered.** `shell/useDevice` reads what this device kept and
 * `shell/keeper` writes it back — through a keeper that refuses once its
 * session is over, which is what makes the crossing safe.
 *
 * ## WHY THIS FILE IS STILL THIS LONG (2026-09-08)
 *
 * `Game()` is one component with sixty-odd hooks, and it was read with an eye
 * to breaking it up. Two things were taken out and the rest was deliberately
 * left, so the next reader does not have to re-decide it.
 *
 * **What left:** `shell/platform.ts` — whether the browser has offered an
 * install dialog, whether this is somebody's in-app webview, and what today's
 * date is. The test for taking something out of here is not size, it is
 * whether **it can see the game**: those three cannot. They have no dependency
 * on a run, none on each other, and no reason to sit in the path of somebody
 * following a placement. Out of the component they also became testable, which
 * they were not before — "the install note is offered once ever" is a claim
 * about two mounts of a hook, not about a screen, and `platform.test.ts`
 * makes it.
 *
 * **What stayed, and why it is not cowardice:** a run's state, the board
 * handle, `act`'s receipt/voice/haptics/camera seam, the teaching drip, the
 * settle and the ledgers are ONE machine, and they are ordered. `act` is the
 * single place that knows what an action did, which is the whole reason the
 * receipts, the voice, the buzz and the camera trip agree with each other;
 * splitting it into four hooks would replace one readable sequence with four
 * files that each watch for a change they did not cause — and this
 * repository's own scar tissue is full of exactly that failure. The size here
 * is mostly the DESIGN RECORD: of 3.5k lines, roughly half are comments
 * carrying the arguments, and the code left after that is about seventeen
 * hundred lines doing seventeen hundred lines of work.
 *
 * So the honest statement of the problem is not "this file is too long", it is
 * "a new mechanic has no obvious home" — and the answer to that is the seam
 * `act` already is, not a directory of hooks.
 */

/**
 * THE RENDERER ARRIVES AFTER THE DOOR (2026-09-08).
 *
 * three, `@react-three/fiber`, `drei` and troika are 1.18MB of the 1.51MB
 * bundle — 333KB of the 450KB a phone actually downloads — and every byte of
 * it was being parsed before the front door drew a pixel. Nothing on that
 * door, in the manual, in settings or in the hall of fame needs a renderer.
 * The first minute is the minute the stranger test measures, and the largest
 * thing in it was a dependency of a screen the stranger has not reached.
 *
 * **This does not weaken `CLAUDE.md`'s rule that the board host never
 * remounts.** That rule is about REMOUNTING — losing the WebGL context of a
 * canvas that already exists — and nothing here remounts anything. The
 * `<Canvas>` still mounts exactly once, at the same place in the tree, and
 * lives for the rest of the session. All that moved is the moment of its
 * FIRST mount, from "before the door paints" to "a few hundred milliseconds
 * after, while somebody is reading it".
 *
 * `preloadBoard` below is what keeps that from being a trade. The chunk is
 * asked for as soon as the shell has painted, so it is downloading during the
 * seconds the door is being read, and BEGIN is not waiting on a network. The
 * `Suspense` fallback is `null` rather than a spinner on purpose: the board
 * host is behind the door at that moment, and a loading state for something
 * nobody can see is a loading state that can only ever flash.
 *
 * `tourMs` used to come from `Board.tsx` too, which is what made this
 * impossible before — one arithmetic helper holding the whole renderer in the
 * entry chunk. It lives in `board/flight.ts` now, which imports nothing.
 */
const Board = lazy(() => import('./board/Board').then((m) => ({ default: m.Board })));

/**
 * Start fetching the renderer, without waiting for it.
 *
 * The same module specifier as the `lazy` above, so the two resolve to one
 * chunk and this is a head start rather than a second download.
 */
const preloadBoard = (): void => {
  void import('./board/Board');
};

/**
 * How long the camera lingers on a claimed destination before coming home.
 *
 * Long enough to see WHAT was claimed and where, short enough that it never
 * feels like the game took the board away — the flight there and back is
 * 320ms each, so this is the still part in the middle.
 */
const CLAIM_HOLD_MS = 900;

/**
 * How long a finished film holds on the run's last board before the screen it
 * came from comes back (2026-09-23).
 *
 * The same 900 ms a claim's trip holds above, and for the same reason: it is
 * the beat a person needs to take in what they are looking at. A film that
 * cut away the instant the last tile landed would be showing everything except
 * the board the score was counted off.
 */
const FILM_HOLD_MS = 900;

/**
 * How long the shrine tour stands at the shrine, in ms.
 *
 * Longer than a claim's hold, and for the opposite reason. A claim's trip
 * confirms something the player just did and they already know what they are
 * looking at; this one arrives straight off a card that has just named a thing
 * they had never heard of, so the still part in the middle is the first look
 * anyone gets at it. Two flights of 320ms and a wide shot's 320ms hold sit
 * around it — see `BoardHandle.tour`.
 */
const TOUR_HOLD_MS = 1200;

/**
 * How long a boot-time shed report waits for the board to exist, in ms
 * (2026-09-13, `PASS.md` P8.2).
 *
 * Marc ruled that a diary shed before the game is on screen is said at the
 * first board frame rather than at the front door. "The first board frame" is
 * not an event this shell can subscribe to — the scene change and the plane's
 * first draw are not the same commit — so it is a wait, and the wait only has
 * to clear one frame. This is several, deliberately: a sentence about storage
 * arriving in the same breath as the board reads as part of the board coming
 * up, and it is the one line here that the player is meant to stop and read.
 *
 * Shorter than `CLAIM_HOLD_MS` because nothing is being shown — the board is
 * playable throughout and this only decides when the strip speaks.
 */
const SHED_AT_BOARD_MS = 600;

/**
 * The economy a run in this slot plays under, read off the disk.
 *
 * Fresh on every call rather than captured, because the whole point of the
 * shop is that the run AFTER a purchase is different from the one before it —
 * and the session that opens it was built once, at boot, long before the
 * relic was spent.
 *
 * A seed that is not the slot's world is a detour and plays the plain
 * economy: a replay scored under this device's upgrades would not be a replay
 * of anything, and `economyFor` is where that is decided rather than here.
 */
const economyAt = (at: Slot, seed: number) => {
  const world = readWorld(at);
  return world === null || world.worldSeed !== seed
    ? economyFor({ kind: 'detour' })
    : economyFor({ kind: 'home', world, progress: readProgress() });
};

/**
 * How many runs a world has to hold before the game mentions losing it.
 *
 * A judgement rather than an arithmetic: one run is somebody trying the game,
 * and a warning that arrives before there is anything to warn about is noise
 * on the screen that decides whether they press NEW RUN. Three is a player
 * on their third expedition into a place they have been building — the first
 * point at which "this could be lost" is a sentence about something.
 */
const BACK_UP_AFTER_RUNS = 3;

export function App() {
  return (
    <DialogStack>
      <Boundary>
        <Game />
      </Boundary>
    </DialogStack>
  );
}

/**
 * `?theme=` and `?taught=1` override what the device remembers.
 *
 * `taught` is a device that has already met every lesson — no cards, no
 * toasts. It exists for the reason Ashwake 1's fixtures had device HISTORIES:
 * most screens look fine on a virgin phone and the empty version is not the
 * one that breaks, and a screenshot of the board is otherwise a screenshot of
 * whatever card happens to be over it.
 *
 * It is a FLAG rather than a whole `Progress` since 2026-08-30, and the reason
 * is the third history: `?runs=n` (`shell/fixture.ts`) writes a purse, a build
 * and a perk shelf to the disk, and a `taught` override built on
 * `EMPTY_PROGRESS` erased all three on the way back in.
 */
function overrides(): Parameters<typeof useDevice>[0] {
  const params = new URLSearchParams(location.search);
  const theme = parseThemeId(location.search);
  const taught = dial(params, 'taught', 0) > 0;
  // A shared daily opens in the daily. `parseRoute` validates the date against
  // the epoch, so a hand-typed or truncated one simply is not a daily.
  const daily = parseRoute(location.search).daily;
  return {
    ...(theme === null ? {} : { theme }),
    ...(daily === null ? {} : { daily }),
    ...(taught ? { taught } : {}),
  };
}

function Game() {
  const {
    locale,
    setLocale,
    theme: storedTheme,
    setTheme: setStoredTheme,
    renderScale,
    setRenderScale,
    features,
    setFeature,
    progress,
    setProgress,
    slot,
    setSlot,
    daily,
    setDaily,
    keeper,
  } = useDevice(overrides());

  const [started, setStarted] = useState(false);
  /**
   * What the board just said, and — since 2026-08-30 — what it can be OPENED
   * into.
   *
   * Marc: *"i asked previously to not pop as a card everytime, just show points
   * in the bottom and we can tap for details or tap out."* A pop's accounting
   * is worth reading and is not worth a card several times a minute, even a
   * brief one: a brief card still darkens the board, still lands in the middle
   * of the screen, and still has to be waited out or tapped away. So a routine
   * pop is its LEAD LINE — "POPPED 5, total worth 12", the receipt's own first
   * sentence, from `view/receipts.ts` and not composed here — in the strip over
   * the board's bottom edge, where the toast has always lived. Tapping it opens
   * the full receipt as the card it used to be; tapping the board, placing, or
   * anything else that speaks replaces it.
   *
   * `more` is the whole difference between a note and a note you can open, and
   * it travels WITH the text rather than beside it in a second piece of state:
   * two states that must be set and cleared together are two states that come
   * apart. Every plain sentence goes through `say`, which is the same call
   * `setNote` was.
   */
  const [note, setNote] = useState<{ readonly text: string; readonly more: Said | null } | null>(
    null,
  );
  /** Something said, with nothing behind it. The ordinary case, and every
   *  caller that used to hand `setNote` a string. */
  const say = useCallback((text: string | null): void => {
    setNote(text === null ? null : { text, more: null });
  }, []);
  /**
   * The colour lens, held up against the board.
   *
   * Two gestures reach it — a long press on a card in the hand, and a tap on
   * remembered fog — so it lives with the rest of the shell's state rather
   * than beside either one of them.
   */
  const [lens, setLens] = useState<Colour | null>(null);
  /**
   * WALKING THE ENDING'S OWN BOARD (2026-08-30).
   *
   * Marc: *"the ground you walked 'picture' is ugly, i dont want a picture i
   * want to actual screengame where we can move around."*
   *
   * The board never went anywhere. The R3F canvas lives once above every scene
   * and never remounts (`CLAUDE.md`), so at the moment a run ends the real
   * board is still mounted, still holding the exact cells it ended on, and
   * still able to pan, pinch and FIT — it is simply COVERED by an opaque end
   * screen. This flag uncovers it: the ending steps aside to a bar at the
   * bottom, the board takes the keys and the taps back, and the bar puts it
   * back. A scene change, in the sense D1 means, and not a route.
   *
   * The snapshot is still taken. A picture is the right answer in exactly one
   * place — the hall of fame's diary rows, which cannot show a live board per
   * row — and `settle` is where it goes.
   */
  const [walking, setWalking] = useState(false);
  /**
   * THE RUN BEING WATCHED, and where the watcher came from (2026-09-23).
   *
   * Two pieces of state rather than one, because a film is opened from two
   * places and has to put the player back where they were: the end screen's
   * own button, and a row in the hall of fame — which is a panel, closed while
   * the film plays over the board and reopened when it is done. A film that
   * always returned to the ending would strand somebody who was three taps
   * into their diary.
   *
   * `shell/watching.ts` is the projector; `meta/replay.ts` is what a film is.
   */
  const [reel, setReel] = useState<{
    readonly of: Replay;
    readonly from: 'end' | 'fame';
    /** The world's remembered ground, read when the film was opened — see
     *  `useFilm`'s `ground`. */
    readonly ground: RunMemory;
  } | null>(null);
  /**
   * FRAME THE BOARD A RUN OPENS ON (2026-08-30).
   *
   * Marc: *"make sure when we start a new world or daily its centered on the
   * starting tile."*
   *
   * The rig fits the board **once ever**. `framedOnce` is a ref, and the rig is
   * inside the R3F host, which by rule never remounts (`CLAUDE.md`) — so the
   * one thing that guarantees a first fit is the one thing a new world does not
   * get. Stepping into world 3 from a board you had panned two screens east
   * opened world 3 two screens east of its settlement, on an empty plane, with
   * nothing on screen to say which way to walk.
   *
   * That ref is right about what it was written for: a PLACEMENT must not move
   * the board (Marc, 2026-08-29, and the comment in `Board` is the whole
   * argument). The camera moves when it is asked to and never on its own. This
   * is an asking. Every way into a run — NEW RUN, a world, today's daily —
   * bumps it, and the effect below is the only caller.
   *
   * A counter rather than a boolean, so two runs in a row are two frames; and
   * state rather than a direct `flyToFit()` at each call site, because at the
   * moment `session.restart` is dispatched the board has not yet been told
   * what it is showing. The effect runs after that render, and the rig's own
   * frame effect — a child's, so it runs first — has already landed.
   */
  const [framing, setFraming] = useState(0);
  const frameTheRun = useCallback(() => setFraming((n) => n + 1), []);
  /**
   * WHAT THIS RUN STARTED FROM — the three ledgers its gains are measured
   * against.
   *
   * Captured at the moment a run BEGINS, because "new" is a difference and the
   * ledgers have already moved on by the time the end screen renders. A ref
   * rather than state: nothing renders from the starting values, only from the
   * difference computed against them at settle. And the reach in particular
   * must be captured rather than re-read — the world's memory is kept current
   * by the merge now, so a live read would move the boundary the moment the
   * run crossed it and NEW GROUND would never fire.
   *
   * **One object rather than three refs, lazily initialised** (2026-08-30).
   * They were three, each defaulting to empty, and every run set them EXCEPT
   * the one the page opens on: that run arrives through BEGIN on the front
   * door, or through `?end=1` before React has mounted at all. So the first
   * run after opening the app measured its gains against nothing, and the end
   * screen told a returning player they had woken every shrine and found every
   * perk their world already held. Invisible on a fresh device — where the
   * world holds neither and the empty default is right by accident — which is
   * how it survived, and it is what the audit's `end-many` shot showed in
   * every direction: five WOKE lines and five A FIND lines on a run that
   * gained nothing.
   *
   * The null check is the initialisation, which is the one shape
   * `react-hooks/refs` allows during a render and the reason this is one
   * object: an effect would run AFTER the settle effect that reads it, and on
   * an `?end=1` boot the run is already over by the first render.
   */
  const startedFrom = useRef<StartedFrom | null>(null);
  if (startedFrom.current == null) {
    const world = readWorld(activeSlot());
    startedFrom.current = {
      reach: world?.farthestReach ?? 0,
      perks: world?.perks ?? [],
      unlocks: unlockedBy(world ?? newWorld(0)),
    };
  }
  /** What a run beginning HERE starts from — one place, so the four doors into
   *  a run (BEGIN, NEW RUN, BEGIN AT CAMP, a world switch) cannot disagree. */
  const startsFrom = useCallback(
    (slot: Slot, perks: readonly string[]): StartedFrom => {
      const world = readWorld(slot);
      return {
        reach: world?.farthestReach ?? 0,
        perks,
        unlocks: unlockedBy(world ?? newWorld(0)),
      };
    },
    // `StartedFrom` is a type; nothing here closes over a value.
    [],
  );

  const [gained, setGained] = useState<{
    readonly perks: readonly string[];
    readonly unlocks: readonly string[];
  }>({ perks: [], unlocks: [] });
  /**
   * The world this run left behind, for the ending to show (2026-09-01).
   *
   * Written once by the settle effect, from the very copy that reaches the
   * disk. Null on a detour and on a daily, neither of which HAS one.
   */
  const [endWorld, setEndWorld] = useState<WorldMemory | null>(null);
  /**
   * Where the run that just ended stands, and which try a daily was.
   *
   * Both are written by the two settle paths and read only by the ending. They
   * are STATE rather than derived, for `goals`' own reason: a standing is the
   * difference between a book before and after, and once the book is written
   * that difference is gone.
   */
  const [standing, setStanding] = useState<Standing | null>(null);
  const [dailyTry, setDailyTry] = useState<number | null>(null);
  /**
   * The board as this run left it, taken once at the settle.
   *
   * Two readers, and they must be the same frame: the diary row, and the share
   * card that ghosts it behind the score. A ref rather than state because
   * nothing RENDERS from it — the ending walks the live board — and because it
   * has to be readable from `onShare` at a moment the settle is long past.
   */
  const endShot = useRef<string | null>(null);
  /**
   * THE FILM OF THE RUN THE END SCREEN IS ABOUT (2026-09-23).
   *
   * Taken once, at the moment a run is banked, and it describes the ENDING
   * rather than the session — which by then has been restarted by whatever the
   * player does next. Reading the film back off the disk here would work and
   * would be a second source for a thing that is already in hand.
   *
   * State rather than a ref beside `endShot`, because the end screen draws a
   * door from it: a ref read during render is a value React cannot see change
   * (`react-hooks/refs`), and the door would be missing on exactly the render
   * where the run ends.
   */
  const [endFilm, setEndFilm] = useState<Replay | null>(null);
  /**
   * A receipt that is holding the screen, waiting to be dismissed.
   *
   * Held rather than derived from the snapshot: a card outlives the dispatch
   * that produced it — the player reads it, then taps GOT IT — and the session
   * has moved on by then.
   */
  const [saidCard, setSaidCard] = useState<Said | null>(null);
  /**
   * The perk the card on screen is about, so its WEAR button knows what it
   * would put on (2026-09-05).
   *
   * Beside `saidCard` rather than inside it: `Said` is the CORE's type and a
   * receipt is a sentence, not a shelf. The find branch below is the only
   * writer, and it is cleared on the same dismissal that clears the card, so
   * the two cannot come apart.
   */
  const [cardPerk, setCardPerk] = useState<PerkId | null>(null);
  /**
   * The id for an utterance the SHELL raises rather than the session.
   *
   * `Said.id` is "said again" versus "still saying" — the identity a card is
   * keyed on so a second one is a second card. The session mints them for the
   * receipts; anything the shell raises on its own needs one from somewhere,
   * and a counter that only ever moves one way is the whole of it. It moves
   * DOWN: negative ids cannot collide with a session's, which count up.
   *
   * The sentence said "only goes up" until 2026-09-10 while the one caller
   * decrements — true of the mechanism, backwards about the direction, and the
   * next line explains why the direction is the point. Found reading the
   * region for `PASS.md` P2.8.
   */
  const shellSaid = useRef(0);
  /** Goals this run was the one to meet, for the end screen. */
  const [goals, setGoals] = useState<readonly GoalId[]>([]);
  /**
   * Put the last ending down (2026-09-01).
   *
   * Three pieces of state belong to a RUN THAT HAS ENDED — what it woke, what
   * world it left behind, what it was the first to prove — and all three are
   * written by the settle effect, which **a daily returns from before it
   * reaches them** (a daily banks down `settleDaily`'s much shorter path). So
   * whatever the last home run left in them was still there when a daily's own
   * ending rendered: `setGoals([])` was in `startRun` alone and covered exactly
   * one of the five doors into a run.
   *
   * One function called by every door, for the reason `startRun`'s docblock
   * gives about `wakeAt`: everything a run starts from has to be put down in
   * one order, or two doors disagree about what a run starts from.
   */
  /**
   * The nearest destination at the last look.
   *
   * `undefined` until this run has looked once, which is the priming beat and
   * is silent — a player resuming a board should not be greeted with a toast
   * about ground they already knew was there. Declared ABOVE `forgetEnding`,
   * which resets it: a ref referenced by a hook declared before it is a ref
   * `react-hooks/immutability` will not let anything write to.
   */
  const signpost = useRef<string | null | undefined>(undefined);
  /** Whether the running-dry warning is standing. Per run — see `shell/dry.ts`. */
  const dry = useRef(false);
  /*
   * ONE SPEAKER AT A TIME — the registry, the count and the rule are all in
   * `shell/speaking.ts`, which carries the argument and Marc's report.
   *
   * `silence` is what a door out of a run owes: every timer dropped and the
   * count with it, which `forgetEnding` below spends.
   */
  const { speaking, speakAfter, silence } = useSpeaking();
  const forgetEnding = useCallback(() => {
    silence();
    setGained({ perks: [], unlocks: [] });
    setEndWorld(null);
    setGoals([]);
    setStanding(null);
    setDailyTry(null);
    endShot.current = null;
    // A new board is a new set of neighbours: the signpost primes again rather
    // than announcing, on the next look, whatever happens to be near the wake
    // hex. See `shell/signpost.ts`.
    signpost.current = undefined;
    // A fresh purse is not a dry one, whatever the last run ended on.
    dry.current = false;
    // And the shelf a find would be judged against belongs to the board being
    // left. The next dispatch aims it again; until then, nothing is promised.
    forgetShelf();
    // `silence` is a `useCallback` with no deps of its own, so this list is
    // stable — but it is DECLARED rather than left out, because the empty array
    // was true of the three inlined statements this call replaced and is not
    // true of a call.
  }, [silence]);
  /** What this run has already said once. See `startedFrom` for the reach. */
  const saidOnce = useRef<Set<OnceId>>(new Set());

  const [purseOpen, setPurseOpen] = useState(false);
  /** The lens panel, over the hand — see `screens/LensPanel`. One sheet at a
   *  time: opening this closes the purse and the purse closes this. */
  const [lensOpen, setLensOpen] = useState(false);
  const [term, setTerm] = useState<LessonId | null>(null);
  /**
   * A new build has taken over underneath this page.
   *
   * Offered, never taken: reloading under a player would lose the run they are
   * in the middle of, which would make the update mechanism eat the thing it
   * exists to protect. This is one of the two reloads `CLAUDE.md` allows, and
   * it is the player's tap.
   */
  const [updated, setUpdated] = useState(false);
  useEffect(() => {
    return registerWorker(() => setUpdated(true));
  }, []);

  /**
   * Fetch the renderer while the door is being read (2026-09-08).
   *
   * `Board` is lazy so the front door does not wait on 333KB of three — see
   * its declaration. This is the other half of that trade, and without it the
   * trade would be a bad one: BEGIN would be the first thing to ask for the
   * chunk, and a player on a slow connection would press it and watch nothing
   * happen.
   *
   * In an effect, so it runs after the first paint and never before it: the
   * whole point is that the door draws first. Deliberately NOT inside
   * `whenIdle` the way the service worker's registration is — the worker makes
   * the SECOND visit better and can afford to wait its turn, while this is
   * needed the moment somebody presses a button on the screen they are
   * looking at.
   */
  useEffect(preloadBoard, []);

  /*
   * WHERE THIS GAME IS LIVING, and WHAT DAY IT IS — both in `shell/platform`
   * (2026-09-08). Facts about the phone rather than about the game, with no
   * dependency on a run and none on each other, so they are hooks with their
   * own tests instead of forty lines a reader following a placement has to
   * walk past. The arguments moved with them.
   */
  const { inApp, dismissInApp, offerInstall, showHandInstall } = useInstallOffer(!started);

  const s = useMemo(() => stringsFor(locale), [locale]);
  /*
   * A full disk says which rung it spent.
   *
   * The alternative is silence: the ladder frees room, the run is saved, and
   * the player's diary is simply gone one day with nothing said. "Some history
   * was cleared" is a fair description of the diary and a lie about a world,
   * which is why each rung has its own sentence.
   */
  useEffect(() => {
    // Returns its own unsubscribe now: this effect re-runs on every language
    // change, and a registry with one slot and no cleanup quietly kept the
    // last closure registered past the life of the component that made it.
    return onShed((rung) => {
      /*
       * A REPORT THAT ARRIVES BEFORE THERE IS A STRIP TO SAY IT ON IS PUT BACK
       * (2026-09-13, `PASS.md` P8.2, Marc's ruling: hold it to the first board
       * frame).
       *
       * `.toast` is rendered under `playing`, so `say` at the front door sets a
       * note nothing displays — which is exactly how a full device's boot shed
       * went unmentioned for four stages. Being SUBSCRIBED is not the same as
       * having somewhere to speak, and this effect is subscribed from mount.
       */
      if (started) say(shedNote(rung, s));
      else holdShed(rung);
    });
  }, [s, say, started]);

  /*
   * The device's own preferences, FOLLOWED rather than sampled.
   *
   * All three used to be read once — the scheme and the contrast inside this
   * memo, and reduced motion nowhere at all — which on a page that never
   * reloads means a phone crossing sunset keeps the direction it booted in.
   * `useMediaQuery` carries the `change` listener; `pickForScheme` stays pure
   * because the shell is what samples.
   */
  const wantsLight = useMediaQuery('(prefers-color-scheme: light)');
  const wantsContrast = useMediaQuery('(prefers-contrast: more)');
  const reducedMotion = useReducedMotion();

  /*
   * AND THE ONES SPENT BEFORE THERE WAS ANYWHERE TO SAY THEM (2026-09-13,
   * `PASS.md` P8.2, Marc's ruling: hold it until the first board frame).
   *
   * A device that is already full runs the whole ladder on its first write,
   * which happens before this component exists — so the effect above was
   * subscribing to an event that had already fired. `storage.ts` keeps those
   * reports instead of dropping them; this is where they are spent.
   *
   * Keyed on `started` rather than on mount, because mounting is the FRONT
   * DOOR and the ruling was explicitly not to put a sentence about storage on
   * the one screen whose whole job is a stranger's first minute. `takeHeld
   * Sheds` empties itself, so a second BEGIN in the same page says nothing a
   * second time.
   *
   * They are said in the order the ladder climbs, so if a boot spent more than
   * one rung the line left standing is the deepest — which is the one worth
   * reading.
   *
   * Through `speakAfter` rather than straight into `say`, which is the ruling's
   * own words — *"through the same speaking queue every other line uses"* — and
   * is right for two reasons beyond obedience. The scene change into the board
   * happens in this commit; a sentence set in the same one is a sentence
   * printed over a plane that has not drawn yet. And for the length of the
   * wait `speaking` is non-zero, so `mayTeach` holds a lesson that came due on
   * the same dispatch instead of stacking it over this one. Reduced motion
   * takes it immediately, as everything else here does.
   */
  const shedWait = reducedMotion ? 0 : SHED_AT_BOARD_MS;
  useEffect(() => {
    if (!started) return;
    for (const rung of takeHeldSheds()) speakAfter(shedWait, () => say(shedNote(rung, s)));
  }, [started, s, say, speakAfter, shedWait]);

  const theme = useMemo(
    () => themeFor(storedTheme, wantsLight, wantsContrast),
    [storedTheme, wantsLight, wantsContrast],
  );
  useThemeVars(theme);
  useDocumentLocale(locale);
  /*
   * This session's live copy of the world — `shell/held.ts` holds the ref, the
   * one door every writer goes through, and the argument for both.
   *
   * It is read here, ABOVE the session, because `crossingCarries` prices the
   * crossing's offer off it and `takeCrossing` banks the same number: that
   * "by construction" is only true if both reach the same world.
   */
  const { worldHeld, keepWorld, forgetWorld } = useHeldWorld(keeper);

  /**
   * THE SESSION IS BUILT ONCE, AND A `useMemo` COULD NOT PROMISE THAT
   * (2026-09-02).
   *
   * This was `useMemo(..., [])` behind an `exhaustive-deps` disable, and what
   * it does inside is not a computation: it mints a world seed and **writes it
   * to `localStorage`**, it reads the run off the disk, it registers callbacks,
   * and with `?place=n` or `?end=1` it walks the reducer through a whole
   * scripted run.
   *
   * `useMemo` gives no guarantee of running once. React may drop a memo at any
   * time, and under StrictMode — which `main.tsx` turns on deliberately — it
   * **double-invokes the factory on purpose**, which is exactly how it catches
   * side effects in render. It was catching one: in dev, two sessions were
   * built, two seeds could be minted, and `?end=1` played its whole run twice.
   * The audit and the e2e suite both run against the production build, where
   * StrictMode is off, so nothing ever saw it.
   *
   * The lazily-initialised ref is the shape this file already reaches for when
   * something must be built exactly once during a render — `startedFrom` uses
   * it and says why: an effect would run AFTER the effects that read it, and
   * on an `?end=1` boot the run is already over by the first render.
   *
   * It is still a side effect in render, and that is still not free. What it is
   * now is a side effect that happens ONCE, stated as such, rather than one
   * hiding behind a memo's promise that it does not make. `shell/useOnce.ts`
   * carries the whole argument, including why an effect and a lazy `useState`
   * are both wrong here.
   */
  const session = useOnce(buildSession);

  /*
   * THE SESSION IS TOLD WHAT LANGUAGE THE PLAYER READS, on every change.
   *
   * Marc, playing on 2026-09-10: *"im stupposed to be in french but i got
   * english translations at some places"* — a woken shrine's unlock, a death
   * sentence and a beacon's line, all English, under a COMPRIS button.
   *
   * `buildSession` runs through `useOnce`, so the catalogue it was handed was
   * the one this PAGE booted in, and `store.ts` read it out of the closure
   * forever after. Every React string re-rendered when LANGUE changed and
   * every sentence the core computes did not — the epitaph, the signpost, a
   * claim's receipt, a spend's — because nothing could give the session a
   * second catalogue. And the page never reloads: one page, many sessions is
   * a hard rule, so there was no moment at which it would have corrected
   * itself.
   *
   * An effect rather than a call during render, because `resupply` commits to
   * the store and notifies subscribers, and a store that publishes mid-render
   * is the tearing `useSyncExternalStore` exists to prevent.
   */
  useEffect(() => {
    session.resupply(theme, s);
  }, [session, theme, s]);

  /* Every dial the query string can turn — `shell/look.ts` carries them and
     the argument for each. Read once, at boot: a dial is set before the page
     opens and `location` cannot change under a page that never reloads. */
  const look = useMemo(() => lookFrom(location.search), []);

  /* The vignette, or null where the direction authors none — `shell/look.ts`
     has the argument for it being a style rather than a stylesheet. */
  const vignette = useMemo(() => vignetteStyle(theme, look.vignette), [theme, look.vignette]);
  /*
   * And the direction's ART, the moment the direction is known (2026-09-11).
   *
   * `preloadBoard` above fetches the renderer while the door is being read;
   * this fetches the PNGs the renderer will want beside it, rather than after
   * it mounts — which was the second a board spent procedural before every
   * material on it swapped at once. Same promise `useAssets` waits on, so it
   * is a head start and never a second download. `?art=0` asks for nothing.
   */
  useEffect(() => {
    if (look.art) void preloadAssets(theme.id);
  }, [theme.id, look.art]);

  /*
   * THE STRANGER'S SHEET, and the door onto it (Stage 6, 2026-09-08).
   *
   * `screens/Playtest` is the console and `shell/playtest` is its model; both
   * carry the argument. What lives here is the two halves that only `App` has:
   * the sheet itself, and the marks — because the facts Session C asks for are
   * facts this component already watches go by.
   *
   * The sheet exists whether or not the console is open, and that is
   * deliberate: `?playtest=1` is set before the stranger arrives, and the
   * whole value is that the clock and the four facts are running while Marc's
   * eyes are on a person rather than on this screen. Opening and closing the
   * console reads a record that has been keeping itself.
   */
  const playtest = useDoor('playtest');
  const [sheet, setSheet] = useState(() => emptySheet(deviceName(navigator.userAgent), theme.id));
  const watching = look.playtest;
  const noteSheet = useCallback(
    (kind: NoteKind, text: string) => setSheet((was) => noteOnSheet(was, kind, text, Date.now())),
    [],
  );
  const unnoteSheet = useCallback((at: number) => setSheet((was) => unnote(was, at)), []);
  /**
   * Mark one of Session C's four facts, from wherever it actually happens.
   *
   * A no-op unless `?playtest=1`, so the ordinary game pays one boolean per
   * dispatch for it. `mark` is once-only and refuses a mark before the clock
   * starts, so every caller can be unconditional — see `shell/playtest`.
   */
  const witness = useCallback(
    (which: Mark) => {
      if (!watching) return;
      setSheet((was) => mark(was, which, Date.now()));
    },
    [watching],
  );
  /** The clock starts on the first PLACEMENT, not at BEGIN: every elapsed time
   *  on the sheet is measured from the moment the run became a run. */
  const startWatching = useCallback(() => {
    if (!watching) return;
    setSheet((was) => startClock(was, Date.now()));
  }, [watching]);
  /** The gate, from `enterRun` — the one door every run comes through. The
   *  rule that a FIRST run does not count is `startedAnother`'s. */
  const wentAgain = useCallback(() => {
    if (!watching) return;
    setSheet((was) => startedAnother(was, Date.now()));
  }, [watching]);

  function buildSession(): Session {
    /*
     * WHICH BOARD THIS PAGE OPENS ON — the ladder is `shell/boot.ts`.
     *
     * It is `MODES.md`'s **boot** door: the one door that is not `enterRun`,
     * and the only place in the game where `detour` can become true. The
     * decision is nothing but its inputs, so it is a function with the disk
     * passed in; what stays here is the session itself, whose callbacks close
     * over the very object being built.
     */
    const plan = bootPlan(location.search, slot, {
      dailyRun: readDailyRun,
      run: readRun,
      worldSeed: worldSeedFor,
      world: readWorld,
    });
    const { daily: opening, seed, detour } = plan;

    const made = createSession({
      seed,
      detour,
      /*
       * THE ECONOMY, which this body had never once handed over (2026-08-30).
       *
       * `createSession` has taken a `tuning` since Stage 1 and no caller
       * ever passed one, so every run played the bare `TUNING`: the shop's
       * upgrades, every perk found or worn, and all four shrine unlocks were
       * announced and changed nothing. See `shell/economy.ts`.
       */
      tuning: opening !== null ? economyFor({ kind: 'daily' }) : economyAt(slot, seed),
      // A daily is walled off by construction; everything else asks the world,
      // and `memoryFor` hands back nothing when the seed is not its own — so
      // a shared link borrows a geography and never this device's history.
      ...(opening !== null ? {} : { memory: memoryFor(slot, seed) }),
      theme,
      strings: s,
      resume: plan.resume,
      /*
       * `?camp=1` — BEGIN AT CAMP, on the URL (2026-08-30).
       *
       * `meta/route.ts` has parsed this field since the rules were lifted and
       * nothing in this body read it. The ordinary way to camp is the WORLDS
       * panel's button, which is a state change; this is the same door for a
       * hand-typed link and for the screen audit, which is how a camp run gets
       * photographed at all.
       *
       * Every guard is the same one `campFor` keeps, plus two this level
       * knows: a RESUMED run carries its own wake hex, and a detour or daily
       * has no world to have a farthest territory in.
       */
      wakeAt: plan.wakeAt,
      /*
       * What crossing would carry, priced at the moment a fully-awake world's
       * shrine is reached — so the card's offer and the amount banked are the
       * same number by construction. Read through the session's OWN state
       * rather than a captured one, because the run has moved by then.
       */
      /*
       * A find's receipt names what it gave — see `finds` and `act`.
       *
       * `grantFind` is deterministic in (shelf, world seed, hex), and the shelf
       * handed over is the one from just before the grant, so this is the very
       * perk the shell is about to hand out rather than a second guess at it.
       * Null wherever nothing will be granted, which is what makes the daily
       * and the shared seed go on saying "only on your own world".
       */
      perkAt,
      wornPerk,
      /*
       * The LIVE copy, by seed — see `worldHeld`. This read the disk, which is
       * one flush behind every seam that writes a world.
       *
       * `react-hooks/refs` sees a function that reads a ref being handed to
       * another function during render and refuses it, which is the right
       * default and the wrong answer here: this is a CALLBACK, stored and
       * invoked later from `speak()`, which only ever runs inside a dispatch.
       * Nothing about it is rendered, so there is no render that could go
       * stale. The alternative it would push us to — reading the disk — is the
       * bug being fixed.
       */
      crossingCarries: () => {
        const here = made.get().state;
        const world = worldHeld(here.rootSeed);
        return { dowry: dowryOf(world), carried: carriedBy(here, world) };
      },
      /*
       * The shrine claim's own receipt reads the same live count `describe`
       * does (2026-09-03) — a shrine reached mid-run used to be named by
       * `countShrines`, THIS run's own cells alone, so a world already a few
       * shrines awake had its next claim announce an unlock the player
       * already had (Marc: tapped a shrine promising the fourth draft card
       * he already owned, and it granted the fifth unlock when he reached
       * it — the tap's own preview had been fixed to read the world; this
       * receipt, its sibling, had not).
       */
      shrinesClaimed: () => {
        const here = made.get().state;
        return detour ? 0 : (worldHeld(here.rootSeed)?.shrines.length ?? 0);
      },
    });
    // `?place=n` plays a fixed opening; `?end=1` plays a whole fixed run, so
    // the end screen can be looked at without playing for ten minutes. Both
    // numbers are read and clamped by `bootPlan`.
    if (plan.toEnd) walkToEnd(made);
    else walk(made, plan.place);
    // One session per run: language and direction change what it SAYS and how
    // it looks, never what it IS, so neither may restart it.
    return made;
  }

  const snap = useSession(session);

  /**
   * THE PROJECTOR, running whatever reel is in it (2026-09-23).
   *
   * `null` whenever nothing is being watched, which is almost always. What it
   * hands back is a snapshot shaped exactly like the live session's, so the
   * board can be handed one or the other without knowing which.
   */
  const followTo = useCallback((at: HexKey): void => {
    board.current?.follow(at);
  }, []);
  const film = useFilm(reel?.of ?? null, {
    theme,
    strings: s,
    ...(reel === null ? {} : { ground: reel.ground }),
    // The camera follows the run as it is played back — eased, never stepped
    // (`BoardHandle.follow`, Marc 2026-09-24: "more fluid, less step-y").
    onMove: followTo,
  });

  /**
   * STEP ONTO THE BOARD — and say what the world is paying for it (2026-09-02).
   *
   * The five doors into a run all ended in `setStarted(true)` and nothing else,
   * so nothing on the arrival beat spoke. `startingPerk`'s own docblock in the
   * engine says why that matters: *"Pure and exported so the UI can say WHY the
   * starting number is not 30 — a perk nobody can see is indistinguishable from
   * a bug."* Nothing in this body called it, so the single thing territories DO
   * between runs was invisible: hold four of them, start with more tiles, and
   * be told nothing connecting the two.
   *
   * An event handler rather than an effect on the framing counter, which is
   * where this was written first: a run beginning is something the player DID,
   * and `react-hooks` is right that an effect setting state on it is a
   * cascading render. It also covers the door the counter does not — BEGIN on
   * the front door resumes the board this page booted with and never frames.
   *
   * Silent where nothing was paid, by arithmetic rather than by a guard: a
   * detour and a daily hold no territories, and neither does a first run.
   */
  /**
   * THE TOAST HALF OF THE DRIP — the speaker it never had (2026-09-03).
   *
   * `nextLesson` returns toast-class moments again, and this is what says
   * them: one line, through the same `say` every other quiet sentence uses,
   * told through the same ledger the cards write. Called only on QUIET beats
   * — a dispatch no receipt claimed (`act`), a card's dismissal, a run's
   * first breath (`beginRun`) — so a lesson never talks over a receipt; a
   * moment that stays true keeps until the next quiet beat, which is the
   * priority-list contract restated.
   *
   * Told only when a line was actually SPOKEN. `toastLine` returning null
   * (a `field` whose cell has left the view) leaves the ledger untouched —
   * the purse lesson is the standing proof of what marking unshown words
   * told costs.
   *
   * Takes the ledger to judge against rather than reading the render's copy:
   * a card's dismissal calls this with the ledger that dismissal just wrote,
   * a beat before React has it.
   */
  const speakLesson = useCallback(
    (after: Progress, at: Snapshot): boolean => {
      // An ended run teaches nothing and marks nothing told — `mayTeach`'s
      // `ended` clause, for the half that does not go through it.
      if (at.hud.ended) return false;
      const moment = { board: at.board, hud: at.hud, placed: at.hud.placements > 0 };
      const due = nextLesson(moment, after);
      if (due === null || due.as !== 'toast') return false;
      const line = toastLine(due.id, moment, at.state.tuning, theme, s);
      if (line === null) return false;
      setProgress((p) => told(p, due.id));
      say(line);
      return true;
    },
    [theme, s, say, setProgress],
  );

  /**
   * READ IT, THEN LOOK AT IT — and the next card waits its turn.
   *
   * Marc, 2026-09-06, of the shrine: *"make sure when a shrine is first
   * described, to zoom on it then zoom back where the user was (same view) so
   * its clearer"*, with the shape of the trip his too: *"zoom out then zoom in
   * then back"*. Widened 2026-09-08: *"yes do the same for caches, sites and
   * territories and other concepts on the map"*.
   *
   * Which hex each lesson means is `shell/tourTarget.ts`, and which lessons
   * mean one at all — POP, RARE and the run's own numbers do not, WALL and
   * FIELD do and are declined there with the reason.
   *
   * **`touring` is the whole mechanism, and it is a gate rather than a queue.**
   * The drip fires one card per moment and a dismissal can raise the next
   * immediately — `ORDER` runs cache, site, shrine, territory back to back, and
   * the beacons on the horizon mean several kinds can be visible at once. Three
   * shapes were possible and only this one gives every concept its own look:
   *
   *   - Fire on the dismissal and let the next card come: the board flies
   *     around behind a fresh 94% scrim, which is a camera move nobody sees.
   *   - Hold the trip until no card is due: one trip for a run of three cards,
   *     so two concepts are taught and never shown.
   *   - **Hold the CARD until the trip lands**, which is this. Read, look,
   *     read, look — and each leg of it is a thing the player was already
   *     stopped for.
   *
   * The clock is `tourMs`, run here rather than reported by the board: see
   * `tourMs` for why a duration cannot be forgotten and a callback can. The
   * timer is cleared on unmount, so a trip in the air when the page goes does
   * not set state on a screen that has left.
   */
  const [touring, setTouring] = useState(false);
  const touringTimer = useRef<ReturnType<typeof setTimeout> | 0>(0);
  useEffect(
    () => () => {
      if (touringTimer.current !== 0) clearTimeout(touringTimer.current);
    },
    [],
  );
  /**
   * THE TOUR IS OVER: the timer and the flag, together (2026-09-10).
   *
   * Two callers spelled this pair out — the timeout that ends a trip on its
   * own, and a tap that ends one early — and **a flag and its timer cleared in
   * two places are two things that come apart.** Found extracting P2.3.
   *
   * The BOARD's own return is deliberately not in here: a trip that runs its
   * course ends itself, and only the tap has to ask for it.
   */
  const putTourDown = useCallback(() => {
    if (touringTimer.current !== 0) clearTimeout(touringTimer.current);
    touringTimer.current = 0;
    setTouring(false);
  }, []);
  const showOnBoard = useCallback(
    (id: TeachId): void => {
      const at = tourTarget(id, session.get().board);
      if (at === null || board.current === null) return;
      board.current.tour(at, TOUR_HOLD_MS);
      setTouring(true);
      if (touringTimer.current !== 0) clearTimeout(touringTimer.current);
      touringTimer.current = setTimeout(() => putTourDown(), tourMs(TOUR_HOLD_MS));
    },
    [session, putTourDown],
  );

  const beginRun = useCallback(() => {
    setStarted(true);
    /*
     * THE FRONT DOOR'S BEGIN IS AN OPENING TOO — and it was the one that was
     * not (found 2026-09-23, building the welcome beat).
     *
     * `enterRun` frames every run it opens, and the boot door is not
     * `enterRun` (`MODES.md`): a page that loads, fits its rig at mount and
     * then has BEGIN pressed never called `BoardHandle.open` at all. So the
     * opening Marc asked for on 2026-09-16 — _"whole world, then fly in"_,
     * built the same day — has only ever played on NEW RUN, a world switch or
     * the daily, and never on the front door. **That is the first run of every
     * page, which is the run a stranger plays.** The beat was written, tested,
     * shipped and unreachable from the one door that matters most.
     *
     * The effect on `framing` is where both the fly-in and the welcome hang,
     * so framing here is the whole fix. It is not "the board moving on its
     * own" that the effect's own docblock refuses: that sentence is about the
     * MOUNT, where nobody has asked for anything. This is a person pressing
     * BEGIN.
     *
     * Before the territory line's early return below, because a run that
     * opens with a gift is still a run opening.
     */
    frameTheRun();
    const at = session.get();
    const from = startingPerk(at.state.tuning, at.state.claimed.length);
    if (from > 0) {
      say(s.ui.fromTerritories(from));
      return;
    }
    /*
     * The run's first breath is a quiet beat too — and for PLACE it is the
     * only one there is: its moment is true only before the first placement,
     * and no dispatch happens in that window. The territory line above still
     * outranks it; the lesson stays armed for the next quiet beat, which on
     * the one board where both are true is the story card's dismissal.
     */
    speakLesson(progress, at);
  }, [session, s, say, progress, speakLesson, frameTheRun]);
  const board = useRef<BoardHandle>(null);

  // Every state the reducer produces is offered to the keeper, which decides
  // when it actually reaches the disk — and refuses entirely once its session
  // is over. A finished run is CLEARED rather than kept, so BEGIN means begin.
  // `slot` was in this list and is read by nothing in it: the keeper already
  // knows its own place (`keeperFor`), and a dependency that is not a
  // dependency is a reader asking which line uses it and finding none.
  useEffect(() => {
    if (!snap.hud.ended) keeper.saveRun(snap.state);
  }, [snap.state, snap.hud.ended, keeper]);

  /**
   * A finished run is BANKED, once.
   *
   * The ground it walked folds into the world, the shelf of bests takes it,
   * and the diary gets a row — which is what gives the shop and the hall of
   * fame anything to show. Once, because the end screen can re-render for any
   * reason and a run counted twice is a world that remembers ground nobody
   * walked. The state object is the identity: the reducer produced exactly one
   * for this ending.
   */
  const [showBackUp, setShowBackUp] = useState(false);

  const banked = useRef<GameState | null>(null);

  useEffect(() => {
    if (!snap.hud.ended || banked.current === snap.state) return;
    banked.current = snap.state;

    /* Session C's third fact, on the one line that runs exactly once per
     * ending. A no-op without `?playtest=1` — see `witness`. */
    witness('finished');

    /*
     * The board as it ended, taken ONCE — for the diary row and for the share
     * card, which must be the same frame or the picture in the chat is not the
     * picture in the hall of fame. See `endShot`.
     *
     * Above the daily branch since 2026-09-02: `settleDaily` has accepted a
     * `shot` since it was written and this file never passed one, so every
     * daily row in the diary opened without a picture while every world run's
     * had one. The ending is the same board either way.
     */
    const picture = board.current?.snapshot() ?? null;
    endShot.current = picture;

    /*
     * ONE CLOCK READING FOR THE ENDING, and the film is filed under it
     * (2026-09-23).
     *
     * `Date.now()` used to be called inside each settle call, which was fine
     * while the number only had to be A time. It is an IDENTITY now: a diary
     * row's `at` is the only handle a row has (`meta/timeline.ts`), and it is
     * what the row's replay is stored under — so the row and its film have to
     * be filed under the same number, and two reads of the clock are two
     * numbers waiting to differ by a millisecond.
     */
    const at = Date.now();
    /*
     * THE FILM, KEPT (Marc, 2026-09-23: _"i'd like to be able to replay the
     * pops and tile placements too"_ — and, asked how far back, _"every run in
     * the hall of fame"_).
     *
     * Every finished run, whichever door it was played through, because every
     * one of them gets a diary row and a row is what a film hangs off. It is
     * written before the settles rather than after, so a storage-full write
     * spends the REPLAYS rung of the shed ladder — which sheds films, the
     * cheapest thing on the device to lose — while the diary and the world are
     * still to be written and can still take the room it freed.
     */
    const film = session.replay();
    setEndFilm(film);
    writeReplay(at, film);

    // A daily leaves two things behind rather than four — see `settleDaily`.
    if (daily !== null) {
      const after = settleDaily({
        date: daily,
        state: snap.state,
        hud: snap.hud,
        ...(picture === null ? {} : { shot: picture }),
        book: readDailyBook(),
        timeline: readTimeline(),
        at,
      });
      writeDailyBook(after.book);
      writeTimeline(after.timeline);
      /*
       * FLUSH BEFORE CLEARING, WHICH THIS HALF NEVER DID (2026-09-09, Marc:
       * *"when i try to restart a daily, it seems to restard my world then
       * kicks me out of my daily, wihle its not restarted at all when i come
       * back"*).
       *
       * `keeper.saveRun` is debounced by 400ms so a placement does not put a
       * JSON encode in the middle of a tap. When a run ENDS, the last
       * placement's save can still be armed — and `clearDailyRun()` ran while
       * it was. Four hundred milliseconds later the timer fired and wrote that
       * board back, so the daily's run key held a nearly-finished game again.
       * TRY AGAIN then RESUMED it, and nothing appeared to restart.
       *
       * The world branch below has done `keeper.flush()` then `clearRun(slot)`
       * since Stage 4 and is right: flushing first lets the pending write land
       * where the clear can remove it. The daily half simply omitted the line —
       * the same asymmetry `settleDaily` had with its missing seed guard, in
       * the same fork, found the same day.
       */
      keeper.flush();
      clearDailyRun();
      // Which try this was, for the ending to confess above TRY AGAIN. The
      // number reached the diary and the share line and never the screen the
      // player is deciding on.
      setDailyTry(after.try);
      // No film plays by itself any more — see the world branch below.
      return;
    }

    // The world as this run left it — the LIVE copy, not the disk's, because
    // the keeper's last write may still be pending and the shrines this run
    // woke are exactly what is being reported.
    const ending = worldHeld(snap.state.rootSeed);

    const after = settle({
      state: snap.state,
      hud: snap.hud,
      slot,
      world: ending ?? readWorld(slot),
      records: readRecords(),
      timeline: readTimeline(),
      progress,
      at,
      ...(picture === null ? {} : { shot: picture }),
    });

    /*
     * What this run gained, measured against what it started with.
     *
     * Both are differences: `progress.found` has already grown by the time the
     * end screen renders, and the world's unlock ledger has just been rewritten
     * by the `settle` above.
     *
     * ## Why it is measured AFTER the settle now (2026-09-01)
     *
     * Marc, of a run whose shrine handed him the fourth draft card: *"in this
     * game I got the shrine 4th tile, id like it shown in the end screen."*
     *
     * It was measured against `ending` — the world as the LIVE merge left it —
     * and that merge is a separate effect, declared after this one, which bails
     * the moment `hud.ended` is true. React runs effects in declaration order,
     * so on the render where a run ends this one goes first and the merge never
     * runs again. Everything the run's FINAL action claimed was therefore
     * missing from `ending`: the shrine woken by the placement that spent the
     * last tile, which is a common way for a run to end and the single most
     * exciting thing an ending can report, was silently dropped.
     *
     * `after.world` is `rememberRun` over the finished state, so it holds every
     * claim including the last one. It is also the copy actually written to
     * disk, which means the end screen and the atlas can no longer disagree
     * about what this world holds.
     */
    setGained({
      perks: progress.found
        .filter((id) => !(startedFrom.current?.perks ?? []).includes(id))
        .map((id) => perkText(id, s).name),
      unlocks: unlockedBy(after.world)
        .filter((id) => !(startedFrom.current?.unlocks ?? []).includes(id))
        .map((id) => unlockLabel(id as UnlockId, s)),
    });
    /*
     * And the world itself, for the ending to show (2026-09-01).
     *
     * The WOKE line says what CHANGED; it cannot say where that leaves you. A
     * player who wakes their third shrine wants the same two facts the atlas
     * carries — three of five, and which three — on the screen where they just
     * earned it, rather than three taps away in MORE. A detour has no world and
     * a daily settles down a different path entirely, so both leave this null
     * and the ending simply does not carry the block.
     */
    setEndWorld(session.detour ? null : after.world);
    // NEW BEST, or how far short — see `Settled.standing`.
    setStanding(after.standing);
    // Through `keepWorld` rather than the two statements it is made of: this
    // site spelled them out, which is one rule with two spellings — see
    // `shell/held.ts`. The flush is settle's own, and stays.
    keepWorld(after.world);
    keeper.flush();
    writeRecords(after.records);
    writeTimeline(after.timeline);
    /*
     * NO FILM PLAYS BY ITSELF (Marc, 2026-09-24: _"make sure the replay only
     * pops once we press a REPLAY button (similar to the ground you walked)"_).
     *
     * From 2026-09-23 to this ruling a run that earned a ✦ — and a daily
     * that set a best — played itself back before its numbers. The ending's
     * REPLAY door (`endFilm`, kept below) and every kept row in the hall of
     * fame are the doors now, and the ending comes straight up.
     */
    clearRun(slot);
    // The relics this run earned, onto the device — see `Settled.progress`.
    // Without this line every run ended with the shop as empty as it started.
    setProgress(() => after.progress);
    /*
     * The SURVEY: what this run was the one to finish, for the world.
     *
     * Said on the end screen rather than as a toast over it — the run is
     * already over, and the end screen is where its bookkeeping belongs.
     *
     * This is a setState inside an effect, and `react-hooks` is right to be
     * suspicious of those in general: mirroring a PROP into state is a
     * cascading render and a frame of latency, and this file has fixed two of
     * those. This is the other kind. Banking is a one-shot consequence of a
     * run ending, guarded by `banked` so it happens exactly once, and its
     * result is not derivable from any prop — the survey is the difference
     * between a world before and after, and once written that difference is
     * gone. The alternative is holding it in a ref, which cannot re-render
     * the screen that has to show it.
     */
    setGoals(after.goals);

    /*
     * AND WHETHER THIS IS THE ENDING THAT SAYS A WORLD CAN BE LOST
     * (2026-09-09).
     *
     * Here rather than in an effect of its own, and the reason is the
     * paragraph above: this block is the one place that runs exactly once per
     * ending, guarded by `banked`, and `markSaid` is a WRITE — a value that is
     * read and then written must be settled once or it is settled twice.
     * `react-hooks/set-state-in-effect` refuses a second effect doing this and
     * is right to.
     *
     * `after.world` rather than the disk, for the same reason the survey reads
     * it: the run that just banked is counted, so a player's third expedition
     * is told on the third ending and not on the fourth.
     *
     * Never on a daily or a shared board — both return above, before this
     * line, because neither has a world and neither is the moment to talk
     * about keeping one.
     */
    if (!wasSaid('backUpNote') && after.world.runs >= BACK_UP_AFTER_RUNS) {
      markSaid('backUpNote');
      setShowBackUp(true);
    }
  }, [
    witness,
    snap.hud.ended,
    snap.state,
    snap.hud,
    slot,
    daily,
    progress,
    keeper,
    setProgress,
    s,
    session,
    worldHeld,
    keepWorld,
  ]);

  /**
   * The world learns what this run has done WHILE it is doing it (2026-08-30).
   *
   * `mergeRun` exists for exactly this and had **no caller in this body**. Its
   * own docblock says why it was split off from `rememberRun` in Ashwake 1,
   * and both halves were live bugs there: a shrine woken at placement 40 did
   * not reach the atlas until the expedition ended (Marc: *"it still shows 0
   * of 5 found"*), and a player who simply closed the tab lost the territory
   * they had just claimed. This body had reintroduced both — the only write of
   * world memory was at `settle`, so every claim was provisional until a run
   * was over.
   *
   * Ground and claims are facts the moment they happen; only the RUN COUNT
   * waits for a run to be over, which is the one field `mergeRun` leaves alone.
   */
  useEffect(() => {
    if (!started || snap.hud.ended || daily !== null || session.detour) return;
    const base = worldHeld(snap.state.rootSeed);
    if (base === null) return;
    keepWorld(mergeRun(base, snap.state));
  }, [snap.state, started, snap.hud.ended, daily, session, worldHeld, keepWorld]);

  /**
   * The perk shelf belongs to the WORLD, and this is what puts it there
   * (2026-08-30).
   *
   * Perks moved onto `WorldMemory` on 2026-08-26 — Marc's ruling, after a
   * shrine promised a fourth draft card beside an Open Hand found two worlds
   * away — and `encodeProgress` has stripped them out of the device blob ever
   * since. **Nothing in this body ever wrote the world's copy.** So a find
   * granted a perk into React state, `useDevice` wrote a blob that refuses to
   * carry it, and the next reload had no perk at all; `economyFor` reads
   * `world.perks`, so the dials it sets were never set either, in the run it
   * was found in or in any run after.
   *
   * One effect rather than a line beside each gesture, because there are three
   * — a find grants, the shelf equips, the shelf unequips — and Ashwake 1's own
   * lesson is that a rule spelled out at three call sites is a rule that comes
   * to disagree with itself. Through the KEEPER, never `writeWorld`: the keeper
   * is the only thing that writes, and that is the whole of how a crossing
   * cannot be farmed.
   *
   * A DETOUR and a DAILY write nothing. Somebody else's seed must not touch
   * this device's world, and the keeper already refuses a daily outright — the
   * guard here is so the read below cannot mistake the world for the daily's.
   */
  useEffect(() => {
    if (daily !== null || session.detour) return;
    const world = worldHeld(snap.state.rootSeed);
    if (world === null) return;
    const worn = progress.equipped[0] ?? null;
    const same =
      world.worn === worn &&
      world.perks.length === progress.found.length &&
      world.perks.every((id, i) => progress.found[i] === id);
    if (same) return;
    keepWorld({ ...world, perks: progress.found, worn });
  }, [
    progress.found,
    progress.equipped,
    snap.state.rootSeed,
    daily,
    session,
    worldHeld,
    keepWorld,
  ]);
  /**
   * Sound, from either surface (2026-08-30).
   *
   * The board's SOUND button and SETTINGS' switch are ONE wire, which is Ashwake
   * 1's rule and the reason this is a callback rather than two handlers: two
   * surfaces writing one setting is how they come to disagree about it.
   *
   * Enabling it is also the user gesture every browser wants before any audio
   * may exist, so the tap that turns sound on is spent on one note that
   * confirms itself. Turning it off GIVES THE CONTEXT BACK rather than muting
   * it — a suspended context is a resource a phone is still counting.
   */
  const setSound = useCallback(
    (on: boolean) => {
      setFeature('ui.sound', on);
      if (on) voice.wake(theme.voice);
      else voice.silence();
    },
    [setFeature, theme.voice],
  );

  const manual = useDoor('manual');
  const settings = useDoor('settings');
  const more = useDoor('more');
  const shop = useDoor('shop');
  const fame = useDoor('fame');

  /**
   * A FILM ENDS BY ITSELF, after a beat on the last board.
   *
   * The beat is the point: a run's final board — the one the score was counted
   * off — is the frame worth looking at, and cutting to the ending the
   * millisecond the last tile lands would be the film hiding its own subject.
   * A SKIP is different and does not come through here: it goes straight back,
   * because somebody who skips has said they want the numbers.
   */
  /**
   * ONE WAY OUT OF A FILM, wherever it was opened from (2026-09-23).
   *
   * Three things end a replay — the last move, the SKIP button, and a tap on
   * the board — and all three have to put the player back where they were.
   * Written once, because the first build wrote it once and skipped it in
   * the other two: a film opened from the diary and skipped left the diary
   * closed behind it, which is the player three taps from where they were
   * with nothing saying so.
   *
   * The end screen needs no restoring: it is what is underneath already.
   */
  const closeReel = useCallback(() => {
    /*
     * AND THE CAMERA COMES BACK (2026-09-24, Marc: "when i came back … i
     * started a new one and my camera was misplaced"). Every way out of a film
     * ends here — SKIP, a tap on the board, the film running out — so this is
     * the one place that drops the follow and gives back the camera the film
     * started from (`BoardHandle.hold`, the effect below). It flew the whole
     * board into frame on the first build, which the review caught throwing
     * away a live run's zoom when a hall-of-fame film closed over it.
     */
    board.current?.follow(null);
    board.current?.release();
    setReel((was) => {
      if (was?.from === 'fame') {
        more.show();
        fame.show();
      }
      return null;
    });
  }, [more, fame]);

  // The camera a film starts from, remembered the moment one starts — before
  // its first move has asked the board to follow anything.
  const reeling = reel !== null;
  useEffect(() => {
    if (reeling) board.current?.hold();
  }, [reeling]);

  useEffect(() => {
    if (film === null || !film.done) return;
    const done = setTimeout(closeReel, FILM_HOLD_MS);
    return () => clearTimeout(done);
  }, [film, closeReel]);
  const worlds = useDoor('worlds');
  // THIS DEVICE, a room off MORE since 2026-08-31 rather than a section at the
  // bottom of it — see `screens/Device`.
  const device = useDoor('device');
  // A door that shows a ledger has just asked for it, and so has a run that
  // ended. Anything else leaves the disk alone.
  const ledgers = useLedgers(`${fame.open}${shop.open}${worlds.open}${snap.hud.ended}`);
  const virgin = ledgers.timeline.length === 0 && progress.relics === 0;
  /*
   * THE SURVEY, finally readable (2026-09-02) — and read by the hall of fame's
   * ATLAS since 2026-09-24, where the atlas moved (Marc: _"put it in hall of
   * fame somehow"_).
   *
   * Computed here rather than in a panel because it takes BOTH the world and
   * the device's perk shelf — `withWorldPerks` is what makes `perksAll` true,
   * and Ashwake 1's own note says a survey reports the world while the paid
   * ledger underneath it is an accounting detail. So this asks what is TRUE,
   * not what has been PAID: a shelf finished on world 1 shows as met on world
   * 2 the day it is settled.
   */
  const survey = useMemo(() => {
    const world = ledgers.worlds[slot];
    return world === null
      ? []
      : metGoalIds(world, withWorldPerks(progress, world.perks, world.worn ?? null));
  }, [ledgers.worlds, slot, progress]);
  /**
   * Whether this world can be begun at its camp, and how far out that is.
   *
   * Read off the ledgers the WORLDS panel is already built from, so opening
   * that panel is what refreshes it — a shrine woken this run makes the button
   * appear the next time the panel is opened, which is also the first moment
   * anybody could press it.
   */
  const campHere = useMemo(() => {
    const at = campFor(ledgers.worlds[slot]);
    return at === null ? null : { at, ring: distance(parse(at), { q: 0, r: 0 }) };
  }, [ledgers.worlds, slot]);
  const anyOpen = useAnyDialogOpen();
  /**
   * Leaving the menus, whatever is in them (2026-08-30).
   *
   * Marc: *"make sure all menus and overlapped menus on top are all navigable
   * and backable and make sense."*
   *
   * Four places used to close panels by NAME — `worlds.hide(); more.hide()` —
   * and `ui/dialog.tsx`'s own docblock says why that is the wrong shape: it is
   * Ashwake 1's `resetShell()`, a hand-maintained list of things to re-hide on
   * every scene change, and "the list had already missed three". **This one had
   * already missed four.** Opening the manual from the board, going to its MENU
   * tab, opening MORE, opening WORLDS and stepping into another world left the
   * MANUAL open over the new world's board — because the manual was under the
   * two panels the list knew about.
   *
   * A scene change closes the STACK, not a list of names. `closeAll` empties
   * it and hands the whole run of history entries back in one go, which is also
   * the only correct thing to do with the back button: two `hide()` calls are
   * two `history.back()`s a browser may coalesce into one.
   */
  const leaveMenus = useDialogStack().closeAll;

  /**
   * WHICH OF THE THREE THIS RUN IS: a world, a shared seed, or the daily.
   *
   * Written out twice, ten lines apart, in the two places that print the
   * sentence explaining it — the front door and the manual (2026-09-02). Two
   * copies of one three-way decision is two chances for a screen to disagree
   * with the screen beside it about what the player is even playing.
   */
  const mode: 'world' | 'shared' | 'daily' =
    daily !== null ? 'daily' : session.detour ? 'shared' : 'world';

  // What the game wants to say, if anything: a priority list rather than a
  // queue, so the first unmet moment fires and the rest stay armed.
  const teach = useMemo(
    () =>
      started
        ? nextLesson(
            { board: snap.board, hud: snap.hud, placed: snap.hud.placements > 0 },
            progress,
          )
        : null,
    [started, snap.board, snap.hud, progress],
  );
  const card = teach !== null && teach.as === 'card' ? teach.id : null;

  /**
   * A tap on the board, and every answer it owes.
   *
   * This had three branches and needed six. **A tap that cannot build used to
   * be a silent no-op** — the engine returned the same state and the screen
   * said nothing, which is the worst answer a game can give a deliberate
   * action. Ashwake 1 replaced every one of those silences with a sentence,
   * and the core has carried the sentences the whole time: `pocketNote`,
   * `describeHexOf` and `rememberedNativeAt` had **no caller in this body**.
   *
   * In order, because the order is the design:
   *
   * 1. **A ripe tile is a QUESTION**, not a placement — "what is this pocket
   *    worth?" The harvest buttons re-price to it and the board outlines it.
   * 2. **A legal hex with an empty hand** says what is missing. Legality is
   *    about the BOARD, so those hexes still glow with every card put down.
   * 3. **A legal hex** places.
   * 4. **Remembered fog turns the lens** (Marc, 2026-08-20: "on clicking a
   *    tile in the fog that we know the biome it highlights the whole known
   *    biome"). Letting go is deliberately GENEROUS (Marc, Day 2: "letting go
   *    is unclear"): with the lens on, any fog tap that is not a switch to a
   *    different colour releases it.
   * 5. **Anything else describes itself** — tap a glyph, learn what it does.
   *    A shrine, a cache, a wall, spent stone, ground not yet ripe. No mode to
   *    learn, and it costs a gesture that did nothing before.
   */
  /**
   * Dispatch, and say what that did.
   *
   * **Every action goes through here**, which is the whole point: a receipt is
   * a property of the transition, so the one place that can reliably notice
   * one is the one place that causes it. Ashwake 1 reached the same shape from
   * the other direction — its `#dispatch` was where the pop receipt, the claim
   * notes and the teaching all decided who spoke.
   *
   * Read straight back off the session rather than mirrored into state through
   * an effect: mirroring a prop into state is a cascading render and a frame of
   * latency, and `react-hooks` refuses it for good reason.
   */
  const act = useCallback(
    (action: Action) => {
      // Counted BEFORE, because "the first" is a fact about what had not
      // happened yet. One read, not three: `session.get()` builds a whole
      // snapshot — the board view and the HUD included — and this was calling
      // it three times in six lines for three fields of one state.
      const before = session.get().state;
      /*
       * WHAT A FIND HOLDS, handed over a beat before the receipt asks for it
       * (2026-09-02).
       *
       * `receipts.ts` takes a `perkAt` and a `worn` so a find's claim can name
       * the perk it just gave; `store.ts` forwards both; **`App` passed
       * neither**. So every find in the real game returned `findNothing` —
       * *"Nothing new inside"* — including the ones that had just granted a
       * perk, and the toast naming it was overwritten by that denial a line
       * later. The one moment the perk hunt pays out, the game denied it.
       *
       * `receipts.test.ts` is green because it supplies the hook itself: the
       * machinery was proved and the wiring was not, which is this repository's
       * signature miss wearing an option instead of an export.
       *
       * Written HERE rather than in a render or an effect because the receipt
       * is built INSIDE `dispatch`, before any of the shell's own handling
       * below runs — so the shelf this must be judged against is the one the
       * run has right now, an instant before the grant changes it.
       */
      aim({
        progress,
        seed: before.rootSeed,
        // A perk lives on the world that found it, so a daily and a shared
        // seed grant none — and a receipt there must go on saying so. The
        // same condition the grant below keeps.
        grants: daily === null && !session.detour,
      });
      session.dispatch(action);
      const now = session.get();
      /*
       * WHAT THE ACTION DID, once — `shell/happened.ts` carries the argument.
       *
       * Four docblocks below say "one place knows what an action DID" and each
       * of them then worked it out again: three facts were re-derived at nine
       * sites in this one function, the pocket's size at three of them. None
       * was wrong; nine places for one fact to drift is the problem, in the
       * seam `?playtest=1` records a stranger's first minute off.
       *
       * It asks the STATE and never the action alone: a PLACE the rules refuse
       * confirms nothing, and a HARVEST on a pocket that could not pop sounds
       * nothing.
       */
      const did = whatHappened(action, before, now.state);

      /*
       * The board's voice, on the same seam the receipts use.
       *
       * One place knows what an action DID, so one place can sound it — the
       * alternative is a component watching for a change it did not cause.
       * Off unless the player asked (`ui.sound`), and the toggle's own tap is
       * the user gesture browsers require before any audio exists at all.
       */
      if (isEnabled(features, 'ui.sound')) {
        if (did.popped) voice.pop(theme.voice, did.pocket);
        if (did.claimedAt !== null) {
          const cell = now.state.cells[did.claimedAt];
          if (cell?.kind === 'landmark') voice.claim(theme.voice, cell.reward);
        }
        /*
         * RUNNING DRY — the third moment, which had no caller (2026-09-02).
         *
         * Every direction has carried a tuned `voice.dry` since the rules were
         * lifted and nothing has ever played it. It is the low fade the moment
         * the purse first sinks toward the next placement's cost: not a death
         * sting, because death stays silent and the dread is the sound.
         *
         * The latch lives here because it is per-RUN state and the rule that
         * moves it is `shell/dry.ts`, where the hysteresis can be tested. Only
         * the EDGE sounds — see that file for why a bare threshold chatters.
         */
        const wasDry = dry.current;
        dry.current = runningDry({ tiles: now.hud.tiles, cost: now.hud.cost, warned: wasDry });
        if (dry.current && !wasDry) voice.dry(theme.voice);
      }

      /*
       * The board, FELT (2026-09-08) — its own branch beside the voice, on the
       * same seam and for the same reason: one place knows what an action did.
       *
       * Separate from `ui.sound` rather than folded into it, because the two
       * answer opposite questions. Sound leaves the phone, so it is off by
       * default lest it surprise a quiet room; a buzz does not leave the
       * phone, which is precisely why it is the feedback a player in that
       * quiet room can still have. Somebody who wants one and not the other is
       * the ordinary case, not an edge one.
       *
       * Three moments, and PLACE is the one sound does not mark. A tile
       * landing is the game's most frequent action and its least eventful,
       * which makes it wrong for a note and right for the shortest tick there
       * is — the confirmation that the finger was where it thought it was, on
       * a board where a tap can land on the hex next door. `shell/touch.ts`
       * owns what each moment feels like; this decides only when.
       *
       * A no-op on any device without `navigator.vibrate`, which today means
       * every iPhone. SETTINGS hides the row there rather than offering a
       * switch that would lie.
       */
      {
        // Which moment wins is the rule, and it lives with the facts —
        // `feelOf`, in `shell/happened.ts`: a claim rides ON a placement, so
        // both are true at once and the claim is the one worth telling apart.
        const moment = feelOf(did);
        if (moment !== null) buzz(isEnabled(features, 'ui.haptics'), moment);
      }

      /*
       * SESSION C's FIRST TWO FACTS, from the one place that knows (Stage 6).
       *
       * *"Did they place without help? pop?"* — asked of the same `act` seam
       * the receipts, the voice and the buzz ride, and for the same reason: it
       * is the only place that knows what an action actually DID. A test of
       * `action.type` alone would credit a placement the rules refused, which
       * on this sheet would be a lie about a stranger's first minute.
       *
       * The clock starts on the first placement rather than at BEGIN, so the
       * elapsed times answer *"after how long?"* from the moment the run
       * became a run. Unconditional: `witness` is a no-op without
       * `?playtest=1` and `mark` is once-only.
       */
      if (did.placed) {
        startWatching();
        witness('placed');
      }
      if (did.popped) witness('popped');

      /*
       * A claim is SHOWN where it happened, then the camera comes back.
       *
       * Marc, 2026-08-29: *"when the card the shrine, points, cache, etc.
       * happen, make sure we focus the camera on it, then briefly snap back to
       * where they were before, animated."*
       *
       * A destination is claimed by building a tile that TOUCHES it, so the
       * thing that just paid is a hex away from the one the finger was on —
       * and on a zoomed board it was often off screen entirely. The sentence
       * arrived and the place did not.
       *
       * Outside the sound branch on purpose: this is not a flourish that
       * belongs to the audio toggle. It rides the same seam the receipts and
       * the voice already use — one place knows what the action DID.
       */
      if (did.claimedAt !== null) {
        const at = did.claimedAt;
        board.current?.visit(at, CLAIM_HOLD_MS);

        /*
         * A hidden FIND grants a perk, which is what a find is FOR.
         *
         * Marc, 2026-08-29: *"I gain perks with shrines but in the end screen
         * I still see 0/5."* `grantFind` has been in the core since the rules
         * were lifted, tested, deterministic from (worldSeed, hex) so the same
         * find on the same world always gives the same perk — and it had no
         * caller. Finds paid nothing at all, so the shelf never filled and
         * `0 of 5 perks found` was the truth about a mechanic that could not
         * happen.
         *
         * The fifth of this repository's signature miss: a rule the core
         * implements and tests, reachable from nothing.
         */
        /*
         * ...and only in a world that can keep it (2026-08-30).
         *
         * A perk lives on the world it was found in, so a DETOUR or a DAILY
         * granting one would either write into somebody else's geography or
         * hand out a perk with nowhere to be written — the same rule the seed
         * guard, `economyFor` and the shrine's own receipt already keep, and
         * the one place it was missing. Ashwake 1 guards it in `findLabel`.
         */
        const cell = at === undefined ? undefined : now.state.cells[at];
        if (
          at !== undefined &&
          cell?.kind === 'landmark' &&
          cell.reward === 'find' &&
          !session.detour &&
          daily === null
        ) {
          const got = grantFind(progress, now.state.rootSeed, at);
          // Null means every perk is already owned — a find met with a full
          // shelf grants nothing, and says so rather than pretending.
          if (got !== null) {
            setProgress(() => got.progress);
            say(s.ui.perkFound(perkText(got.perk.id, s).name));
            // The card that is about to be shown gets a WEAR button for THIS
            // perk — see `cardPerk`.
            setCardPerk(got.perk.id);
          }
        }
      }

      const said = now.said;

      /*
       * THE SIGNPOST'S OWN LOOK, taken once per action (2026-09-02).
       *
       * Read and written HERE, in one place, before any branch below can
       * return — so every dispatch counts as a look whether or not it was
       * quiet enough to speak. The alternative was an assignment on each exit
       * path, which is three places for "did we look" to drift apart, and one
       * of them ran after a hook had already read the ref.
       */
      const nearest = now.hud.hint;
      const wasNearest = signpost.current;
      signpost.current = nearest;

      /*
       * The two things a run says once, at their first occurrence.
       *
       * After a receipt, never instead of one: a receipt is about what the
       * player just did and these are about where they have got to. A quiet
       * line, so it takes the toast only when nothing louder wanted it.
       */
      if (said === null) {
        const mark = onceARun(
          {
            state: now.state,
            hud: now.hud,
            /*
             * NEW GROUND is a claim about a WORLD, so a run without one makes
             * it about nothing — see `Moment.reachAtStart`. A daily and a
             * shared seed both pass null; UNIQUE, which is a fact about the
             * hand, still fires on both.
             */
            reachAtStart:
              daily !== null || session.detour ? null : (startedFrom.current?.reach ?? 0),
            said: saidOnce.current,
          },
          s,
        );
        if (mark !== null) {
          saidOnce.current.add(mark.id);
          say(mark.text);
          return;
        }
        /*
         * The drip's toast half, on the beat nothing louder wanted (2026-09-03).
         * Ahead of the signpost: a lesson speaks once per device, a signpost
         * re-arrives on every change of nearest. See `speakLesson`.
         */
        if (speakLesson(progress, now)) return;
        /*
         * THE SIGNPOST — the quietest thing the run says (2026-09-02).
         *
         * `hud.hint` is the core's answer to "where do I go?" on an endless
         * plane, and it had no reader at all in this body. It speaks last, on
         * a beat where nothing else wanted the toast, and only when the nearest
         * destination has actually CHANGED. See `shell/signpost.ts` for the
         * three guards and what each of them cost Ashwake 1.
         */
        const sign = signpostFor({
          hint: nearest,
          last: wasNearest,
          knowsRipe: hasMet(progress, 'ripe'),
        });
        if (sign !== null) say(sign);
        return;
      }

      /*
       * The FIRST pop a device ever makes is a card (Marc's call, 2026-08-29).
       *
       * It teaches the one rule that reshapes the board and that nothing else
       * says out loud: a popped pocket turns to STONE, which still surrounds
       * but never matches — so ground you have cashed grows poorer and the
       * world stays rich farther out. A toast is too quiet for that.
       *
       * Gated on the pop COUNT rather than on the `pop` teaching id, which
       * is a different moment: that lesson fires the instant a pocket becomes
       * poppable — "you can pop now" — so by the time a player actually pops,
       * the ledger is already spent. First pop of the first run is: this run
       * has popped nothing, and no run before it banked a harvest.
       */
      // One lookup: `records[ONLY_WORLD]` was indexed twice inside one
      // expression, which is the same fact read two ways in a condition that
      // has to be all-or-nothing.
      const shelf = ledgers.records[ONLY_WORLD];
      const first =
        did.popped &&
        before.log.popped === 0 &&
        (shelf?.tilesHarvests ?? 0) + (shelf?.pointsHarvests ?? 0) === 0;
      if (first) {
        /*
         * AFTER the pop, not over it (2026-08-29).
         *
         * Marc: *"make sure we show the first pop tip card after the pop
         * animation."* The card was raised on the same tick as the dispatch,
         * so the one animation this game builds up to — the leap, the cascade,
         * the tiles thrown off the board — played entirely behind a modal that
         * had just covered it. A player's first pop is the moment the board is
         * most worth watching, and it was the moment it was least visible.
         *
         * `cascadeMs` is the leap's own arithmetic, so the wait is exactly as
         * long as the animation the player is watching and not a guess that
         * drifts when the motion is retuned. Reduced motion makes it short
         * rather than zero: the card still wants to arrive as an event.
         */
        const shown = {
          ...said,
          // Joined the way the store joins every other multi-part utterance —
          // this had its own `\n\n`, which is one card's spacing decided in a
          // second place (2026-09-02). See `paragraphs`.
          text: paragraphs(s.view.harvest.firstPop, said.text, s.lesson.pop.when),
          card: true,
        };
        const wait = reducedMotion ? 0 : cascadeMs(theme.motion, did.pocket);
        // Through `speakAfter`, so the teaching is held for the whole wait as
        // well — this is the exact card Marc watched LUCK get shown over and
        // then taken away from. See `speaking`.
        speakAfter(wait, () => setSaidCard(shown));
        return;
      }

      /*
       * A POP is a card — the first one. After that it is a LINE.
       *
       * Marc, 2026-08-29: *"make sure all pop as card, no text above tiles for
       * explanations"*, and then *"and points"*. A harvest is the loudest thing
       * the board does and the one moment a player is owed a real accounting:
       * what the pocket was worth, what it paid in tiles, what it scored, what
       * the luck did. That was a toast — a line of prose in the strip between
       * the board and the hand, at the exact moment the eye is on the board
       * watching the cascade, gone by the time it looks down. That finding
       * stands, and it is why this is still a card rather than a line.
       *
       * What did NOT stand is the price. Marc, 2026-08-30: *"after the first
       * pop, we don't need to have the pop card appear, we can keep it briefly
       * but easy to tap out."* A modal several times a minute, each one asking
       * for a deliberate press, is the game stopping to congratulate you on the
       * thing you came to do. So every pop after the device's first is a line
       * in the toast strip — the receipt's own lead sentence, one tap from the
       * whole accounting (the `show` below, and `note`'s docblock). It was a
       * BRIEF card for one day; `ui/Card.tsx` keeps that story.
       *
       * Claims that already held the screen still do, at full weight: a shrine
       * or a crossing is a thing that happened once. Everything else — a tap
       * that explains a hex, a spend's receipt — stays a toast, because those
       * are answers to a question the player just asked and a modal for each
       * would be a game that interrupts you for reading it.
       *
       * The card waits for the animation the same way the first pop does: the
       * accounting is worth reading, and it is worth reading AFTER the thing
       * it is accounting for.
       */
      const isPop = action.type === 'HARVEST';
      const wait = isPop && !reducedMotion ? cascadeMs(theme.motion, did.pocket) : 0;

      /*
       * A routine POP is a LINE, and the line opens.
       *
       * A claim that happened to land on the same harvest (`said.card`) still
       * holds the screen, because that is the rare thing and not the routine
       * one. The pop's own receipt is the lead sentence in the toast, and
       * `more` carries the rest — see the `note` state for why this stopped
       * being a card at all.
       */
      const show = (): void => {
        if (isPop && !said.card) {
          const [lead = said.text] = said.text.split('\n');
          setNote({ text: lead.trim(), more: { ...said, card: true } });
        } else setSaidCard(said);
      };

      if (said.card || isPop) speakAfter(wait, show);
      else say(said.text);
    },
    [
      speakAfter,
      witness,
      startWatching,
      session,
      ledgers,
      s,
      features,
      theme,
      progress,
      setProgress,
      reducedMotion,
      daily,
      say,
      speakLesson,
    ],
  );

  /**
   * What that hex is, in this run's numbers — the board answering a question.
   *
   * Lifted out of `onTap` (2026-08-29) because the keyboard asks it too: an
   * arrow key LOOKS and Enter ACTS, and the looking half is exactly this
   * sentence. One copy, so the two doors into the board cannot describe it
   * differently.
   *
   * ## The ledger it was asking without (2026-09-01)
   *
   * Marc, of a tapped shrine: *"is it a good shrine or one i dont need now?"*
   * `DescribeContext` has taken an `unlockLabel` and a `crossingDowry` since
   * the rules were lifted and this call passed neither, so EVERY shrine on
   * every board said the same vague sentence — "claim it to unlock **a
   * system**" — whether it was about to hand over the fourth draft card or
   * standing on a finished world with nothing left to give. The pin test has
   * been passing both since it was written; the game passed neither. Seventh
   * of this body's signature miss, and the smallest: two fields.
   *
   * `shrinesClaimed` came off `state.log.questsDone` — shrines woken THIS RUN
   * — where the ledger is a fact about the WORLD, across every run it has
   * held. On run two of a world with three shrines already awake it counted 0
   * and would have named an unlock long since woken. `world.shrines.length` is
   * the number `unlockedBy`, the atlas and `economyFor` all read, and the merge
   * effect keeps it current within the run, so a shrine woken ten placements
   * ago already counts.
   */
  const describe = useCallback(
    (key: string): string => {
      const now = session.get();
      // The LIVE world, not the disk's: a shrine woken earlier in this run has
      // to count, and the keeper's write may still be pending.
      const world = session.detour ? null : worldHeld(now.state.rootSeed);
      const woken = world?.shrines.length ?? 0;
      /*
       * AND THE FOG COMES FROM THE SAME COPY (2026-09-02).
       *
       * This read `ledgers.worlds[slot]?.revealed` — the ledgers snapshot,
       * which only refreshes when a panel opens or a run ends — two lines under
       * a comment explaining why the shrine count must NOT. So one call
       * described a hex using a live world for what is woken and a stale one
       * for what is remembered, and the tap answer for ground revealed earlier
       * in the same run was "you have never been here".
       *
       * `worldHeld` guards by seed exactly as `memoryFor` does, which is the
       * function `store.ts` builds the board's own fog from — so the tap and
       * the board now draw the same memory from the same place.
       */
      const memory = world?.revealed;
      return describeHexOf(
        {
          state: now.state,
          theme,
          strings: s,
          // The same fact the session was built with — a run on somebody
          // else's seed has no ledger to describe.
          detour: session.detour,
          shrinesClaimed: woken,
          ...(memory === undefined ? {} : { memory }),
          // Only where there IS a ledger. Without a world the honest answer is
          // the vague one, which is what omitting this asks for.
          ...(world === null
            ? {}
            : {
                unlockLabel: (nth: number) => {
                  const id = UNLOCKS[nth]?.id;
                  return id === undefined ? null : unlockLabel(id, s);
                },
              }),
          // The way onward, priced the same way the crossing card prices it —
          // offered by a shrine past the end of the ledger, on your own world.
          ...(world !== null && woken >= UNLOCKS.length
            ? { crossingDowry: () => dowryOf(world) }
            : {}),
        },
        key,
      );
    },
    // `ledgers` and `slot` are gone from this list because the fog no longer
    // comes from either — see the note above.
    [session, s, theme, worldHeld],
  );

  /**
   * The keyboard's marker moved: say what is under it, and change nothing.
   *
   * The whole difference between LOOKING and TAPPING, and the reason the two
   * are separate calls. A tap on a ripe tile also TARGETS it — it decides
   * which pocket POP will spend — and a marker walked over one on the way
   * somewhere else must not quietly re-aim the harvest. So a ripe tile is
   * priced with the same `pocketNote` a tap prints and the target is left
   * exactly where the player put it.
   */
  const onLook = useCallback(
    (key: string, cell: CellView): void => {
      say(cell.ripe ? pocketNote(session.get().state, key, s) : describe(key));
    },
    [describe, session, s, say],
  );

  const onTap = useCallback(
    /** `held` is a press that lights a placed tile's ground rather than asking
     *  about it — the keyboard's Enter, which cannot hold (see `shell/tap`). */
    (key: string, cell: CellView, held = false): void => {
      /*
       * A TAP ON A PLAYING FILM ENDS IT (2026-09-23, Marc: *"a tap skips to
       * the score"*).
       *
       * First, above every other rung, because during a film the board under
       * the finger is not the run being played: it is a picture of one that
       * finished. Every meaning below this line — placing, pricing a pocket,
       * describing a hex — would be acting on a board that is not there.
       */
      if (reel !== null) {
        closeReel();
        return;
      }
      const now = session.get();
      /*
       * WHAT THE TAP MEANS is decided in `shell/tap.ts`, which carries the
       * order and the argument for every rung of it. This is the doing.
       *
       * The order was previously readable only by reading the effects — eight
       * `if`s each with its own work between the test and the `return` — and
       * `INTERACTIONS.md`'s first table is that same decision written out in
       * prose. It is one function and one table now, and the table's ✓ rows
       * have a test to point at.
       */
      const tap = tapMeans(cell, {
        touring,
        inHand: now.hud.draft.length,
        lens,
        known: rememberedNativeAt(now.state, key),
        held,
      });

      if (tap.does === 'return') {
        // The trip is ENDED rather than waited out: the board comes home and
        // the tap is spent on bringing it there. See `showOnBoard`.
        board.current?.endTour();
        putTourDown();
        return;
      }

      if (tap.does === 'price') {
        session.target(key);
        say(pocketNote(now.state, key, s));
        return;
      }

      if (tap.does === 'hand-empty') {
        say(s.ui.handEmpty);
        return;
      }

      if (tap.does === 'place') {
        say(null);
        act({ type: 'PLACE', hex: key });
        return;
      }

      /*
       * Nothing to build on, so the priced pocket lets go — true of every rung
       * below this line, which is why it is here once rather than in four
       * branches that could come to disagree.
       */
      session.target(null);

      if (tap.does === 'lens-on') {
        setLens(tap.colour);
        session.spotlight(tap.colour);
        const ground = namesOf(theme, s.locale)[tap.colour];
        // A tile's ground and remembered fog are lit the same way and let go
        // differently, so each says its own way back.
        say(cell.kind === 'tile' ? s.ui.lensTile(ground) : s.ui.lensOn(ground));
        return;
      }

      if (tap.does === 'hold-hint') {
        say(s.ui.holdHint(namesOf(theme, s.locale)[tap.colour]));
        return;
      }

      if (tap.does === 'lens-off') {
        setLens(null);
        session.spotlight(null);
        say(s.ui.lensOff);
        return;
      }

      /*
       * A destination TAPPED opens the card that explains it, AND says this
       * run's numbers — both, because they answer different questions. Marc,
       * 2026-08-29: *"make sure we can click on the map for caches, shrines,
       * etc. and we get the card explaining what it is."* The toast is the
       * right sentence for somebody who already knows what a cache IS; the
       * card is the one that defines the word, and it is the same card the
       * glossary opens everywhere else, so a cache is defined in one place
       * however you arrive at it.
       */
      if (tap.does === 'card' && cell.landmark !== null) {
        setTerm(LESSON_FOR_REWARD[cell.landmark]);
      }
      say(describe(key));
    },
    [act, session, s, theme, lens, describe, say, touring, putTourDown, reel, closeReel],
  );

  /**
   * A FINGER HELD ON THE BOARD (2026-09-25, Marc: "longer tap … but not so
   * long. make it easily discoverable too"). `HexField` calls this once the
   * press has lasted `HOLD_MS` without travelling, WHILE the finger is still
   * down, so the ground lights under it. True means it was answered and the
   * release must not also be a tap; false lets the release be one.
   */
  const onHoldHex = useCallback(
    (key: string, cell: CellView): boolean => {
      if (reel !== null) return false;
      const now = session.get();
      const hold = holdMeans(cell, {
        touring,
        inHand: now.hud.draft.length,
        lens,
        known: rememberedNativeAt(now.state, key),
        held: true,
      });
      if (hold === null) return false;
      session.target(null);
      if (hold.does === 'lens-on') {
        setLens(hold.colour);
        session.spotlight(hold.colour);
        say(s.ui.lensTile(namesOf(theme, s.locale)[hold.colour]));
      } else {
        setLens(null);
        session.spotlight(null);
        say(s.ui.lensOff);
      }
      return true;
    },
    [session, s, theme, lens, say, touring, reel],
  );

  /**
   * Hold one colour up against the board, and let go by asking twice.
   *
   * The lens is a way of LOOKING, so it lives in the shell rather than in the
   * run: a long press on a card in the hand tints every tile of that colour
   * and steps the rest back, remembered ground included. `null` puts it down,
   * and pressing the same card again is `null` — a lens you cannot let go of
   * is a lens nobody turns on twice.
   */
  /**
   * Pick a card up — and put it down by tapping it again.
   *
   * Marc's own rule, and `selectDraft` has carried it since the rules were
   * lifted: *"we can always unselect a selected tile by tapping it again — the
   * UI sends -1 on that second tap"*. The UI did not send it. Tapping the
   * selected card re-selected it, the reducer correctly returned the same
   * state, and the gesture was a silent no-op.
   *
   * The second tap also EXPLAINS, which is where a player learns what their
   * colours do: putting a card down is the one moment they are looking at it
   * rather than at the board.
   */
  const onSelect = useCallback(
    (index: number) => {
      const card = snap.hud.draft[index];
      if (card?.selected === true) {
        session.dispatch({ type: 'SELECT', index: -1 });
        say(colourLesson(card.colour, snap.state.tuning, theme, s));
        return;
      }
      session.dispatch({ type: 'SELECT', index });
    },
    [session, snap.hud.draft, snap.state.tuning, theme, s, say],
  );

  /**
   * Cash a pocket — and go and watch it happen.
   *
   * The camera glides to the pocket FIRST, at the zoom it is already at, so
   * the leap and the cascade play where the player is looking. A pop is the
   * loudest thing the board does and it was being played off-screen whenever
   * the priced pocket was somewhere the camera was not.
   *
   * A pure pan rather than a zoom, so the effect rides along at whatever scale
   * the player chose to watch the board at.
   */
  const onHarvest = useCallback(
    (choice: HarvestChoice) => {
      const at = snap.hud.harvestAt;
      if (at !== null) board.current?.flyToHex(at, board.current.zoomLevel());
      act({ type: 'HARVEST', choice, ...(at === null ? {} : { at }) });
    },
    [act, snap.hud.harvestAt],
  );

  const onLens = useCallback(
    (index: number | null) => {
      const colour = index === null ? null : (snap.hud.draft[index]?.colour ?? null);
      const next = colour === lens ? null : colour;
      setLens(next);
      session.spotlight(next);
    },
    [session, snap.hud.draft, lens],
  );

  /**
   * Put the lens down, from a control rather than from a gesture (2026-09-01).
   *
   * Marc: *"a quick 'Lens off' button (see other repo)."* The same three lines
   * the fog's second tap runs, in one place, so the button and the gesture
   * cannot come to disagree about what letting go MEANS — it says so out loud,
   * which the long-press half never has.
   */
  const clearLens = useCallback(() => {
    setLens(null);
    session.spotlight(null);
    say(s.ui.lensOff);
  }, [session, s, say]);

  /**
   * The lens panel's door, and its rows (2026-09-16).
   *
   * A row holds the lens on its ground exactly as a long-press on a card does
   * — the same two writes, `lens` and `session.spotlight` — so the panel and
   * the hand cannot disagree about what holding means. The panel stays open
   * while a lens is held: the board dims behind it, which is the point.
   */
  const onLensPanel = useCallback(() => {
    setLensOpen((was) => {
      if (!was) setPurseOpen(false);
      return !was;
    });
  }, []);
  const holdLens = useCallback(
    (colour: Colour) => {
      const next = colour === lens ? null : colour;
      setLens(next);
      session.spotlight(next);
    },
    [session, lens],
  );

  /**
   * A new run, in a world.
   *
   * **It leaves the daily**, and that is not a convenience. Today's board is
   * everybody's board; a fresh random run played while the shell still thought
   * it was in the daily would be written under today's DATE and banked as a
   * try on a ladder it never played — a private seed's score standing on the
   * shared one. NEW RUN off a daily's end screen is the ordinary way to reach
   * that state, so the door out is here rather than in a guard downstream.
   */
  /**
   * The stash: put the selected card away, or trade with the one in that slot.
   *
   * The mechanic shipped inert. The rule has been in the core since it was
   * lifted — `hold(state, slot)` stashes into a free slot and TRADES with a
   * named one — and the shell dispatched `HOLD` from nowhere, so the empty
   * slot was a disabled button and the held card had no tap at all. Same class
   * as the colour lens.
   *
   * The index travels either way, which is Ashwake 1's shape and the reason
   * one gesture covers both meanings: the reducer reads whether that slot
   * holds anything and decides for itself.
   *
   * **The empty hand answers.** Tapping a slot with no card selected used to
   * say nothing at all (Ashwake 1, fresh-eyes 2026-08-20), and the two cases
   * mean different things: with nothing stashed there is nothing to put away,
   * and with something stashed the stash still needs a card to trade FOR —
   * it trades, it does not deal.
   */
  const onHold = useCallback(
    (slot: number) => {
      if (snap.hud.draft.length === 0) {
        say(snap.hud.held[slot] === undefined ? s.ui.holdNothing : s.ui.holdTrades);
        return;
      }
      act({ type: 'HOLD', slot });
    },
    [act, snap.hud.draft.length, snap.hud.held, s, say],
  );

  /**
   * Hand this run to somebody — the game's entire distribution mechanism.
   *
   * A daily and a world run share nothing but the verb: the daily's line is a
   * scoreboard entry that carries its DATE, so the receiver plays the same
   * board, and a world run carries its SEED. `shareOf` writes both; this only
   * decides which one this run is and hands over the numbers.
   */
  const onShare = useCallback(async (): Promise<ShareResult> => {
    /*
     * WHICH run this is, and what the card says about it — one fork, in
     * `shell/handOver.ts`, because the sentence and the picture have to agree
     * and they used to be two spellings of the same branch.
     *
     * The book is decoded ONCE and handed in: it was read twice inside this
     * handler, and two reads of a store a settle could write between could
     * disagree about which try this was, on the one artefact whose whole job
     * is being screenshotted.
     */
    const { subject, card: words } = handOverOf(
      {
        daily,
        state: snap.state,
        hud: snap.hud,
        standing,
        book: daily === null ? null : readDailyBook(),
      },
      s,
    );

    /*
     * THE PICTURE (2026-09-02).
     *
     * `shell/share.ts` calls this the game's entire distribution mechanism, and
     * until then it handed over a sentence. Ashwake 1 handed over a card: the
     * score, the run's shape, the board ghosted behind it, and the address to go
     * and do something about it.
     *
     * Best effort and never fatal: a browser missing a piece of the canvas API
     * hands back null and everything below falls through to the text-and-link
     * share exactly as before. This is the half that cannot leave — a canvas
     * needs a `document`.
     */
    let card: Blob | null;
    try {
      card = await renderShareCard(theme, { ...words, shot: endShot.current });
    } catch {
      card = null;
    }

    return share(subject, s, NAME, card);
  }, [snap.state, snap.hud, daily, s, theme, standing]);

  /**
   * The shell's own hands, for `shell/beginning.ts` to put down in one order.
   *
   * Gathered once rather than passed door by door: the five doors differ by a
   * `Door` and by nothing else, and a wiring assembled at each call site would
   * be five copies of the same list — which is the thing being fixed.
   */
  const wiring = useMemo(
    () => ({
      session,
      // The run being LEFT still owes its last 400ms — see `Wiring.flush`.
      flush: () => keeper.flush(),
      setDaily,
      forgetEnding,
      forgetWorld,
      saidOnce,
      startedFrom,
      banked,
      setLens,
      // The strip over the board belongs to the run being left — see
      // `Wiring.forgetNote`. `say` with null is what a tap on it already does.
      forgetNote: () => say(null),
      setWalking,
      leaveMenus,
      frameTheRun,
      begin: beginRun,
      wentAgain,
    }),
    [
      session,
      keeper,
      setDaily,
      forgetEnding,
      forgetWorld,
      say,
      leaveMenus,
      frameTheRun,
      beginRun,
      wentAgain,
    ],
  );

  /**
   * Take the crossing: forget this world, and step into a fresh one carrying
   * what it paid.
   *
   * Banked before the world is replaced, in this order — relics first, then
   * the diary, then the world, then the run — because a crash between any two
   * of them must never leave a player who paid for a crossing standing in the
   * world they paid to leave.
   */
  const takeCrossing = useCallback(() => {
    /*
     * ONE MINTER FOR A WORLD SEED (2026-09-10).
     *
     * This rolled `Math.floor(Math.random() * 2 ** 31)` — a second formula for
     * the one thing `shell/storage.ts`'s `freshWorldSeed` exists to do, and the
     * one that drops the CLOCK. Its docblock's promise is that a seed stays
     * "roughly ordered, so a seed in a bug report says roughly when", and that
     * was true of three of `MODES.md`'s four world-minting sites. A crossing
     * mints a world like any other; it uses the minter like any other now.
     */
    const seed = freshWorldSeed();
    const after = cross({
      state: snap.state,
      // The live copy, so what is banked is what the card offered — see
      // `worldHeld`. This read `ledgers`, the offer read the disk, and the
      // label read `ledgers` again; three copies of one world.
      world: worldHeld(snap.state.rootSeed),
      progress,
      timeline: readTimeline(),
      seed,
      at: Date.now(),
    });
    setProgress(() => after.progress);
    writeTimeline(after.timeline);
    // The world it crosses INTO becomes the held one, so the first action of
    // the first run there merges onto it rather than onto the world just left.
    keepWorld(after.world);
    keeper.flush();
    clearRun(slot);

    // The card that offered this goes with the world it offered to leave.
    setSaidCard(null);
    /*
     * And in through the same door as every other run (2026-09-02).
     *
     * This used to write its own subset, and it was the subset that had
     * drifted furthest: no `saidOnce` reset, so a UNIQUE greeted on the world
     * you paid to leave stayed silent on the world you paid for; no
     * `startedFrom`, so NEW GROUND on a brand-new world was measured against
     * the abandoned one's reach; and no framing, so the camera stayed wherever
     * the last world's ending had left it. See `shell/beginning.ts`.
     *
     * `keepsWorld` is the one thing that is genuinely different here: the
     * crossing MINTS the world it is entering and has just handed it to the
     * keeper, so letting go of the held copy would throw away the only copy
     * that exists.
     */
    enterRun(wiring, {
      daily: null,
      resume: null,
      seed,
      // The world it crosses INTO is freshly minted: no ground revealed, no
      // shrine woken. The purse and the perks it carried come with it.
      memory: undefined,
      economy: economyAt(slot, seed),
      wakeAt: null,
      from: { reach: 0, perks: after.progress.found, unlocks: unlockedBy(after.world) },
      // A crossing goes to a world this device just minted, on its own seed.
      detour: false,
      keepsWorld: true,
      fromMenus: false,
    });
  }, [snap.state, worldHeld, slot, progress, setProgress, keeper, keepWorld, wiring]);

  /**
   * A fresh expedition into the world this device is standing in.
   *
   * One door with a `wakeAt` rather than two functions, for the reason
   * `Session.restart` is one door: NEW RUN and BEGIN AT CAMP differ by exactly
   * one argument, and everything else — the ledgers a run measures its gains
   * against, the economy it opens under, the lens it puts down — has to happen
   * in one order or the two disagree about what a run starts from.
   *
   * It is deliberately NOT the callback handed to a button. `onClick` passes
   * the mouse event as the first argument, and a `wakeAt` that is quietly a
   * `MouseEvent` is exactly the kind of thing that reaches a phone.
   */
  const startRun = useCallback(
    (wakeAt: HexKey | null) => {
      /*
       * The world's seed, not a fresh roll (2026-08-29).
       *
       * A new run is a new expedition into the SAME plane — that is what makes
       * revealed ground, claimed territory and woken shrines mean anything, and
       * it is the rule Ashwake 1 states outright in `keeper.ts`: "the seed
       * re-derives from `world.worldSeed` on the session that starts next."
       * Rolling a random one here re-generated the planet under a player who had
       * only pressed NEW RUN, and then `settle` correctly refused to bank it.
       */
      const at = activeSlot();
      const seed = worldSeedFor(at);
      enterRun(wiring, {
        daily: null,
        resume: null,
        seed,
        memory: memoryFor(at, seed),
        economy: economyAt(at, seed),
        wakeAt,
        from: startsFrom(at, progress.found),
        // `worldSeedFor` above: a new expedition is always into this device's
        // own world, which is what makes a shared link's flag stop here.
        detour: false,
        keepsWorld: false,
        // NEW RUN is pressed on the ending or the board; BEGIN AT CAMP is
        // pressed inside WORLDS and closes it on the way through.
        fromMenus: wakeAt !== null,
      });
    },
    [wiring, progress.found, startsFrom],
  );

  const newRun = useCallback(() => startRun(null), [startRun]);

  /**
   * BEGIN AT CAMP — the fifth shrine's unlock, finally opening onto something.
   *
   * `campFor` is what decides whether there is a camp at all; a null here is
   * not an error state to report but a button that was never offered, so the
   * guard is a plain return. The camp is read at the moment of the tap rather
   * than captured with the panel: a run claimed a farther territory while the
   * panel was closed is a run that moved the camp.
   */
  const beginAtCamp = useCallback(() => {
    const where = campFor(readWorld(activeSlot()));
    if (where === null) return;
    // Closing the panel and saying the arrival are `enterRun`'s now, for every
    // door — this used to add them after the fact, which is how NEW RUN came to
    // be the one door that never said what its territories were paying.
    startRun(where);
  }, [startRun]);

  /**
   * Out of the ending, without starting another run.
   *
   * Marc, 2026-08-29: *"in the end screen add a main menu."* The ending offered
   * NEW RUN, SHARE and MORE — so the only ways off it were to play again or to
   * open a panel over it, and a player who wanted to stop and look at their
   * worlds or their hall of fame had to go the long way round. The front door
   * is where every other screen leads back to.
   *
   * A scene change, never a reload (`CLAUDE.md`): the run is already banked, so
   * this is nothing but putting the door back in front of the board that is
   * still mounted underneath it.
   */
  const toMainMenu = useCallback(() => {
    newRun();
    setStarted(false);
  }, [newRun]);

  /**
   * Step into a world — a state change, never a reload (`CLAUDE.md`).
   *
   * The keeper for the world being LEFT is dropped by `setSlot` before the new
   * one runs, so a late write cannot land in the wrong world's save. Then the
   * session picks up whatever that slot kept, or begins a fresh run if it kept
   * nothing. The board host never unmounts through any of it, which is the
   * whole reason this is a function and not a navigation.
   */
  /**
   * Today's daily: everybody's board, and the one run that is not a world's.
   *
   * The seed is the DATE's, so two phones on the same day play the same
   * ground; the board is picked up only if it was put down on that same date,
   * which is `readDailyRun`'s guard and the one rule a daily may never break.
   * Leaving it steps back into the world the player came from — `slot` was
   * never given up, so there is nothing to choose on the way back.
   */
  /* TODAY, re-read when the page comes back — `shell/platform#useToday`. */
  const today = useToday();
  /**
   * Today's board, resumed or dealt fresh — and the difference is the whole
   * reason this takes an argument (2026-09-09).
   *
   * Two doors reach a daily and they want opposite things. The FRONT DOOR
   * should hand back the board you left half-played; **TRY AGAIN must not**,
   * because retry means retry. They shared one function that always resumed,
   * so a retry gave you the run you had just finished — Marc: *"its not
   * restarted at all when i come back"*. The keeper's un-flushed pending save
   * (see the banking effect) is what put a finished board back on the disk for
   * it to find; this is why finding one there can no longer matter.
   *
   * An argument rather than two functions, for `startRun`'s reason: the two
   * differ by exactly one thing, and everything else — the economy, the
   * absence of world memory, what the run measures against — has to be put
   * down in one order or the two doors disagree about what a daily IS.
   *
   * NOT the callback handed to a button, also for `startRun`'s reason:
   * `onClick` passes the mouse event as the first argument, and a `resume`
   * that is quietly a `MouseEvent` is exactly the kind of thing that reaches a
   * phone.
   */
  const openDaily = useCallback(
    (resume: GameState | null) => {
      enterRun(wiring, {
        daily: today,
        resume,
        seed: dailySeed(today),
        // A daily has no world memory at all, and letting go of the held copy is
        // what stops a board the world never walked being merged into it.
        memory: undefined,
        // No ledger, so no unlocks and no relics — and its shrines are rewritten
        // into caches and sites, because a door that opens nothing is worse than
        // no door at all.
        economy: economyFor({ kind: 'daily' }),
        wakeAt: null,
        // NULL IS THE MODE. A daily has no world, so there is nothing for NEW
        // GROUND to be new against — which is different from a world whose reach
        // is zero, and the distinction is why `reachAtStart` is `number | null`.
        from: null,
        // A daily is not a detour: it is a place the keeper knows, walled off by
        // construction, and `daily` is the flag that says so.
        detour: false,
        keepsWorld: false,
        fromMenus: true,
      });
    },
    [wiring, today],
  );

  /** The front door's daily: today's board, picked up where it was left. */
  const enterDaily = useCallback(() => openDaily(readDailyRun(today)), [openDaily, today]);

  /** TRY AGAIN, on a daily's ending: today's board, from the first tile. */
  const retryDaily = useCallback(() => openDaily(null), [openDaily]);

  const enterWorld = useCallback(
    (next: Slot) => {
      // Before the run is entered, because everything below reads the slot the
      // device is standing in.
      setSlot(next);
      // The world being entered, on the world's own seed — everything else
      // here already reads `readWorld(next)`, and the seed was the one field
      // that did not, so stepping from world 1 to world 2 changed the name on
      // the door and not the ground behind it.
      const seed = worldSeedFor(next);
      enterRun(wiring, {
        daily: null,
        // On THIS world, not merely in this slot — see `runFor`. A slot's run
        // key is where a shared link's run lives too, so asking by slot handed
        // a detour's board back under a world's name.
        resume: runFor(next, seed),
        seed,
        memory: memoryFor(next, seed),
        economy: economyAt(next, seed),
        wakeAt: null,
        from: startsFrom(next, progress.found),
        // On the world's own seed (`worldSeedFor(next)` above), so this is
        // never a detour — and this is the door a kept board and the front
        // door's SETTLE both come through, which is where a shared link's flag
        // used to survive into a world.
        detour: false,
        // Another world entirely: the held copy is the one being left.
        keepsWorld: false,
        fromMenus: true,
      });
    },
    [wiring, setSlot, progress.found, startsFrom],
  );

  /*
   * KEEP THE SEED IS GONE (2026-09-09, Marc's ruling: *"Remove it"*).
   *
   * `settleThisWorld` was Ashwake 1's front-door SETTLE, ported on 2026-09-02
   * because a `?seed=` link was otherwise a one-sitting visit however good the
   * ground turned out to be. That reason is answered better now and elsewhere:
   * a shared board plays a daily's economy and its ENDING offers KEEP THIS
   * BOARD, which carries the ground walked and the territories claimed and lets
   * the player name the slot rather than taking the first free one.
   *
   * So the door had two offers to keep the same board, the worse one first, and
   * that one was the only un-bordered control between two bordered buttons —
   * it read as a caption. **Keeping a board is one thing that happens in one
   * place now**, at the end, carrying what the run did.
   *
   * What went with it: the `settle` prop and its button on `FrontDoor`,
   * `ui.settleWorld`, and `storage.ts`'s `settleSlot` — whose only caller this
   * was. `isFreeSlot` stays: nothing else read it either, but it is the
   * VIRGIN-world question, and `meta/world.ts`'s `hasBeenPlayed` under it is
   * read by the KEEP THIS BOARD picker. `git log` is the archive.
   */

  /**
   * KEEP THIS BOARD — the board just played, turned into one of this device's
   * three worlds (2026-09-05, Marc, of what CONTINUE IN MY WORLD had always
   * meant to him: *"i want to import this seed in one of my 3 worlds as a new
   * world that i'd like to explore further, with this first run in mind"*).
   *
   * **A SHARED BOARD REACHES IT TOO** (2026-09-09, Marc: *"For a shared world,
   * it should be able to be played like a daily for a first run, then the same
   * question goes: do we continue in a world? if yes, we keep the same."*) It
   * was a daily-only offer, and a shared link had only the front door's SETTLE
   * — which kept the SEED, took the first free slot rather than one the player
   * names, and carried nothing the run did. Both halves of Marc's sentence are
   * the same offer now: a detour plays a daily's economy
   * (`shell/economy.ts`) and ends on a daily's question.
   *
   * **And it is the ONLY offer, since 2026-09-09.** The front door's SETTLE is
   * deleted (Marc: *"Remove it"*): two ways to keep one board, the worse one
   * first, was the thing to fix rather than a distinction to defend.
   *
   * What it does NOT carry is the run — `worldFromRun`'s docblock has the
   * reasoning, and it is Marc's answer when asked, over both "the run counts as
   * run 1" and "seed only". `sealGoals` is the guard that makes that true of
   * the SURVEY as well: the ground, the territories and the reach it plants are
   * three of the five goals' own inputs, so without it one placement in the new
   * world collected 90 relics for a survey nothing there had done.
   *
   * `settleWorldInto` rather than a write here, for `settleSlot`'s reason: the
   * slot's saved run and shop have to go with it, and one place should know
   * that. And in through `enterWorld` rather than by setting state, for that
   * function's reason: everything a run starts from is put down in one order
   * or two doors disagree about what a run starts from.
   */
  const importDaily = useMemo(() => {
    if (daily === null && !session.detour) return undefined;
    const seed = snap.state.rootSeed;
    const state = snap.state;
    return {
      worlds: ledgers.worlds,
      onImport: (into: Slot) => {
        settleWorldInto(into, sealGoals(worldFromRun(seed, state), readProgress()));
        // The diary's arrival entry, before the navigation — a world taken is
        // a world-scale moment, and no run-end hook sees this door.
        writeTimeline(
          appendEntry(readTimeline(), {
            at: Date.now(),
            kind: 'world',
            event: 'settled',
            slot: into,
            worldSeed: seed,
          }),
        );
        setActiveSlot(into);
        enterWorld(into);
      },
    };
  }, [daily, session.detour, snap.state, ledgers.worlds, enterWorld]);

  /**
   * The purse's own handler, kept OUT of whichever component draws the
   * button (2026-08-30; the button itself has moved between `ActionBar` and
   * `Camera` twice since, most recently 2026-09-04 — see `screens/Camera`).
   *
   * It is the drip's most expensive card, and it belongs with the other
   * things a board tap can set off rather than inlined into whichever
   * component happens to own the button this week.
   */
  const onPurse = useCallback(() => {
    const opening = !purseOpen;
    setPurseOpen((was) => !was);
    if (opening) setLensOpen(false);
    /*
     * The purse teaches on the first deliberate OPEN rather than on
     * having one: a lesson about spending is no use before there is
     * anything to spend it on.
     *
     * **And it actually teaches, since 2026-08-30.** `purseLesson`
     * builds the whole card from the LIVE tuning — the lead sentence
     * plus one row per button the drawer offers, each quoting its own
     * button face and its own price — and it is what Marc asked for
     * twice in Ashwake 1 ("first luck drawer expand we should explain
     * all actions", then again because the first answer did not land).
     * It had **no caller in this body**: `purse` is in the teaching
     * ledger and in the CARDS set, `isTrue('purse')` returns false by
     * design because the OPEN is the moment, and this handler marked
     * the lesson TOLD without ever showing it. So the drip's most
     * expensive card was a line that spent its own ledger entry.
     *
     * Through `saidCard` rather than `LessonCard`: there is no
     * `purse` lesson in `LESSONS` and there should not be — this
     * arrives with its sentences and its rows already written, which
     * is exactly what `SaidCard` takes. It holds the screen: read once
     * ever, and a list is not a glance.
     */
    if (opening && !hasMet(progress, 'purse')) {
      const lesson = purseLesson(snap.state.tuning, theme, s);
      shellSaid.current -= 1;
      setSaidCard({
        text: lesson.text,
        rows: lesson.rows,
        icon: lesson.icon,
        card: true,
        id: shellSaid.current,
      });
    }
    setProgress((p) => told(p, 'purse'));
  }, [purseOpen, progress, snap.state.tuning, theme, s, setProgress]);

  /*
   * And the asking is spent here — on the STARTING TILE, not on the frame.
   *
   * `flyToFit` was the obvious call and it is the wrong one: it frames
   * everything the board is drawing, and on a fresh world that includes the
   * landmarks glowing out in the dark. The settlement came out low on the
   * screen with an empty half above it, framed dead centre between where you
   * are and a cache you have not walked to — which is a picture of the plane
   * rather than of where you are standing. Marc asked for *"centered on the
   * starting tile"*, and that is a hex, not a bounding box.
   *
   * `homeOf`'s rule, read here rather than imported, because the engine's
   * helper answers in axial coordinates and the board's handle takes a key:
   * the wake point if this run has one, and true origin otherwise, which is
   * every save that exists today.
   *
   * Zoom 1 is the scale at which the whole frame fits — so the first leg is
   * that same opening view, slid over until the tile you are about to build
   * from is in the middle of it. **And since 2026-09-16 there is a second
   * leg** (Marc, from his phone: _"whole world, then fly in"_): a beat on the
   * whole world, then one glide to the frontier at DEFAULT's zoom. On a fresh
   * world the two legs are the same camera and the second is not flown; on a
   * returning player's world it is the difference between a picture of what
   * they built and the hex they are about to build from. `BoardHandle.open`
   * carries the rules — a finger during the beat wins.
   *
   * Zero is the mount, and the rig has already fitted for itself by then —
   * flying again would be the board moving on its own before the first tap.
   */
  useEffect(() => {
    if (framing === 0) return;
    board.current?.open(snap.state.wakeAt ?? key(0, 0));
    /*
     * AND THE FOUR MILLISECONDS GO HERE (2026-09-23, Marc's 2026-09-16 ruling:
     * the JIT warm-up is wanted _"as part of a welcome and death sequence
     * rather than as four milliseconds"_).
     *
     * `session.warm` runs one throwaway placement through the reducer and the
     * two views and drops all of it, so the code the first tap needs is
     * compiled during the opening beat instead of under the thumb that asked
     * for it (`LOG.md` Session 100: 4.4 ms of `V8.CompileCode`, the only
     * first-time-only line in a 16.7 ms first placement).
     *
     * Beside `open` rather than inside it, because the board knows about a
     * camera and the session knows about a run — and this is the run's work,
     * done on the board's beat.
     */
    session.warm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [framing]);

  /*
   * A RUN BEING PLAYED — and not while a film is up (Marc, 2026-09-25, of the
   * replay: "make sure we go into a replay view where we see tiles, map, but
   * no message or anythgng can pop"). A film opened from the hall of fame in
   * the middle of a run left the whole run's chrome over it — the stats, the
   * hand, the cluster, the toast — and its keys live under it. Every one of
   * those is gated on this, so the film is the board and its own bar, and
   * the run comes back exactly as it was when the film closes.
   */
  const playing = started && !snap.hud.ended && film === null;

  /**
   * The lesson allowed to interrupt right now, or null.
   *
   * `shell/speaking.ts#mayTeach` is the rule and carries the bug behind each of
   * its clauses. It is spent into a NAME here rather than read inline in the
   * JSX, because the old five-part condition was doing two jobs: stating the
   * rule, and narrowing `card` away from null for the four uses inside the
   * block. Splitting those apart is the whole point of the extraction, so the
   * narrowing gets a name too instead of an assertion at each use.
   */
  const teaching = mayTeach({
    card,
    said: saidCard !== null,
    touring,
    speaking,
    watching: film !== null,
    ended: snap.hud.ended,
  })
    ? card
    : null;

  /**
   * A desktop, or anything else with a real pointer.
   *
   * The only thing it gates is the manual's key list: the keys themselves are
   * always live, because a phone with a bluetooth keyboard is a phone this
   * query calls coarse, and refusing it the arrows would be refusing it the
   * board. What a query like this can honestly decide is whether to spend a
   * screen of a phone's manual on keys nobody there has.
   */
  const keyboard = useMediaQuery('(pointer: fine)');

  /** The camera cluster's cycle, held here because `0` presses it too. */
  const { next: nextView, step: cycleView } = useCameraCycle(board);

  /*
   * The board answers a keyboard (2026-08-29).
   *
   * Marc: *"do a pass for keyboard + desktop play (all cam movement, etc.) and
   * easy tile placements."* `INTERACTIONS.md` has listed the missing half of
   * this since the file was written, inherited from Ashwake 1, which shipped
   * without it and said so.
   *
   * **On the window, not on the board.** A listener on the focused element
   * would mean clicking the board before every arrow — and a player who just
   * pressed POP has their focus on POP. `takesKey` is what makes that safe: a
   * focused control keeps Enter and Space, a text field keeps everything, and
   * the board takes the rest. The board is still focusable and still says what
   * it is, because a screen reader has to be able to arrive somewhere.
   *
   * The guard is `playing && !anyOpen`, which is the same condition the board
   * host goes `inert` under — one idea, two mechanisms, and they must not
   * disagree about whether the board is reachable.
   */
  useEffect(() => {
    if (!playing || anyOpen) return;
    const onKey = (event: KeyboardEvent): void => {
      // Escape with nothing open is the toast's dismissal — the gesture the
      // toast has always had for a finger, finally reachable without one.
      if (event.key === 'Escape') {
        say(null);
        return;
      }
      const command = commandFor(event);
      if (command === null) return;
      if (!takesKey(focusKindOf(document.activeElement), command)) return;
      event.preventDefault();
      const b = board.current;
      switch (command.kind) {
        case 'cursor': {
          /*
           * Walking the marker takes FOCUS, and that is what makes Enter work.
           *
           * Marc, 2026-08-29: *"for keyboard, space or enter doesnt seem to
           * put the tile"*. It did not, and the reason was a rule that is right
           * in general: a focused control owns Enter and Space, because that is
           * how a button is pressed. But the ordinary way to play with a
           * keyboard is to PICK A CARD — with a click, or with `1`–`8` after a
           * click — and picking one leaves focus on that card's button. So the
           * aim worked, and then Enter went to the card and re-pressed it,
           * putting the card down instead of the tile.
           *
           * Moving the marker is a player saying they are working on the board,
           * so focus follows the statement. The board is `role="application"`
           * and not a button, which is exactly why `takesKey` then hands it
           * Enter — and a player parked on POP who never touches an arrow still
           * presses POP with Enter, which is the behaviour the rule was for.
           */
          b?.focus();
          const aim = b?.moveCursor(command.dir) ?? null;
          if (aim !== null) onLook(aim.key, aim.cell);
          return;
        }
        case 'act': {
          const aim = b?.cursorCell() ?? null;
          if (aim !== null) {
            // Enter is the keyboard's tap AND its hold: it cannot press long.
            onTap(aim.key, aim.cell, true);
            return;
          }
          // No marker yet, so this press is the one that summons it. It does
          // not also act: the first thing a key does must never be to spend a
          // tile on a hex the player has not looked at.
          const shown = b?.moveCursor(null) ?? null;
          if (shown !== null) onLook(shown.key, shown.cell);
          return;
        }
        case 'pan': {
          // An arrow shows what is that way, so the board slides the other
          // way — the direction a document scrolls, not the direction a finger
          // drags.
          const slide = {
            up: [0, PAN_STEP],
            down: [0, -PAN_STEP],
            left: [PAN_STEP, 0],
            right: [-PAN_STEP, 0],
          }[command.dir];
          b?.panBy(slide[0] ?? 0, slide[1] ?? 0);
          return;
        }
        case 'zoom':
          b?.zoomBy(command.closer ? ZOOM_STEP : 1 / ZOOM_STEP);
          return;
        case 'turn':
          b?.turnBy(command.by);
          return;
        case 'lean':
          b?.leanBy(command.by);
          return;
        case 'hold': {
          /*
           * H reaches the STASH, which a keyboard could not (2026-08-29).
           *
           * Marc: 'add a keyboard shortcut or a way to hold tiles too'. Every
           * other thing a thumb can do had a key — walk, act, pan, zoom, turn,
           * lean, pick a card — and the stash had none, which is the same
           * shape as the stash spending a whole stage unreachable by tap.
           *
           * The first EMPTY slot, or the first slot when both are full: a key
           * that had to be told WHICH slot would be two keys, and the stash is
           * two dashed cards a player thinks of as one place.
           */
          const free = snap.hud.held.findIndex((h) => h === undefined);
          onHold(free === -1 ? 0 : free);
          b?.focus();
          return;
        }
        case 'view':
          cycleView();
          return;
        case 'card':
          // A digit past the end of the hand is a press at nothing, not a
          // deselection: the hand shrinks between deals and the number keys
          // must not become destructive as it does.
          if (command.index < snap.hud.draft.length) {
            onSelect(command.index);
            // Focus goes to the board for the same reason an arrow moves it:
            // picking a card is the first half of placing one, and Enter has
            // to reach the board for the second.
            b?.focus();
          }
          return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // `cycleView` rather than the cycle object: the hook hands back a
    // fresh object every render, and depending on that would rebind the listener
    // on every frame of the game.
  }, [
    playing,
    anyOpen,
    onLook,
    onTap,
    onSelect,
    onHold,
    cycleView,
    snap.hud.draft.length,
    snap.hud.held,
    say,
  ]);

  return (
    /*
      ONE AUTHORITY ON THE LANGUAGE, and it is `<html>` (2026-09-02).

      This carried `lang={s.locale}` as well, so two elements declared it — and
      the one on the shell is the wrong one twice over. It does not cover the
      failure panel, the `<noscript>` block or anything else `main.tsx` puts
      outside the root; and it cannot reach the document, which is what a
      browser's translate prompt, a screen reader's voice and a hyphenation
      dictionary all read. `ui/theme.ts` writes `document.documentElement.lang`
      when the locale resolves, which is the statement that actually does
      anything.
    */
    <div className="shell">
      {playing && (
        <Hud
          hud={snap.hud}
          s={s}
          onNote={say}
          menu={
            <MenuButton
              s={s}
              open={more.open}
              onToggle={() => (more.open ? more.hide() : more.show())}
            />
          }
        />
      )}

      {/*
        Reachable only while it is the thing on screen.

        A panel covers it, the front door covers it, and — since 2026-08-30 —
        the END SCREEN covers it, which this had never said. A finished run left
        the board non-inert under an opaque page, so a Tab walked the keyboard
        onto a board nobody could see. `walking` is the one case where the
        ending is up and the board is still the thing being used, which is what
        it is for.
      */}
      {/*
        `role="main"` (2026-09-03): the board is the one thing this whole app
        is for, and no landmark anywhere named it — a screen reader's "jump to
        main content" and a browser's landmark navigation had nothing to land
        on. Safe beside `inert`: `inert` already removes a subtree from the
        accessibility tree (`board-host` goes inert exactly when something
        else — a panel, the end screen — is the thing actually on screen), so
        this can never register as a second, competing landmark.
      */}
      <div
        className="board-host"
        /*
         * ANY TAP ON THE PLAIN ENDS A FILM, not only one that lands on a hex
         * (2026-09-23, Marc: *"a tap skips to the score"*).
         *
         * `onTap` is the board's CELL handler — it fires when a ray hits a
         * tile — so a tap on the open plain beside the run being replayed did
         * nothing at all. On a real device that is most of the screen, and the
         * gesture Marc asked for would have worked or not depending on where a
         * finger happened to land relative to a board it is watching rather
         * than playing.
         *
         * `pointerdown` rather than click, because that is when a tap is felt,
         * and only while a film is up: during a run this host must stay exactly
         * as sensitive as it was.
         */
        {...(film === null ? {} : { onPointerDown: closeReel })}
        role="main"
        /*
         * AND A FILM IS THE OTHER CASE WHERE THE BOARD IS THE THING IN USE
         * (2026-09-23).
         *
         * `walking` was the one exception to "an ended run means the board is
         * behind an opaque screen, so make it inert"; a replay is the second,
         * and for exactly the same reason. It is also load-bearing rather than
         * tidy: a tap on the board is how a film is meant to be skipped
         * (`onTap`), and an inert host takes no taps at all — the gesture Marc
         * asked for could not reach the board it was aimed at.
         */
        /*
         * And a film opened from the FRONT DOOR (the hall of fame, reached
         * through MORE before any run has begun) is the board in use as well,
         * though `started` is false: see the front door below.
         */
        {...(anyOpen || (!started && film === null) || (snap.hud.ended && !walking && film === null)
          ? { inert: true }
          : {})}
      >
        {/*
          The one `Suspense` in the app, and it wraps the one thing that is
          worth waiting for. `null` rather than a spinner: for the few hundred
          milliseconds this is pending the board host is behind the front door,
          so a loading state here could only ever flash at somebody who was
          reading something else. See `Board`'s declaration for why the
          renderer arrives after the door and why that leaves the never-remount
          rule intact.
        */}
        <Suspense fallback={null}>
          <Board
            /*
             * THE BOARD DRAWS THE FILM WHEN THERE IS ONE (2026-09-23).
             *
             * One `<Board>`, two possible sources — the run being played, or
             * the run being watched. That is the whole of what makes a replay
             * cost so little: the leap, the cascade, the rings, the lit
             * destinations and the camera are all drawn from a snapshot, so
             * handing over a different snapshot IS the replay. `CLAUDE.md`'s
             * rule that the host never remounts is what makes it safe: the
             * canvas, its context and its materials belong to the page, not to
             * whichever session is currently feeding it.
             */
            view={film?.snap.board ?? snap.board}
            theme={theme}
            popped={film?.snap.popped ?? snap.popped}
            tilt={look.tilt}
            yaw={look.yaw}
            relief={look.relief}
            light={look.light}
            materials={look.materials}
            art={look.art}
            renderScale={renderScale}
            {...(Number.isFinite(look.ghost) ? { ghostStrength: look.ghost } : {})}
            reducedMotion={reducedMotion}
            // TEMPORARY (2026-09-11): the `board.awake` switch is `?rest=0`
            // as a row in SETTINGS — see `meta/features.ts` for the removal.
            // And never while a film plays (2026-09-24): a replay with its
            // dives runs past the fifteen seconds, nobody touches a film, and
            // a board that rested mid-film dimmed the thing being watched.
            restMs={isEnabled(features, 'board.awake') || film !== null ? 0 : look.rest * 1000}
            wakeMs={look.wake}
            onTap={onTap}
            onHold={onHoldHex}
            handle={board}
            label={s.ui.board.label}
            keyHelp={s.ui.board.reach}
          />
        </Suspense>
        {/*
          THE VIGNETTE, at last (2026-09-08).

          `board.vignette` has been authored since the theme was written and
          drawn by nothing — the default board was missing atmosphere its own
          direction asks for. Settlement authors it; daylight authors `null`
          deliberately, on the argument that there is no dark for a pale board
          to fall off into, so this renders for exactly one direction.

          **CSS rather than a shader, and that is the whole implementation.** A
          vignette is screen-space by definition — it darkens the CORNERS of
          the frame, not the far end of the world — so a post-processing pass
          would be a lot of machinery to reproduce what one gradient already
          says. It also keeps the promise the board host makes elsewhere:
          chrome floats OVER the board and never inside it.

          `inert` is not enough here because this is not chrome a finger should
          ever find, so `pointer-events: none` in the stylesheet is what keeps
          every tap going to the hex under it.

          The token's rule is honoured by construction: `strength` is a
          CEILING, so the gradient reaches its alpha only at the very corners
          and the middle — where the ground you have built is — stays entirely
          clear. Darkness hides the space, never the ground.
        */}
        {vignette !== null && (
          <div className="board-vignette" aria-hidden="true" style={vignette} />
        )}
        {/*
          What just happened, over the board rather than beside it (2026-08-30).

          It stays a `<p>` and does not become a button, on purpose: a live
          region has to be on the page BEFORE its text changes or nothing
          announces it, and an element that appears and disappears with the note
          is an element half of the readers here would miss. Its dismissal is a
          tap, as it always was, and Escape when nothing is open.

          It moved INSIDE the board host so it can be laid over the board's own
          bottom edge (Marc: *"we DON'T lose any height space and have maximum
          map"*). It was a permanent 22px band above the hand, empty most of the
          time. Being in the DOCUMENT and being in the LAYOUT are different
          things, and only the first is what a live region needs.

          Over the board is also where the eye already is — which was the
          argument for making a pop a card in the first place.
        */}
        {playing && (
          <p className="toast" role="status" aria-live="polite" onClick={() => say(null)}>
            {/*
              A note you can OPEN (2026-08-30).

              A pop arrives here as its lead line with the rest of the receipt
              behind it, so the button is the "tap for details" half and the
              paragraph around it is the "tap out" half — the same tap that has
              always dismissed a note. A plain sentence has nothing behind it
              and stays plain text, because a button that does what tapping
              anywhere already does is a control that teaches nothing.

              The paragraph, not the button, is the live region: it has to be on
              the page before its text changes or a screen reader announces
              none of this, and it has been for exactly that reason since the
              toast moved over the board.
            */}
            {note === null ? (
              ''
            ) : note.more === null ? (
              note.text
            ) : (
              <button
                type="button"
                className="toast-open"
                data-action="pop-details"
                onClick={(event) => {
                  // The paragraph's own handler dismisses; this one opens. One
                  // tap must not do both.
                  event.stopPropagation();
                  const shown = note.more;
                  say(null);
                  if (shown !== null) setSaidCard(shown);
                }}
              >
                {note.text}
                <span className="toast-more">{s.ui.details}</span>
              </button>
            )}
          </p>
        )}
        {look.directions && <Directions s={s} stored={storedTheme} onTheme={setStoredTheme} />}
        {/*
          THE DEBUG LINE, behind `?ff=debug.overlay` (2026-09-02).

          The flag shipped `wired: true` with nothing reading it and no door to
          turn it on. Both halves are built now: `useDevice` applies `?ff=`, and
          this is the reader. Over the board, above the toast, in the smallest
          type the palette has — it is for whoever is holding the phone beside a
          bug report, and it must never take space from the map.

          `aria-hidden`, deliberately: it is ids and integers in no language, and
          a screen reader working through `rng 41/12` before every note is a
          worse experience than not having it.
        */}
        {playing && isEnabled(features, 'debug.overlay') && (
          <p className="debug-line" aria-hidden="true">
            {debugLine(snap.state, progress.equipped[0] ?? null)}
          </p>
        )}
        {/*
          The two corners, and the rule that split them (2026-08-30, revised
          2026-09-04).

          **Chrome floats over the board, actions sit in the footer.** MENU is
          the way OUT of the game rather than a move in it, so it is top-right,
          clear of the arc a thumb sweeps fifty times a run; the camera keeps
          the bottom corner it is named for. LUCK went down to the action row
          with POP and SACRIFICE for a while (Marc: *"the accented button
          should be with the luck buttons... this, but menu move top right"*)
          and came back out — Marc: *"make it live outside the hand next to
          camera button."* It spends a run's currency rather than a pocket's,
          so it rides in `Camera`'s own corner now — see `screens/Camera`.

          Both survive the run, because the ending's board is walked with the
          same two controls — see `walking`.
        */}
        {/*
          In the HEADER while a run is played (Marc, 2026-09-25: "place it
          with the header") — see `Hud`'s `menu`. The walked ending has no
          header, so there it keeps the corner.
        */}
        {walking && film === null && !playing && (
          <MenuButton
            s={s}
            open={more.open}
            // Opens the same MENU panel every other MENU button in the game
            // opens (2026-09-03) — see `More.tsx`'s own doc comment. This used
            // to open a separate drawer (`QuickMenu`) with its own row set;
            // retired rather than kept as a second list of the same rooms.
            onToggle={() => (more.open ? more.hide() : more.show())}
          />
        )}
        {(playing || (walking && film === null)) && (
          <Camera
            s={s}
            next={nextView}
            onCycle={cycleView}
            // The purse is a run action, not a walked-ending one — `playing`
            // gates it the same way `hand-host` used to gate the button that
            // opened it, back when the button lived there.
            luck={snap.hud.luck}
            canSpend={playing && snap.hud.spends.length > 0}
            onPurse={onPurse}
            purseOpen={purseOpen}
            canLens={playing}
            onLensPanel={onLensPanel}
            lensOpen={lensOpen}
            /*
             * A POCKET'S BUTTONS, first in the cluster (Marc, 2026-09-25: "pop,
             * luck, lens, camera"). They left the row above the hand — see
             * `PocketActions`. The burn is only offered once relics mean
             * something, as it always was.
             */
            actions={
              <PocketActions
                hud={snap.hud}
                s={s}
                knowsRelics={hasMet(progress, 'relic')}
                onHarvest={onHarvest}
                onNewRun={newRun}
              />
            }
          />
        )}
        {/*
          The lens's own way out, present exactly while a lens is lit
          (2026-09-01) — see `screens/Lens`. Top-left, the one corner of the
          board nothing else has claimed, and it survives the run for the same
          reason MENU and the camera do: the ending's board is walked with the
          same controls, and a lens lit during a run is still lit on it.
        */}
        {(playing || (walking && film === null)) && lens !== null && (
          <LensOff s={s} colour={lens} name={namesOf(theme, s.locale)[lens]} onClear={clearLens} />
        )}
        {/*
          The stranger console's door — see THE STRANGER CONSOLE further down.
          It lives HERE, in the board's box, since 2026-09-25: as a child of
          `.shell` its bottom-left corner was the SCREEN's, which is the hand's
          first card — the card a stranger taps first, under a button drawn
          over it. It sits above the cluster's real height, as the sheets do.
        */}
        {watching && !playtest.open && (
          <button
            type="button"
            className="playtest-open"
            data-playtest="open"
            onClick={() => playtest.show()}
            aria-haspopup="dialog"
          >
            WATCHING · {sheet.notes.length}
          </button>
        )}
      </div>

      {playing && (
        /*
          THE HAND IS BEHIND A PANEL TOO (2026-09-02).

          `.board-host` has gone `inert` under an open dialog since the stack
          was built, and the hand — the purse drawer and the action bar — never
          did. So a Tab from inside the manual walked out of it and onto POP,
          SACRIFICE and four cards sitting under an opaque panel: controls that
          are invisible, that spend a run's resources, and that a keyboard
          player reaches before they reach the panel's own BACK. The quick
          drawer is the loudest case — it is a menu whose scrim blocks the taps
          and does nothing about the tab order — but it is every panel.

          It was `display: contents`, so the wrapper took `inert` and gave the
          layout nothing — inert crosses a `display: contents` box either way,
          since it is inherited down the flat tree rather than the box tree.
          It is `position: relative` since 2026-09-04 instead (see `.hand-host`
          in `ui.css`): the drawer opening used to add its own height to this
          box, which was ALSO the box the board's flex sizing read, so the map
          shrank every time LUCK was tapped. Now the drawer is `position:
          absolute` against this box rather than a real flex sibling of it, so
          it opens on top instead of pushing anything — `inert` still reaches
          both children fine, a real box or not.
        */
        <div className="hand-host" {...(anyOpen ? { inert: true } : {})}>
          {/*
            The GUIDE line is gone from over the hand (2026-08-29).

            Marc: *"remove tips above hand tiles ... like Peu de tuiles.."* —
            `hud.guide` is the coaching line ("Low on tiles — POP a pocket
            now"), and it lived in the strip between the board and the cards.
            Two problems, and the second is the one that decided it: it was a
            SECOND live region a hand's width from the toast, so two sentences
            competed for the same glance; and it repeated what the board and
            the action bar already show — the pockets are outlined, POP names
            its own payout, and the tile count is in the stat row.

            `hud.guide` stayed computed in `view/` for two and a half weeks
            after that, on the argument that a coaching mode would find it
            built. Cut on 2026-09-16: nobody asked for one, and every fact it
            carried has its own door now — the pockets caption on the bar, the
            spare purse said once a run, the bounty mark on POP.
          */}
          {lensOpen && (
            <LensPanel
              hud={snap.hud}
              tuning={snap.state.tuning}
              theme={theme}
              s={s}
              onHold={holdLens}
            />
          )}
          {purseOpen && (
            <Purse
              hud={snap.hud}
              theme={theme}
              s={s}
              onSpend={(spend) =>
                act(
                  spend.on === 'steer' && spend.colour !== null
                    ? { type: 'SPEND', on: 'steer', colour: spend.colour }
                    : { type: 'SPEND', on: spend.on },
                )
              }
            />
          )}
          <ActionBar
            hud={snap.hud}
            theme={theme}
            s={s}
            onSelect={onSelect}
            onLens={onLens}
            onHold={onHold}
          />
        </div>
      )}

      {/*
        The door and the end screen are SCENES, in the same sense the board is:
        they fill the screen, they are what the game is currently showing, and a
        panel opens OVER them. So they are inert while one is — otherwise focus
        and taps reach a screen the player cannot see, which is the half of the
        stacking bug that a z-index alone does not fix.
      */}
      {started && snap.hud.ended && walking && film === null && (
        /*
         * The ending, out of the way (2026-08-30).
         *
         * Not the end screen with a class on it: `.end` is a scrolling column
         * pinned to `inset: 0`, and collapsing that into a bar is a CSS
         * argument with a layout, where this is one line of markup. The
         * numbers are not lost — nothing about the run has changed, and the
         * bar puts them straight back.
         */
        <div className="end-walk" data-hud="end-walk" {...(anyOpen ? { inert: true } : {})}>
          <button type="button" data-action="end-back" onClick={() => setWalking(false)}>
            {s.ui.backToEnding}
          </button>
          {/*
            REPLAY, INSIDE THE BOARD IT REPLAYS (Marc, 2026-09-25: "with
            buttons inside replay"). It was a second door at the foot of the
            end screen; the picture at the top opens this board now, and the
            film is played from here. `endFilm` is the film of the run this
            ending is about, kept when it was banked, so the button costs no
            disk read and is absent exactly when there was nothing to keep. The
            film closes back onto this board: `walking` is still set.
          */}
          {endFilm !== null && (
            <button
              type="button"
              data-action="watch-run"
              onClick={() =>
                setReel({
                  of: endFilm,
                  from: 'end',
                  ground: memoryFor(slot, endFilm.from.rootSeed),
                })
              }
            >
              {s.ui.watchRun}
            </button>
          )}
        </div>
      )}

      {/*
        THE FILM'S OWN BAR (2026-09-23).

        The same shape as the walked ending above — one row at the foot of the
        board, over a scene that is doing the talking — because it is the same
        idea: the chrome steps aside and the board is the screen. It says how
        far through the run the film is, because a replay with no progress on
        it is one a player cannot tell is nearly over, and it carries the one
        control a film needs.

        A tap on the BOARD does the same thing (`onTap`), which is what Marc
        asked for — *"a tap skips to the score"* — and the button is what makes
        that discoverable, and what a keyboard and a screen reader can reach.
      */}
      {film !== null && (
        <div className="end-walk" data-hud="watching" {...(anyOpen ? { inert: true } : {})}>
          <p className="watching-at">{s.ui.watching(film.step, film.of)}</p>
          <button type="button" data-action="watch-skip" onClick={closeReel}>
            {s.ui.watchSkip}
          </button>
        </div>
      )}

      {started && snap.hud.ended && !walking && film === null && (
        <div className="scene" {...(anyOpen ? { inert: true } : {})}>
          <EndScreen
            hud={snap.hud}
            /*
             * EVERY harvest, in order — which is what the caption promises.
             *
             * It was filtered to the scoring ones, so a run that mostly popped
             * for TILES charted two or three bars out of a dozen pops, and a
             * run with one scoring pop charted a single bar (`Arc` now refuses
             * that outright). `arcSparkline` in the core — the same shape, as
             * a string, on the daily's share line — has always read every
             * harvest, and a zero is not a gap: it says the player was banking
             * tiles rather than points just then, which is most of what the
             * shape of a run IS.
             */
            harvests={snap.state.log.harvests.map((h) => h.points)}
            s={s}
            theme={theme}
            progress={progress}
            onTerm={setTerm}
            onNewRun={newRun}
            onProgress={setProgress}
            onMore={() => more.show()}
            onShare={onShare}
            goals={goals}
            onWalk={() => setWalking(true)}

            newPerks={gained.perks}
            newUnlocks={gained.unlocks}
            world={endWorld}
            onMainMenu={toMainMenu}
            standing={standing}
            /*
             * TRY AGAIN IS ITS OWN DOOR (2026-09-09), and this comment was the
             * bug's alibi.
             *
             * It said "the settle above has already cleared the kept board, so
             * entering today's daily IS starting today's board over" — and the
             * clear it named was undone 400ms later by the keeper's pending
             * debounced save, which that branch never flushed. So `enterDaily`,
             * which RESUMES whatever is on the disk, handed back the run that
             * had just finished. Marc: *"its not restarted at all when i come
             * back"*.
             *
             * Both halves are fixed and they are different fixes: the banking
             * effect flushes before it clears, and a RETRY no longer asks the
             * disk at all (`openDaily(null)`). A comment that asserts an
             * invariant is not the invariant — and this one stopped three
             * readers, including its author, from checking.
             */
            /* And the STREAK, read from the book the settle above just wrote —
               so the number is what the front door will say next time rather
               than one run behind it. See `EndScreen`'s `daily.streak`. */
            daily={
              dailyTry === null
                ? null
                : {
                    try: dailyTry,
                    // TRY AGAIN deals a fresh board — see `openDaily`. It was
                    // `enterDaily`, which RESUMES, so a retry handed back the
                    // run that had just finished.
                    onRetry: retryDaily,
                    streak: dailyStreak(readDailyBook(), today),
                  }
            }
            importDaily={importDaily}
            /* BACK UP, once, and only when there is something to lose — the
               threshold and the once-ever mark are settled where the ending
               banks, because `markSaid` is a write. See the banking effect. */
            backUp={showBackUp}
            fromLink={session.detour}
          />
        </div>
      )}

      {/*
        THE FRONT DOOR STEPS ASIDE FOR A FILM (2026-09-25, Marc: "replays from
        hall of fame dont work, they get me to the main menu, then get me back
        to the hall of fame after a while"). The hall is reachable from here,
        through MORE, before any run has begun; its REPLAY closed the panels
        and started the film under this opaque, full-screen door, SKIP and the
        board's tap included, and `closeReel` brought the hall back when the
        film ran out. It had been so since replays began (2026-09-23): the
        end screen's REPLAY, the one every test pressed, is only reachable with
        `started` already true. The door comes back when the film closes.
      */}
      {!started && film === null && (
        <div className="scene" {...(anyOpen ? { inert: true } : {})}>
          <FrontDoor
            s={s}
            resuming={snap.hud.placements > 0 && !snap.hud.ended}
            onBegin={beginRun}
            onMenu={() => more.show()}
            onDaily={enterDaily}
            themeId={theme.id}
            dailyBadge={dailyBadge(readDailyBook(), today, s)}
            mode={mode}
            day={daily === null ? undefined : dailyName(daily)}
            onInstall={offerInstall}
            handInstall={showHandInstall}
          />
        </div>
      )}

      {manual.open && (
        <Manual
          theme={theme}
          s={s}
          keyboard={keyboard}
          mode={mode}
          /* The manual grows with the world — see `Manual`'s `met`. The
             teaching ledger is the same one the drip writes, so a section
             appears on the run after the card that taught it. */
          met={progress.met}
          onBack={manual.hide}
        />
      )}

      {settings.open && (
        <Settings
          theme={theme}
          s={s}
          stored={storedTheme}
          features={features}
          onBack={settings.hide}
          onTheme={setStoredTheme}
          onLocale={setLocale}
          onFeature={(id, on) => {
            // SOUND goes through the one wire the board's own button uses; every
            // other flag is just a flag.
            if (id === 'ui.sound') setSound(on);
            else {
              // Turning haptics off stops whatever is in flight, the way
              // `voice.silence()` does for sound. A pop's pattern is 84ms, so
              // this is rarely visible and is exactly the sort of thing that
              // is unpleasant on the one occasion it is: the switch that is
              // meant to stop the buzzing, buzzing after it is pressed.
              if (id === 'ui.haptics' && !on) stopBuzz();
              setFeature(id, on);
            }
          }}
          renderScale={renderScale}
          maxRenderScale={MAX_RENDER_SCALE}
          onRenderScale={setRenderScale}
          onDevice={() => device.show()}
          /*
           * RESET TEACHING resets the TEACHING (2026-08-30).
           *
           * It handed back `EMPTY_PROGRESS`, which is the whole ledger — the
           * relic purse and every shop level with it. A control labelled
           * "RÉINITIALISER LES LEÇONS" that silently spends a world's savings
           * is the worst shape a destructive action can take: it does more
           * than it says, and the part it does not say is unrecoverable.
           * RESET ALL is next to it and is armed, and is what a player asking
           * for that would press.
           */
          onResetTeaching={() => setProgress((p) => ({ ...p, met: [] }))}
        />
      )}

      {more.open && (
        <More
          s={s}
          virgin={virgin}
          /*
           * A SHARED BOARD IS NOT OFFERED A RESTART, and hiding it is the
           * honest answer rather than a third branch (2026-09-10).
           *
           * `MODES.md`: *"a detour can only be ENTERED at boot, from the
           * URL"* — every door states `detour: false`, and that is the check
           * a sixth door cannot forget. A mid-run RESTART that dealt the same
           * shared seed again would be that sixth door, and it would be a
           * design change to the one invariant three sessions of bugs bought.
           *
           * The alternative is worse: leaving the button to call `newRun()`
           * is the bug above wearing a different mode. A visitor's own way to
           * start the board over is the link they arrived by, and
           * `CLAUDE.md`'s one page, many sessions rule means this game does
           * not offer a reload as a control.
           *
           * **Marc's ruling named two modes and this is the third**, so it is
           * in `NEXT.md` §1 as the one case his sentence did not cover.
           */
          canRestart={!session.detour}
          sound={isEnabled(features, 'ui.sound')}
          onSound={() => setSound(!isEnabled(features, 'ui.sound'))}
          onBack={more.hide}
          onHowToPlay={() => manual.show()}
          onFame={() => fame.show()}
          onSettings={() => settings.show()}
          onShop={() => shop.show()}
          onWorlds={() => worlds.show()}
          onDaily={enterDaily}
          /*
           * RESTART RESTARTS WHAT YOU ARE PLAYING (Marc's ruling, 2026-09-10:
           * *"restart should restart whats being played currently (world or
           * daily, one or the other)"*).
           *
           * It called `newRun()` unconditionally, and `newRun` LEAVES the
           * daily on purpose — its own docblock says so, because a fresh
           * random run played while the shell still thought it was in the
           * daily would be banked under today's date. So the one control that
           * looks like "start this over" took a daily player out of the daily
           * and into their own world, which is exactly the sentence Marc
           * wrote from his phone: *"we still cant restart a daily without us
           * getting back to our worlds."*
           *
           * Two modes, two doors, and both already existed —
           * `openDaily(null)` deals today's board fresh and had exactly one
           * caller (TRY AGAIN, on the end screen), which is why a run in
           * progress could not reach it.
           *
           * A shared board is the third mode and it is not offered this
           * control at all: see `canRestart` below.
           */
          onRestart={() => {
            // The whole stack, not this panel: MENU sits over whatever was
            // open when RESTART was pressed (the manual, say), so hiding only
            // this panel would leave that screen standing on a run that had
            // just been thrown away.
            if (daily !== null) openDaily(null);
            else newRun();
            leaveMenus();
          }}
        />
      )}

      {/*
        THE STRANGER CONSOLE, and the button that opens it — both only under
        `?playtest=1` (Stage 6, 2026-09-08).

        The button sits with the board's own corner controls rather than in a
        menu, because during Session C it has to be reachable in one tap from
        wherever the game is, and Marc is looking at a person rather than at
        this screen. It says WATCHING with a count, so a glance confirms the
        sheet is recording without opening it — the failure this instrument
        most has to avoid is being off while a stranger plays.

        It cannot appear for a player: `look.playtest` is read once from the
        query string and every dial there defaults off, so a shared `?seed=`
        link carries nothing.
      */}
      {watching && playtest.open && (
        <Playtest
          sheet={sheet}
          today={today}
          onNote={noteSheet}
          onUnnote={unnoteSheet}
          onBack={playtest.hide}
        />
      )}
      {device.open && (
        <Device
          s={s}
          onBack={device.hide}
          onReset={() => {
            clearEverything();
            // Including the world this session was holding: an erased device
            // that kept a merged world in a ref would write it straight back.
            forgetWorld();
            // And the last ending, which is about a world that no longer exists.
            forgetEnding();
            // The one place a reload would be honest — and it still is not one.
            // Everything erased is everything this shell was showing, so the
            // shell goes back to what a phone that has never played looks like.
            setProgress(() => EMPTY_PROGRESS);
            /*
             * AND IT LEAVES THE DAILY (2026-09-09).
             *
             * RESET ALL is reachable from MORE, which is reachable during a
             * daily, and this handler cleared the world, the ending, the purse
             * and the board — and not the one piece of state that says WHERE
             * the run is being played. So the session restarted on a fresh
             * world's seed while the keeper still pointed at the daily and the
             * banking effect still took the daily branch: the next run was
             * played on a private board and banked as today's shared score.
             *
             * The same shape as `Session.detour` an hour earlier — a mode flag
             * a door forgot to clear — and `settleDaily` has the seed guard
             * that catches it either way now.
             */
            setDaily(null);
            // Every world is gone, so this mints one — the same door a phone
            // that has never played comes through.
            {
              const at = activeSlot();
              const fresh = worldSeedFor(at);
              session.restart(fresh, null, undefined, economyAt(at, fresh));
            }
            banked.current = null;
            leaveMenus();
            setStarted(false);
          }}
          onRestored={() => {
            enterWorld(slot);
          }}
        />
      )}

      {worlds.open && (
        <Worlds
          s={s}
          active={slot}
          /* The world the run is ON, or null on a daily and at the front door
             — see `WorldsProps.here`. `started` matters because a player who
             has not begun is not standing in a world either. */
          /* Not on a daily AND not on somebody else's seed: `Worlds` says
             this prop means "the world the run in progress is actually ON",
             and a shared run is in none of the three. The daily half was
             fixed on 2026-09-09 and the detour half was missed the same day —
             one condition, two ways to not be in a world. */
          here={daily === null && !session.detour && started ? slot : null}
          worlds={ledgers.worlds}
          onBack={worlds.hide}
          onOpen={enterWorld}
          onAbandon={(which) => {
            clearSlot(which);
            enterWorld(which);
          }}
          camp={campHere === null ? null : { ring: campHere.ring, onBegin: beginAtCamp }}
        />
      )}

      {shop.open && (
        <Shop
          progress={progress}
          theme={theme}
          s={s}
          onProgress={setProgress}
          onTerm={setTerm}
          onBack={shop.hide}
        />
      )}

      {fame.open && (
        <Fame
          timeline={ledgers.timeline}
          records={ledgers.records}
          worlds={ledgers.worlds}
          atlas={ledgers.worlds[slot] === null ? null : { world: ledgers.worlds[slot], survey }}
          s={s}
          onBack={fame.hide}
          /*
           * WATCHING A ROW (2026-09-23). The panel closes, the film plays over
           * the board, and the hall of fame comes back when it is over — which
           * is what `reel.from` is for: a player three taps into their diary
           * must not be handed the end screen instead.
           *
           * `canWatch` asks the disk per row rather than this file keeping a
           * list: which films are still kept changes under the cap and under
           * the shed ladder, and a list built when the panel opened would offer
           * a door onto a film that has since gone.
           */
          canWatch={hasReplay}
          onWatch={(at) => {
            const kept = readReplay(at);
            if (kept === null) return;
            /*
             * THE WHOLE STACK, not just this panel (2026-09-23).
             *
             * The hall of fame is opened THROUGH `more`, so hiding the diary
             * alone leaves `more` standing over the board — a full-screen
             * dialog between the player and the film they just asked for,
             * swallowing the taps meant for it. `leaveMenus` is the same door
             * `enterRun` uses when a run starts from a menu, and for the same
             * reason: what happens next is the board.
             */
            leaveMenus();
            setReel({ of: kept, from: 'fame', ground: memoryFor(slot, kept.from.rootSeed) });
          }}
        />
      )}

      {/*
        THE NOTICES, IN A COLUMN (2026-09-02).

        Both of the notes below inherited `.toast`'s absolute bottom offset,
        and both can be true at once — a phone that opened a shared link inside
        Instagram while a new build was waiting got two sentences painted on
        the same pixels, the later one over the earlier. Nothing decided which;
        source order did.

        A stack that can hold two things has to be a stack. The column owns the
        offset now and the notes are ordinary blocks in it, so a second notice
        pushes the first up instead of erasing it.

        **And both are live regions that were inserted with their own content**
        — the exact fault the toast's docblock two hundred lines up states and
        avoids: *"a region has to be on the page BEFORE its text changes or
        nothing announces it."* An update arriving mid-run and a warning that a
        world may not survive this browser are the two most important sentences
        this game says without being asked, and neither was announced. The
        paragraphs are unconditional now and the BUTTONS are what come and go;
        `.toast:empty` keeps an empty one out of the layout, which is the same
        trick the toast uses.
      */}
      {/* Nothing pops over a film, a notice included; it waits, and is there
          again when the film closes. */}
      <div className="notices" {...(film === null ? {} : { hidden: true })}>
        <p className="notice-line update" aria-live="polite">
          {updated && (
            <button
              type="button"
              data-action="update"
              /*
               * FLUSH BEFORE THE RELOAD (2026-09-02).
               *
               * This is one of the two reloads `CLAUDE.md` allows, and it is
               * the one a player takes MID-RUN. The keeper batches writes and
               * is flushed by `visibilitychange` and `pagehide` — and a
               * same-document reload started by a click does not fire
               * `pagehide` on every engine, so up to a keeper interval of play
               * could be dropped by the mechanism that exists to protect a run
               * from an update. The whole argument for making this a button
               * instead of an automatic reload is that it must not eat the
               * thing it protects.
               */
              onClick={() => {
                keeper.flush();
                location.reload();
              }}
            >
              {s.ui.newVersion}
            </button>
          )}
        </p>

        {/*
        "YOUR WORLD MAY NOT BE KEPT HERE" (2026-09-02).

        A shared link most often lands inside Instagram or TikTok, whose WebView
        storage is partitioned and commonly wiped when the host app closes —
        which means the mode this game grows by is also the mode in which a
        world can silently evaporate. Ashwake 1 shipped this warning; this body
        shipped the share link without it.

        Dismissible and once ever, in the update note's own shape: it arrives
        unannounced over a game somebody is starting, and a sentence that cannot
        be put down is worse than the risk it describes.
      */}
        <p className="notice-line update in-app" role="status">
          {inApp && (
            <button type="button" data-action="in-app" onClick={() => dismissInApp()}>
              {s.ui.inApp}
            </button>
          )}
        </p>
      </div>

      {saidCard !== null && film === null && (
        <SaidCard
          // Keyed per utterance so a second utterance is a second card — a
          // fresh focus move and a fresh Escape — rather than a reused element
          // with the previous card's state.
          key={saidCard.id}
          text={saidCard.text}
          rows={saidCard.rows}
          theme={theme}
          s={s}
          onTerm={setTerm}
          onDismiss={() => {
            setSaidCard(null);
            setCardPerk(null);
          }}
          icon={saidCard.icon}
          {...(cardPerk === null
            ? {}
            : {
                wear: {
                  label: progress.equipped.includes(cardPerk) ? s.ui.takeOff : s.ui.wear,
                  onWear: () => setProgress((was) => equip(was, cardPerk)),
                },
              })}
          {...(saidCard.offers === 'crossing'
            ? {
                offer: {
                  // The number the card's own sentence was written from, priced
                  // at the moment the offer was made — see `Said.carried`. It
                  // recomputed from `ledgers`, which is a different copy of the
                  // world from the one the offer was priced against.
                  label: s.claim.crossLabel(saidCard.carried ?? 0),
                  armed: s.claim.crossArmed,
                  onTake: takeCrossing,
                },
              }
            : {})}
        />
      )}

      {/*
        THE STORY, as a card that arrives with its sentences already written
        (2026-09-03) — the `SaidCard` shape, not `LessonCard`'s: there is no
        `story` entry in `LESSONS` and there should not be one, for the same
        reason `purse` has none — `s.story` is the one source these four
        sentences have, and a registry entry would be a second place for them
        to drift. Ahead of every other card by construction (`shell/teaching`'s
        `ORDER`), so it is the first thing a stranger's first run says.
      */}
      {card === 'story' && saidCard === null && film === null && (
        <SaidCard
          text={`${s.ui.theStory}\n${s.story.join('\n')}`}
          theme={theme}
          s={s}
          onTerm={setTerm}
          onDismiss={() => {
            /*
             * A card's dismissal is a quiet beat, and for PLACE the decisive
             * one: its moment is true only before the first placement, and
             * the only thing between this card and that placement is this
             * tap. Judged against the ledger this dismissal just wrote,
             * which React does not hold yet — the write itself stays
             * functional so it cannot clobber a concurrent grant.
             */
            setProgress((p) => told(p, 'story'));
            speakLesson(told(progress, 'story'), session.get());
          }}
        />
      )}

      {/*
        One card at a time, and a RECEIPT outranks a lesson.

        A receipt is about something the player just did; a lesson is about
        something they could do. Stacking both is two modal dialogs over one
        board — the "menus over menus" problem in card form — and the lesson
        is the one that can wait, because its moment stays true until it is
        told.
      */}
      {/*
        `!touring` is the second half of the tour — see `showOnBoard`. A card
        raised while the board is away showing the LAST card's subject would be
        a lesson read over a moving map, and the trip behind its scrim would be
        a camera move nobody sees. The moment stays true and stays armed; this
        only decides when it is allowed to interrupt.

        `speaking === 0` is the same rule for a receipt that has not landed yet
        (2026-09-09, Marc: *"make sure no cards can pop while the first pop is
        happening (i think i had luck explained and coudnt see)"*). A pop's
        card waits out the cascade, and for the whole of that wait `saidCard`
        is null — so a lesson that came due on the same dispatch, which is
        exactly what LUCK does when tiles are popped, opened over the animation
        and was then unmounted the instant the receipt arrived. Shown, and
        withdrawn before it could be read. Held now until the board has
        finished saying what it is already saying.
      */}
      {teaching !== null && (
        <LessonCard
          id={teaching}
          theme={theme}
          s={s}
          // FIRED by a moment, so it carries the lesson's first-contact
          // sentence. The term card below is OPENED by a tap on a word and
          // does not: that reader already met the concept.
          firstContact
          dismiss={s.ui.gotIt}
          onDismiss={() => {
            // The same quiet beat the story card spends — see above.
            const after = told(progress, teaching);
            setProgress((p) => told(p, teaching));
            speakLesson(after, session.get());
            /*
             * AND GO AND LOOK AT IT, where the lesson was about a place.
             *
             * Here, on the dismissal, rather than on the card's arrival: the
             * board this reads is the board the card was fired about and is
             * still the one behind the scrim, and the player has just said they
             * are done reading. `showOnBoard` is silent for a lesson with no
             * hex, so most cards pass straight through it.
             */
            showOnBoard(teaching);
          }}
        />
      )}

      {term !== null && film === null && (
        <LessonCard
          id={term}
          theme={theme}
          s={s}
          dismiss={s.ui.gotIt}
          onDismiss={() => setTerm(null)}
        />
      )}
    </div>
  );
}
