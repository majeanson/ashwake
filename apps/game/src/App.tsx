import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Colour } from '@content/tuning';
import { dailyBadge, dailySeed } from '@meta/daily';
import type { GameState } from '@engine/state';
import type { CellView } from '@render/Renderer';
import { EMPTY_PROGRESS, meet, TEACH_IDS, type Progress } from '@meta/progress';
import { stringsFor } from '@text/index';
import { AUTO_THEME_ID, parseThemeId, pickForScheme, resolveTheme } from '@theme/index';
import type { LessonId } from '@view/lessons';
import { Board, type BoardHandle } from './board/Board';
import { ActionBar } from './screens/ActionBar';
import { Camera } from './screens/Camera';
import { EndScreen } from './screens/EndScreen';
import { FrontDoor } from './screens/FrontDoor';
import { Hud } from './screens/Hud';
import { LessonCard } from './screens/LessonCard';
import { Fame } from './screens/Fame';
import { Manual } from './screens/Manual';
import { More } from './screens/More';
import { Purse } from './screens/Purse';
import { Settings } from './screens/Settings';
import { Shop } from './screens/Shop';
import { Worlds } from './screens/Worlds';
import {
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
  writeRecords,
  writeTimeline,
  type Slot,
} from './shell/storage';
import { useLedgers } from './shell/ledgers';
import { registerWorker } from './shell/worker';
import { settle, settleDaily } from './shell/settle';
import { createSession, useSession } from './shell/store';
import { useDevice } from './shell/useDevice';
import { nextLesson, told } from './shell/teaching';
import { walk, walkToEnd } from './shell/walk';
import { Confirming } from './ui/Confirming';
import { DialogStack, useAnyDialogOpen, useDoor } from './ui/dialog';
import { PanelMenu } from './ui/Panel';
import { useThemeVars } from './ui/theme';
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
 * by looking: `?tilt=`, `?yaw=`, `?relief=`, `?light=`, `?materials=`, `?art=`.
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

/** A number off the query string, where zero is a real answer and `?x=` alone
 *  or a word is not — so `?tilt=0` gives the map back rather than the default. */
function dial(params: URLSearchParams, name: string, fallback: number): number {
  const raw = params.get(name);
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function App() {
  return (
    <DialogStack>
      <Game />
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
 */
function overrides(): Parameters<typeof useDevice>[0] {
  const params = new URLSearchParams(location.search);
  const theme = parseThemeId(location.search);
  const taught = dial(params, 'taught', 0) > 0;
  return {
    ...(theme === null ? {} : { theme }),
    ...(taught
      ? { progress: TEACH_IDS.reduce<Progress>((p, id) => meet(p, id), EMPTY_PROGRESS) }
      : {}),
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
  const theme = useMemo(() => {
    if (storedTheme !== AUTO_THEME_ID) return resolveTheme(storedTheme);
    // AUTO is the absence of a choice — what a fresh phone is set to — so the
    // device answers. `pickForScheme` is pure because the shell samples.
    return resolveTheme(
      pickForScheme(
        matchMedia('(prefers-color-scheme: light)').matches,
        matchMedia('(prefers-contrast: more)').matches,
      ),
    );
  }, [storedTheme]);
  useThemeVars(theme);

  const session = useMemo(() => {
    const params = new URLSearchParams(location.search);
    // A run this device left behind is resumed as the very object the reducer
    // left, not re-simulated — a replayed run is a run that can disagree with
    // the one that was played. A shot query means a fresh board every time.
    const scripted = dial(params, 'place', 0) > 0 || dial(params, 'end', 0) > 0;
    const made = createSession({
      seed: Number(params.get('seed') ?? '1') || 1,
      theme,
      strings: s,
      resume: scripted ? null : readRun(slot),
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

    const after = settle({
      state: snap.state,
      hud: snap.hud,
      slot,
      world: readWorld(slot),
      records: readRecords(),
      timeline: readTimeline(),
      progress,
      at: Date.now(),
    });
    keeper.saveWorld(after.world);
    keeper.flush();
    writeRecords(after.records);
    writeTimeline(after.timeline);
    clearRun(slot);
  }, [snap.hud.ended, snap.state, snap.hud, slot, daily, progress, keeper]);
  const look = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      tilt: dial(params, 'tilt', TILT),
      yaw: dial(params, 'yaw', YAW),
      relief: dial(params, 'relief', RELIEF),
      light: dial(params, 'light', LIGHT),
      materials: dial(params, 'materials', MATERIALS),
      art: dial(params, 'art', ART) > 0,
    };
  }, []);

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

  const onTap = useCallback(
    (key: string, cell: CellView): void => {
      if (cell.legal) session.dispatch({ type: 'PLACE', hex: key });
      else if (cell.ripe) session.target(key);
      else session.target(null);
    },
    [session],
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
  const [lens, setLens] = useState<Colour | null>(null);
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
      session.dispatch({ type: 'HOLD', slot });
    },
    [session, snap.hud.draft.length, snap.hud.held, s],
  );

  const newRun = useCallback(() => {
    setDaily(null);
    banked.current = null;
    session.restart(Math.floor(Math.random() * 2 ** 31));
    setLens(null);
  }, [session, setDaily]);

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
    session.restart(dailySeed(today), readDailyRun(today));
    setLens(null);
    banked.current = null;
    worlds.hide();
    more.hide();
    setStarted(true);
  }, [session, setDaily, today, worlds, more]);

  const enterWorld = useCallback(
    (next: Slot) => {
      const kept = readRun(next);
      setDaily(null);
      setSlot(next);
      session.restart(Math.floor(Math.random() * 2 ** 31), kept);
      setLens(null);
      banked.current = null;
      worlds.hide();
      more.hide();
      setStarted(true);
    },
    [session, setSlot, setDaily, worlds, more],
  );

  const playing = started && !snap.hud.ended;

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
          onTap={onTap}
          handle={board}
        />
        {playing && (
          <Camera
            board={board}
            s={s}
            here={snap.state.lastPlaced ?? null}
            onHelp={() => manual.show()}
          />
        )}
      </div>

      {playing && (
        <>
          {/* Two live regions: what just happened, and what to do next. The
              stat row is deliberately neither. */}
          <p className="toast" aria-live="polite" onClick={() => setNote(null)}>
            {note}
          </p>
          {snap.hud.guide !== null && (
            <p className="hint" aria-live="polite" data-hud="guide">
              {snap.hud.guide}
            </p>
          )}
          {purseOpen && (
            <Purse
              hud={snap.hud}
              theme={theme}
              s={s}
              onSpend={(spend) =>
                session.dispatch(
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
            onSelect={(index) => session.dispatch({ type: 'SELECT', index })}
            onLens={onLens}
            onHold={onHold}
            onHarvest={(choice) =>
              session.dispatch({
                type: 'HARVEST',
                choice,
                ...(snap.hud.harvestAt === null ? {} : { at: snap.hud.harvestAt }),
              })
            }
            onPurse={() => {
              setPurseOpen((was) => !was);
              // The purse teaches on the first deliberate OPEN rather than on
              // having one: a lesson about spending is no use before there is
              // anything to spend it on.
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
            harvests={snap.state.log.harvests
              .filter((h) => h.choice !== 'burn' && h.choice !== 'treasure')
              .map((h) => h.points)}
            s={s}
            theme={theme}
            progress={progress}
            onTerm={setTerm}
            onNewRun={newRun}
            onProgress={setProgress}
            onMore={() => more.show()}
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
            dailyBadge={dailyBadge(readDailyBook(), today, s)}
          />
        </div>
      )}

      {manual.open && (
        <Manual
          theme={theme}
          s={s}
          onBack={manual.hide}
          onTerm={setTerm}
          menu={
            <PanelMenu>
              <button type="button" onClick={() => more.show()}>
                {s.ui.more}
              </button>
              <button type="button" onClick={() => settings.show()}>
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
          onFeature={setFeature}
          onResetTeaching={() => setProgress(() => EMPTY_PROGRESS)}
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
            // The one place a reload would be honest — and it still is not one.
            // Everything erased is everything this shell was showing, so the
            // shell goes back to what a phone that has never played looks like.
            setProgress(() => EMPTY_PROGRESS);
            session.restart(Math.floor(Math.random() * 2 ** 31));
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

      {card !== null && (
        <LessonCard
          id={card}
          theme={theme}
          s={s}
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
