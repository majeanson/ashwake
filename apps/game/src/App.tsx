import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GoalId } from '@content/goals';
import type { Colour } from '@content/tuning';
import { arcSparkline, dailyBadge, dailySeed } from '@meta/daily';
import { NAME } from '@meta/identity';
import type { ShareSubject } from '@meta/share';
import type { Action, GameState, HarvestChoice } from '@engine/state';
import type { CellView } from '@render/Renderer';
import { distance, parse, type HexKey } from '@engine/hex';
import { namesOf } from '@theme/tokens';
import {
  colourLesson,
  describeHexOf,
  pocketNote,
  purseLesson,
  rememberedNativeAt,
} from '@view/view';
import { isEnabled } from '@meta/features';
import { EMPTY_PROGRESS, grantFind, hasMet, perkText } from '@meta/progress';
import { ONLY_WORLD } from '@meta/records';
import {
  mergeRun,
  newWorld,
  unlockedBy,
  unlockLabel,
  type UnlockId,
  type WorldMemory,
} from '@meta/world';
import { economyFor } from './shell/economy';
import { parseRoute } from '@meta/route';
import { stringsFor } from '@text/index';
import { AUTO_THEME_ID, parseThemeId, pickForScheme, resolveTheme } from '@theme/index';
import { LESSON_FOR_REWARD, type LessonId } from '@view/lessons';
import { Board, type BoardHandle } from './board/Board';
import { commandFor, focusKindOf, takesKey, PAN_STEP, ZOOM_STEP } from './board/keys';
import { cascadeMs } from './board/leap';
import { ActionBar } from './screens/ActionBar';
import { Camera, useCameraCycle } from './screens/Camera';
import { Directions } from './screens/Directions';
import { EndScreen } from './screens/EndScreen';
import { FrontDoor } from './screens/FrontDoor';
import { Hud } from './screens/Hud';
import { LessonCard } from './screens/LessonCard';
import { SaidCard } from './screens/SaidCard';
import { Fame } from './screens/Fame';
import { Manual } from './screens/Manual';
import { More } from './screens/More';
import { Purse } from './screens/Purse';
import { Settings } from './screens/Settings';
import { Shop } from './screens/Shop';
import { Worlds } from './screens/Worlds';
import {
  activeSlot,
  clearDailyRun,
  clearEverything,
  clearRun,
  clearSlot,
  localToday,
  readDailyBook,
  readDailyRun,
  writeDailyBook,
  readRecords,
  readRun,
  readTimeline,
  readWorld,
  readProgress,
  memoryFor,
  worldSeedFor,
  onShed,
  writeRecords,
  writeTimeline,
  type Slot,
} from './shell/storage';
import { onceARun, type OnceId } from './shell/onceARun';
import { useLedgers } from './shell/ledgers';
import { shedNote } from '@meta/shedLadder';
import * as voice from './shell/voice';
import { registerWorker } from './shell/worker';
import { carriedBy, cross, dowryOf } from './shell/cross';
import { settle, settleDaily } from './shell/settle';
import { share, type ShareResult } from './shell/share';
import { campFor, createSession, useSession, type Said } from './shell/store';
import { useMediaQuery, useReducedMotion } from './shell/useMedia';
import { useDevice } from './shell/useDevice';
import { nextLesson, told } from './shell/teaching';
import { walk, walkToEnd } from './shell/walk';
import { Boundary } from './ui/Boundary';
import { Confirming } from './ui/Confirming';
import { DialogStack, useAnyDialogOpen, useDoor } from './ui/dialog';
import { PanelMenu } from './ui/Panel';
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
 */

/**
 * How the board looks unless a query string says otherwise.
 *
 * The tilt is Marc's, chosen from `docs/shots/`. The other four are WORKING
 * defaults rather than rulings (2026-08-29): the chrome is built around
 * whatever the board looks like, and building it over a board nobody has
 * chosen is the more expensive mistake. Every one still takes a number, so
 * `?light=0` is one keystroke away, and `DECISIONS.md` carries the question as
 * open until Marc has seen them on a phone.
 */
const TILT = 35;
const YAW = 0;
const RELIEF = 0.35;
const LIGHT = 1;
const MATERIALS = 1;
const ART = 1;

/**
 * How long the camera lingers on a claimed destination before coming home.
 *
 * Long enough to see WHAT was claimed and where, short enough that it never
 * feels like the game took the board away — the flight there and back is
 * 320ms each, so this is the still part in the middle.
 */
const CLAIM_HOLD_MS = 900;

/** A number off the query string, where zero is a real answer and `?x=` alone
 *  or a word is not — so `?tilt=0` gives the map back rather than the default. */
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

function dial(params: URLSearchParams, name: string, fallback: number): number {
  const raw = params.get(name);
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

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
  const [note, setNote] = useState<string | null>(null);
  /**
   * The colour lens, held up against the board.
   *
   * Two gestures reach it — a long press on a card in the hand, and a tap on
   * remembered fog — so it lives with the rest of the shell's state rather
   * than beside either one of them.
   */
  const [lens, setLens] = useState<Colour | null>(null);
  /** A picture of the board as the run ended — the end screen map, and the
   *  diary row. Held rather than re-captured: the board keeps playing. */
  const [shot, setShot] = useState<string | null>(null);
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
  type StartedFrom = {
    readonly reach: number;
    readonly perks: readonly string[];
    readonly unlocks: readonly string[];
  };
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
   * A receipt that is holding the screen, waiting to be dismissed.
   *
   * Held rather than derived from the snapshot: a card outlives the dispatch
   * that produced it — the player reads it, then taps GOT IT — and the session
   * has moved on by then.
   */
  const [saidCard, setSaidCard] = useState<Said | null>(null);
  /**
   * The id for an utterance the SHELL raises rather than the session.
   *
   * `Said.id` is "said again" versus "still saying" — the identity a card is
   * keyed on so a second one is a second card. The session mints them for the
   * receipts; anything the shell raises on its own needs one from somewhere,
   * and a counter that only goes up is the whole of it. Negative, so a shell
   * utterance can never collide with a session's.
   */
  const shellSaid = useRef(0);
  /** Goals this run was the one to meet, for the end screen. */
  const [goals, setGoals] = useState<readonly GoalId[]>([]);
  /** What this run has already said once. See `startedFrom` for the reach. */
  const saidOnce = useRef<Set<OnceId>>(new Set());

  const [purseOpen, setPurseOpen] = useState(false);
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
    registerWorker(() => setUpdated(true));
  }, []);

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
    onShed((rung) => setNote(shedNote(rung, s)));
  }, [s]);

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

  const theme = useMemo(() => {
    if (storedTheme !== AUTO_THEME_ID) return resolveTheme(storedTheme);
    // AUTO is the absence of a choice — what a fresh phone is set to — so the
    // device answers.
    return resolveTheme(pickForScheme(wantsLight, wantsContrast));
  }, [storedTheme, wantsLight, wantsContrast]);
  useThemeVars(theme);
  useDocumentLocale(locale);

  const session = useMemo(() => {
    const params = new URLSearchParams(location.search);
    // A run this device left behind is resumed as the very object the reducer
    // left, not re-simulated — a replayed run is a run that can disagree with
    // the one that was played. A shot query means a fresh board every time.
    const scripted = dial(params, 'place', 0) > 0 || dial(params, 'end', 0) > 0;
    /*
     * A DETOUR: somebody else's world, opened from a shared link.
     *
     * `?seed=` is what SHARE puts in the URL, so this is the ordinary way a
     * stranger meets the game. The run is real and it is scored; what it must
     * not do is touch the device's OWN world — see the seed guard in
     * `settle`, and `detour` here, which is what stops a shrine claiming an
     * unlock for a world this run was never played on.
     */
    /*
     * A shared DAILY, which is the other kind of link SHARE hands out.
     *
     * `meta/share.ts` has emitted `?daily=` since the rules were lifted and
     * `meta/route.ts` was written to read it back, and nothing in this body
     * ever did — so a player who shared their daily result handed out a link
     * that silently ignored the date and opened the front door of the
     * recipient's own world. Same shape as the four inert mechanics, on the
     * URL surface instead of a button.
     *
     * The seed is the DATE's, so the link opens the board it is talking about;
     * the kept run is that date's, which `readDailyRun` refuses to hand back
     * under any other date. It is not a DETOUR — a detour is a foreign world
     * seed that must not touch this device's world memory, and a daily is
     * already walled off by being a `Place` the keeper knows.
     */
    const opening = parseRoute(location.search).daily;
    const asked = opening !== null ? dailySeed(opening) : Number(params.get('seed') ?? '') || null;
    const saved = scripted ? null : opening !== null ? readDailyRun(opening) : readRun(slot);
    /*
     * The device's own world, minted here if this slot has never had one.
     *
     * It used to be `readWorld(slot)?.worldSeed ?? null`, falling through to
     * the literal `1` — so every phone that had never played opened on the
     * same board, and the world it later settled adopted whatever seed the run
     * happened to carry. `worldSeedFor` inverts that back to Ashwake 1's
     * order: the world is the place, and the run is played on it.
     */
    const mine = opening !== null ? null : worldSeedFor(slot);

    /*
     * Which world this page is opening on, in order of who outranks whom:
     * the URL, then the run this device left unfinished, then home.
     *
     * The URL first because a link is an explicit request and the only way
     * anyone plays somebody else's board. The saved run second, and it is the
     * reason this is a ladder rather than `asked ?? mine`: a run is saved
     * under the seed it was PLAYED on, and reloading a shared link has to pick
     * that same run back up rather than deal a fresh board on the same seed.
     * A run whose seed does not match what the page is opening is not
     * resumable here at all — that is a different world, and `kept` drops it.
     */
    const seed = asked ?? saved?.rootSeed ?? mine ?? 1;
    const kept = saved !== null && saved.rootSeed === seed ? saved : null;
    const detour = opening === null && mine !== null && seed !== mine;

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
      resume: kept,
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
      wakeAt:
        parseRoute(location.search).camp && kept === null && !detour && opening === null
          ? campFor(readWorld(slot))
          : null,
      /*
       * What crossing would carry, priced at the moment a fully-awake world's
       * shrine is reached — so the card's offer and the amount banked are the
       * same number by construction. Read through the session's OWN state
       * rather than a captured one, because the run has moved by then.
       */
      crossingCarries: () => {
        const world = readWorld(activeSlot());
        const here = made.get().state;
        return { dowry: dowryOf(world), carried: carriedBy(here, world) };
      },
    });
    // `?place=n` plays a fixed opening; `?end=1` plays a whole fixed run, so
    // the end screen can be looked at without playing for ten minutes.
    if (dial(params, 'end', 0) > 0) walkToEnd(made);
    else walk(made, Math.max(0, Math.trunc(dial(params, 'place', 0))));
    return made;
    // One session per run: language and direction change what it SAYS and how
    // it looks, never what it IS, so neither may restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const snap = useSession(session);
  const board = useRef<BoardHandle>(null);

  // Every state the reducer produces is offered to the keeper, which decides
  // when it actually reaches the disk — and refuses entirely once its session
  // is over. A finished run is CLEARED rather than kept, so BEGIN means begin.
  useEffect(() => {
    if (!snap.hud.ended) keeper.saveRun(snap.state);
  }, [snap.state, snap.hud.ended, keeper, slot]);

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
  const banked = useRef<GameState | null>(null);

  /**
   * This session's live copy of the world memory.
   *
   * A ref rather than state, and rather than a read per action: the world is
   * written by three separate seams now — the ground a run walks, the perk
   * shelf, and the settle that closes a run — and each of them hands the
   * keeper a WHOLE `WorldMemory`. Re-reading the disk for each would mean
   * decoding a blob carrying every hex the player has ever revealed, on every
   * tap; and two seams firing in one tick would each build from a copy that
   * predates the other, so whichever wrote second would silently undo the
   * first. One held object, and the seam that touches it last is the one the
   * keeper writes.
   *
   * Null means "not read yet, or a different world" — `worldHeld` decides by
   * SEED, exactly the way `settle`'s guard and `memoryFor` do.
   */
  const worldNow = useRef<WorldMemory | null>(null);
  const worldHeld = useCallback((seed: number): WorldMemory | null => {
    const held = worldNow.current;
    if (held !== null && held.worldSeed === seed) return held;
    const disk = readWorld(activeSlot());
    return disk !== null && disk.worldSeed === seed ? disk : null;
  }, []);
  const keepWorld = useCallback(
    (next: WorldMemory) => {
      worldNow.current = next;
      keeper.saveWorld(next);
    },
    [keeper],
  );
  /** A run is beginning somewhere else: let go, so nothing carries over. */
  const forgetWorld = useCallback(() => {
    worldNow.current = null;
  }, []);

  useEffect(() => {
    if (!snap.hud.ended || banked.current === snap.state) return;
    banked.current = snap.state;

    // A daily leaves two things behind rather than four — see `settleDaily`.
    if (daily !== null) {
      const after = settleDaily({
        date: daily,
        state: snap.state,
        hud: snap.hud,
        book: readDailyBook(),
        timeline: readTimeline(),
        at: Date.now(),
      });
      writeDailyBook(after.book);
      writeTimeline(after.timeline);
      clearDailyRun();
      return;
    }

    const picture = board.current?.snapshot() ?? null;
    setShot(picture);

    /*
     * What this run gained, measured against what it started with.
     *
     * Both are differences, and both have to be taken here: `progress.found`
     * has already grown by the time the end screen renders, and the world's
     * unlock ledger is about to be rewritten by `settle` below.
     */
    // The world as this run left it — the LIVE copy, not the disk's, because
    // the keeper's last write may still be pending and the shrines this run
    // woke are exactly what is being reported.
    const ending = worldHeld(snap.state.rootSeed);
    const wokeNow = unlockedBy(ending ?? newWorld(snap.state.rootSeed));
    setGained({
      perks: progress.found
        .filter((id) => !(startedFrom.current?.perks ?? []).includes(id))
        .map((id) => perkText(id, s).name),
      unlocks: wokeNow
        .filter((id) => !(startedFrom.current?.unlocks ?? []).includes(id))
        .map((id) => unlockLabel(id as UnlockId, s)),
    });

    const after = settle({
      state: snap.state,
      hud: snap.hud,
      slot,
      world: ending ?? readWorld(slot),
      records: readRecords(),
      timeline: readTimeline(),
      progress,
      at: Date.now(),
      ...(picture === null ? {} : { shot: picture }),
    });
    worldNow.current = after.world;
    keeper.saveWorld(after.world);
    keeper.flush();
    writeRecords(after.records);
    writeTimeline(after.timeline);
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
  }, [
    snap.hud.ended,
    snap.state,
    snap.hud,
    slot,
    daily,
    progress,
    keeper,
    setProgress,
    s,
    worldHeld,
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

  const look = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      tilt: dial(params, 'tilt', TILT),
      yaw: dial(params, 'yaw', YAW),
      relief: dial(params, 'relief', RELIEF),
      light: dial(params, 'light', LIGHT),
      materials: dial(params, 'materials', MATERIALS),
      art: dial(params, 'art', ART) > 0,
      // `?themes=1` puts a direction strip over the board — the workbench for
      // the one look question that is not a number. Off by default like every
      // other dial here.
      directions: dial(params, 'themes', 0) > 0,
    };
  }, []);

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
  const worlds = useDoor('worlds');

  // A door that shows a ledger has just asked for it, and so has a run that
  // ended. Anything else leaves the disk alone.
  const ledgers = useLedgers(`${fame.open}${shop.open}${worlds.open}${snap.hud.ended}`);
  const virgin = ledgers.timeline.length === 0 && progress.relics === 0;
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
      // happened yet.
      const poppedBefore = session.get().state.log.popped;
      const claimedBefore = session.get().state.claimed.length;
      session.dispatch(action);
      const now = session.get();

      /*
       * The board's voice, on the same seam the receipts use.
       *
       * One place knows what an action DID, so one place can sound it — the
       * alternative is a component watching for a change it did not cause.
       * Off unless the player asked (`ui.sound`), and the toggle's own tap is
       * the user gesture browsers require before any audio exists at all.
       */
      if (isEnabled(features, 'ui.sound')) {
        if (action.type === 'HARVEST' && now.state.log.popped > poppedBefore) {
          voice.pop(theme.voice, now.state.log.harvests.at(-1)?.count ?? 1);
        }
        if (now.state.claimed.length > claimedBefore) {
          const at = now.state.claimed.at(-1);
          const cell = at === undefined ? undefined : now.state.cells[at];
          if (cell?.kind === 'landmark') voice.claim(theme.voice, cell.reward);
        }
      }

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
      if (now.state.claimed.length > claimedBefore) {
        const at = now.state.claimed.at(-1);
        if (at !== undefined) board.current?.visit(at, CLAIM_HOLD_MS);

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
            setNote(s.ui.perkFound(perkText(got.perk.id, s).name));
          }
        }
      }

      const said = now.said;

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
            reachAtStart: startedFrom.current?.reach ?? 0,
            said: saidOnce.current,
          },
          s,
        );
        if (mark !== null) {
          saidOnce.current.add(mark.id);
          setNote(mark.text);
        }
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
      const first =
        action.type === 'HARVEST' &&
        poppedBefore === 0 &&
        (ledgers.records[ONLY_WORLD]?.tilesHarvests ?? 0) +
          (ledgers.records[ONLY_WORLD]?.pointsHarvests ?? 0) ===
          0;
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
          text: `${s.view.harvest.firstPop}

${said.text}

${s.view.harvest.firstPopWhen}`,
          card: true,
        };
        const wait = reducedMotion
          ? 0
          : cascadeMs(theme.motion, now.state.log.harvests.at(-1)?.count ?? 1);
        window.setTimeout(() => setSaidCard(shown), wait);
        return;
      }

      /*
       * A POP is a card — and after the first one, a BRIEF card.
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
       * thing you came to do. So every pop after the device's first is BRIEF —
       * same words, same place, no focus taken, any tap sends it away and it
       * leaves on its own. See `ui/Card.tsx`.
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
      if (said.card || isPop) {
        const wait =
          isPop && !reducedMotion
            ? cascadeMs(theme.motion, now.state.log.harvests.at(-1)?.count ?? 1)
            : 0;
        // A pop's OWN receipt goes brief; a claim that happened to land on the
        // same harvest (`said.card`) keeps its card, because that is the rare
        // thing and not the routine one.
        const shown = isPop ? { ...said, card: true, brief: !said.card } : said;
        if (wait === 0) setSaidCard(shown);
        else window.setTimeout(() => setSaidCard(shown), wait);
      } else setNote(said.text);
    },
    [session, ledgers, s, features, theme, progress, setProgress, reducedMotion, daily],
  );

  /**
   * What that hex is, in this run's numbers — the board answering a question.
   *
   * Lifted out of `onTap` (2026-08-29) because the keyboard asks it too: an
   * arrow key LOOKS and Enter ACTS, and the looking half is exactly this
   * sentence. One copy, so the two doors into the board cannot describe it
   * differently.
   */
  const describe = useCallback(
    (key: string): string => {
      const now = session.get();
      const memory = ledgers.worlds[slot]?.revealed;
      return describeHexOf(
        {
          state: now.state,
          theme,
          strings: s,
          // The same fact the session was built with — a run on somebody
          // else's seed has no ledger to describe.
          detour: session.detour,
          shrinesClaimed: now.state.log.questsDone,
          ...(memory === undefined ? {} : { memory }),
        },
        key,
      );
    },
    [session, s, theme, ledgers, slot],
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
      setNote(cell.ripe ? pocketNote(session.get().state, key, s) : describe(key));
    },
    [describe, session, s],
  );

  const onTap = useCallback(
    (key: string, cell: CellView): void => {
      const now = session.get();

      if (cell.ripe) {
        session.target(key);
        setNote(pocketNote(now.state, key, s));
        return;
      }

      if (cell.legal) {
        if (now.hud.draft.length === 0) {
          setNote(s.ui.handEmpty);
          return;
        }
        setNote(null);
        act({ type: 'PLACE', hex: key });
        return;
      }

      // Nothing to build on: the target lets go, and the tap becomes help.
      session.target(null);

      if (cell.remembered) {
        const known = rememberedNativeAt(now.state, key);
        if (known !== null && known !== lens) {
          setLens(known);
          session.spotlight(known);
          setNote(s.ui.lensOn(namesOf(theme, s.locale)[known]));
          return;
        }
        if (lens !== null) {
          setLens(null);
          session.spotlight(null);
          setNote(s.ui.lensOff);
          return;
        }
      }

      /*
       * A destination TAPPED opens the card that explains it.
       *
       * Marc, 2026-08-29: *"make sure we can click on the map for caches,
       * shrines, etc. and we get the card explaining what it is."* Tapping one
       * printed `describeHexOf` — what it is and what claiming pays, in this
       * run's numbers — into the toast, and that is the right sentence for
       * somebody who already knows what a cache IS. For anybody who does not,
       * a line of prose over the board answers a question they could not have
       * asked, and the manual was the only place that defined the word.
       *
       * Both now: the card explains the KIND, the toast carries this run's
       * numbers and is still there when the card is dismissed. The card is the
       * same one the glossary opens everywhere else, so a cache is defined in
       * exactly one place however you arrive at it.
       */
      if (cell.kind === 'landmark' && cell.landmark !== null) {
        setTerm(LESSON_FOR_REWARD[cell.landmark]);
      }
      setNote(describe(key));
    },
    [act, session, s, theme, lens, describe],
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
        setNote(colourLesson(card.colour, snap.state.tuning, theme, s));
        return;
      }
      session.dispatch({ type: 'SELECT', index });
    },
    [session, snap.hud.draft, snap.state.tuning, theme, s],
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
        setNote(snap.hud.held[slot] === undefined ? s.ui.holdNothing : s.ui.holdTrades);
        return;
      }
      act({ type: 'HOLD', slot });
    },
    [act, snap.hud.draft.length, snap.hud.held, s],
  );

  /**
   * Hand this run to somebody — the game's entire distribution mechanism.
   *
   * A daily and a world run share nothing but the verb: the daily's line is a
   * scoreboard entry that carries its DATE, so the receiver plays the same
   * board, and a world run carries its SEED. `shareOf` writes both; this only
   * decides which one this run is and hands over the numbers.
   */
  const onShare = useCallback((): Promise<ShareResult> => {
    const arc = arcSparkline(snap.state.log.harvests);
    const subject: ShareSubject =
      daily === null
        ? {
            kind: 'run',
            points: snap.hud.points,
            placements: snap.hud.placements,
            seed: snap.state.rootSeed,
            arc,
          }
        : {
            kind: 'daily',
            date: daily,
            points: snap.hud.points,
            reach: snap.hud.depthValue,
            arc,
            // The try this was, confessed rather than hidden — the daily's own
            // honesty rule. Read after settling, so it counts this run.
            tries: readDailyBook()[daily]?.tries ?? 1,
          };
    return share(subject, s, NAME);
  }, [snap.state, snap.hud, daily, s]);

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
    const seed = Math.floor(Math.random() * 2 ** 31);
    const after = cross({
      state: snap.state,
      world: ledgers.worlds[slot],
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

    setSaidCard(null);
    banked.current = snap.state;
    // The world it crosses INTO — freshly minted, so no shrine is woken there
    // yet, but the purse and the perks it carried come with it.
    session.restart(seed, null, undefined, economyAt(slot, seed));
    setLens(null);
    setStarted(true);
  }, [snap.state, ledgers, slot, progress, setProgress, keeper, keepWorld, session]);

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
      setDaily(null);
      setGoals([]);
      saidOnce.current = new Set();
      startedFrom.current = startsFrom(activeSlot(), progress.found);

      banked.current = null;
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
      session.restart(seed, null, memoryFor(at, seed), economyAt(at, seed), wakeAt);
      setLens(null);
    },
    [session, setDaily, progress.found, startsFrom],
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
    startRun(where);
    worlds.hide();
    more.hide();
    setStarted(true);
  }, [startRun, worlds, more]);

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
  const today = useMemo(() => localToday(), []);
  const enterDaily = useCallback(() => {
    setDaily(today);
    // A daily has no world memory at all. Letting go here means the held copy
    // cannot be merged into by a board the world never walked.
    forgetWorld();
    // No ledger, so no unlocks and no relics — and its shrines are rewritten
    // into caches and sites, because a door that opens nothing is worse than
    // no door at all.
    session.restart(
      dailySeed(today),
      readDailyRun(today),
      undefined,
      economyFor({ kind: 'daily' }),
    );
    setLens(null);
    banked.current = null;
    worlds.hide();
    more.hide();
    setStarted(true);
  }, [session, setDaily, today, worlds, more, forgetWorld]);

  const enterWorld = useCallback(
    (next: Slot) => {
      const kept = readRun(next);
      setDaily(null);
      setSlot(next);
      // Another world entirely: the held copy is the one being left.
      forgetWorld();
      saidOnce.current = new Set();
      startedFrom.current = startsFrom(next, progress.found);
      // The world being entered, on the world's own seed — everything else
      // here already reads `readWorld(next)`, and the seed was the one field
      // that did not, so stepping from world 1 to world 2 changed the name on
      // the door and not the ground behind it.
      const seed = worldSeedFor(next);
      session.restart(seed, kept, memoryFor(next, seed), economyAt(next, seed));
      setLens(null);
      banked.current = null;
      worlds.hide();
      more.hide();
      setStarted(true);
    },
    [session, setSlot, setDaily, worlds, more, progress.found, forgetWorld, startsFrom],
  );

  const playing = started && !snap.hud.ended;

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
  const { next: nextView, step: cycleView } = useCameraCycle(board, snap.state.lastPlaced ?? null);

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
        setNote(null);
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
            onTap(aim.key, aim.cell);
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
  ]);

  return (
    <div className="shell" lang={s.locale}>
      {playing && <Hud hud={snap.hud} s={s} onNote={setNote} />}

      <div className="board-host" {...(anyOpen || !started ? { inert: true } : {})}>
        <Board
          view={snap.board}
          theme={theme}
          popped={snap.popped}
          tilt={look.tilt}
          yaw={look.yaw}
          relief={look.relief}
          light={look.light}
          materials={look.materials}
          art={look.art}
          reducedMotion={reducedMotion}
          onTap={onTap}
          handle={board}
          label={s.ui.board.label}
          keyHelp={s.ui.board.reach}
        />
        {look.directions && <Directions s={s} stored={storedTheme} onTheme={setStoredTheme} />}
        {playing && (
          <Camera
            s={s}
            next={nextView}
            onCycle={cycleView}
            onHelp={() => manual.show()}
            sound={isEnabled(features, 'ui.sound')}
            onSound={() => setSound(!isEnabled(features, 'ui.sound'))}
          />
        )}
      </div>

      {playing && (
        <>
          {/* Two live regions: what just happened, and what to do next. The
              stat row is deliberately neither. */}
          {/*
            The toast stays a `<p>` and does not become a button, on purpose.
            A live region has to be on the page BEFORE its text changes or
            nothing announces it, and an element that appears and disappears
            with the note is an element half of the readers here would miss.
            Its dismissal is a tap, as it always was, and now also Escape when
            nothing is open — which is the keyboard's way to the same gesture.
          */}
          <p className="toast" role="status" aria-live="polite" onClick={() => setNote(null)}>
            {note}
          </p>
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

            `hud.guide` stays computed and stays in `view/`: it is the same
            sentence a screen reader gets from the toast when something
            happens, and the day this game wants a coaching mode it is there
            without being invented again.
          */}
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
            // The burn is only offered once relics mean something — see
            // SACRIFICE in `ActionBar`.
            knowsRelics={hasMet(progress, 'relic')}
            onHarvest={onHarvest}
            onPurse={() => {
              const opening = !purseOpen;
              setPurseOpen((was) => !was);
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
               * is exactly what `SaidCard` takes. Never brief: it is read once
               * ever, and it is a list.
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
            }}
            purseOpen={purseOpen}
            onNewRun={newRun}
          />
        </>
      )}

      {/*
        The door and the end screen are SCENES, in the same sense the board is:
        they fill the screen, they are what the game is currently showing, and a
        panel opens OVER them. So they are inert while one is — otherwise focus
        and taps reach a screen the player cannot see, which is the half of the
        stacking bug that a z-index alone does not fix.
      */}
      {started && snap.hud.ended && (
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
            shot={shot}
            newPerks={gained.perks}
            newUnlocks={gained.unlocks}
            onMainMenu={toMainMenu}
          />
        </div>
      )}

      {!started && (
        <div className="scene" {...(anyOpen ? { inert: true } : {})}>
          <FrontDoor
            s={s}
            resuming={snap.hud.placements > 0 && !snap.hud.ended}
            onBegin={() => setStarted(true)}
            onHowToPlay={() => manual.show()}
            onSettings={() => settings.show()}
            onMore={() => more.show()}
            onDaily={enterDaily}
            themeId={theme.id}
            dailyBadge={dailyBadge(readDailyBook(), today, s)}
          />
        </div>
      )}

      {manual.open && (
        <Manual
          theme={theme}
          s={s}
          keyboard={keyboard}
          onBack={manual.hide}
          menu={
            <PanelMenu>
              {/* Named the way every other way into a room is named. These two
                  are the ONLY doors in the game that had no `data-go`, which
                  is why nothing had ever walked from the board into SETTINGS:
                  a control a test cannot address is a control no test
                  addresses. */}
              <button type="button" data-go="more" onClick={() => more.show()}>
                {s.ui.more}
              </button>
              <button type="button" data-go="settings" onClick={() => settings.show()}>
                {s.ui.settings}
              </button>
              <Confirming
                label={s.ui.restart}
                armed={`${s.ui.restart}?`}
                onConfirm={() => {
                  newRun();
                  manual.hide();
                }}
              />
            </PanelMenu>
          }
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
            else setFeature(id, on);
          }}
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
          onBack={more.hide}
          onHowToPlay={() => manual.show()}
          onFame={() => fame.show()}
          onSettings={() => settings.show()}
          onShop={() => shop.show()}
          onWorlds={() => worlds.show()}
          onDaily={enterDaily}
          onReset={() => {
            clearEverything();
            // Including the world this session was holding: an erased device
            // that kept a merged world in a ref would write it straight back.
            forgetWorld();
            // The one place a reload would be honest — and it still is not one.
            // Everything erased is everything this shell was showing, so the
            // shell goes back to what a phone that has never played looks like.
            setProgress(() => EMPTY_PROGRESS);
            // Every world is gone, so this mints one — the same door a phone
            // that has never played comes through.
            {
              const at = activeSlot();
              const fresh = worldSeedFor(at);
              session.restart(fresh, null, undefined, economyAt(at, fresh));
            }
            banked.current = null;
            more.hide();
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
        <Fame timeline={ledgers.timeline} records={ledgers.records} s={s} onBack={fame.hide} />
      )}

      {updated && (
        <p className="toast update" aria-live="polite">
          <button type="button" data-action="update" onClick={() => location.reload()}>
            {s.ui.newVersion}
          </button>
        </p>
      )}

      {saidCard !== null && (
        <SaidCard
          // Keyed per utterance so a second pop is a second card: a brief one
          // runs a clock of its own, and a reused element would inherit the
          // remains of the previous card's.
          key={saidCard.id}
          text={saidCard.text}
          rows={saidCard.rows}
          theme={theme}
          s={s}
          onTerm={setTerm}
          onDismiss={() => setSaidCard(null)}
          brief={saidCard.brief === true}
          icon={saidCard.icon}
          {...(saidCard.offers === 'crossing'
            ? {
                offer: {
                  label: s.claim.crossLabel(carriedBy(snap.state, ledgers.worlds[slot])),
                  armed: s.claim.crossArmed,
                  onTake: takeCrossing,
                },
              }
            : {})}
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
      {card !== null && saidCard === null && (
        <LessonCard
          id={card}
          theme={theme}
          s={s}
          // FIRED by a moment, so it carries the lesson's first-contact
          // sentence. The term card below is OPENED by a tap on a word and
          // does not: that reader already met the concept.
          firstContact
          dismiss={s.ui.gotIt}
          onDismiss={() => setProgress((p) => told(p, card))}
        />
      )}

      {term !== null && (
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
