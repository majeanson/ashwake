import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Manual } from './screens/Manual';
import { Purse } from './screens/Purse';
import { Settings } from './screens/Settings';
import { clearRun, readRun } from './shell/storage';
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
    keeper,
  } = useDevice(overrides());

  const [started, setStarted] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [purseOpen, setPurseOpen] = useState(false);
  const [term, setTerm] = useState<LessonId | null>(null);

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
    if (snap.hud.ended) clearRun(slot);
    else keeper.saveRun(snap.state);
  }, [snap.state, snap.hud.ended, keeper, slot]);
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

  const newRun = useCallback(() => {
    session.restart(Math.floor(Math.random() * 2 ** 31));
  }, [session]);

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
            onLens={() => undefined}
            onHarvest={(choice) =>
              session.dispatch({
                type: 'HARVEST',
                choice,
                ...(snap.hud.harvestAt === null ? {} : { at: snap.hud.harvestAt }),
              })
            }
            onSpend={() => undefined}
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

      {started && snap.hud.ended && (
        <EndScreen hud={snap.hud} s={s} onTerm={setTerm} onNewRun={newRun} />
      )}

      {!started && (
        <FrontDoor
          s={s}
          resuming={snap.hud.placements > 0 && !snap.hud.ended}
          onBegin={() => setStarted(true)}
          onHowToPlay={() => manual.show()}
          onSettings={() => settings.show()}
        />
      )}

      {manual.open && (
        <Manual
          theme={theme}
          s={s}
          onBack={manual.hide}
          onTerm={setTerm}
          menu={
            <PanelMenu>
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
