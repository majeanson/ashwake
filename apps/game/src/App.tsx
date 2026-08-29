import { useMemo, useRef, type CSSProperties } from 'react';
import { pickLocale } from '@content/locale';
import { NAME } from '@meta/identity';
import type { CellView } from '@render/Renderer';
import { stringsFor } from '@text/index';
import { parseThemeId, resolveTheme } from '@theme/index';
import { hex as cssHex, namesOf } from '@theme/tokens';
import { Board, type BoardHandle } from './board/Board';
import { createSession, useSession } from './shell/store';
import { walk } from './shell/walk';

/**
 * Stage 2's App: the board, playable, and the LEAST chrome that lets a run be
 * played end to end so the board can be tested — a stat row, the hand, one
 * POP button, the camera buttons. All of it is replaced by Stage 3's chrome;
 * none of it is styled beyond legibility on purpose.
 *
 * The board's three look dials are read off the query string so an angle can
 * be argued with by looking at it: `?tilt=` leans the camera back (35 by
 * default — Marc's pick from `docs/shots/`), `?yaw=` turns the board under it,
 * `?relief=` gives the ground its height, `?light=` shades it. Each zero is the flat map
 * Stage 2 shipped, and none of them can reach a rule. `?seed=` picks a world;
 * `?theme=` a direction, as in Ashwake 1; `?place=` plays a fixed opening so
 * two angles can be photographed over one board.
 */

/** The default lean: Marc chose the tilt by looking, the rest are open. */
const TILT = 35;
const YAW = 0;
const RELIEF = 0;
const LIGHT = 0;

/** A number off the query string, where zero is a real answer and `?x=` alone
 *  or a word is not — so `?tilt=0` gives the map back rather than the default. */
function dial(params: URLSearchParams, name: string, fallback: number): number {
  const raw = params.get(name);
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}
export function App() {
  const session = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const seed = Number(params.get('seed') ?? '1') || 1;
    const made = createSession({
      seed,
      theme: resolveTheme(parseThemeId(location.search)),
      strings: stringsFor(pickLocale(navigator.languages)),
    });
    // `?place=n` plays a fixed opening, so two screenshots of two camera
    // angles are two pictures of ONE board. Off unless asked for.
    walk(made, Math.max(0, Math.trunc(dial(params, 'place', 0))));
    return made;
  }, []);
  const snap = useSession(session);
  const board = useRef<BoardHandle>(null);
  const s = session.strings;
  const theme = session.theme;
  const names = namesOf(theme, s.locale);
  const look = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      tilt: dial(params, 'tilt', TILT),
      yaw: dial(params, 'yaw', YAW),
      relief: dial(params, 'relief', RELIEF),
      light: dial(params, 'light', LIGHT),
    };
  }, []);

  const onTap = (key: string, cell: CellView): void => {
    if (cell.legal) session.dispatch({ type: 'PLACE', hex: key });
    else if (cell.ripe) session.target(key);
    else session.target(null);
  };

  const ink = cssHex(theme.ink.ink);
  const panel = cssHex(theme.ink.panel);
  const row: CSSProperties = {
    display: 'flex',
    gap: '0.4rem',
    padding: '0.4rem',
    background: panel,
    color: ink,
    fontFamily: 'system-ui',
    alignItems: 'center',
    flexWrap: 'wrap',
  };
  const button: CSSProperties = {
    minHeight: 44,
    minWidth: 44,
    padding: '0 0.6rem',
    background: 'transparent',
    color: ink,
    border: `1px solid ${cssHex(theme.ink.panelEdge)}`,
    borderRadius: 6,
    fontFamily: 'system-ui',
    fontSize: 14,
  };

  return (
    <div
      lang={s.locale}
      style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column' }}
    >
      <div style={row} data-hud="stats">
        <strong>{NAME} 2</strong>
        <span data-stat="tiles">
          {s.locale === 'fr-CA' ? 'TUILES' : 'TILES'} <b className="stat-value">{snap.hud.tiles}</b>
        </span>
        <span data-stat="points">
          PTS <b className="stat-value">{snap.hud.points}</b>
        </span>
        <span data-stat="reach">
          ↗ <b className="stat-value">{snap.hud.depthValue}</b>
        </span>
        <span data-stat="cost">
          $ <b className="stat-value">{snap.hud.cost}</b>
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <button style={button} onClick={() => board.current?.zoomBy(1.4)}>
            +
          </button>
          <button style={button} onClick={() => board.current?.zoomBy(1 / 1.4)}>
            −
          </button>
          <button style={button} onClick={() => board.current?.flyToFit()}>
            FIT
          </button>
        </span>
      </div>
      <div style={{ position: 'relative', flex: 1 }}>
        <Board
          view={snap.board}
          theme={theme}
          popped={snap.popped}
          tilt={look.tilt}
          yaw={look.yaw}
          relief={look.relief}
          light={look.light}
          onTap={onTap}
          handle={board}
        />
      </div>
      <div style={row} data-hud="hand">
        {snap.hud.draft.map((card, i) => (
          <button
            key={card.id}
            data-card={i}
            style={{
              ...button,
              borderColor: cssHex(theme.terrain[card.colour].fill),
              borderWidth: card.selected ? 3 : 1,
              background: card.selected ? cssHex(theme.terrain[card.colour].fill) : 'transparent',
            }}
            onClick={() => session.dispatch({ type: 'SELECT', index: i })}
          >
            {names[card.colour]}
            {card.rarity === 'common' ? '' : ' ✦'}
          </button>
        ))}
        {snap.hud.canHarvest && (
          <button
            data-action="pop"
            style={{ ...button, marginLeft: 'auto', fontWeight: 700 }}
            onClick={() => {
              session.dispatch({
                type: 'HARVEST',
                choice: 'tiles',
                ...(snap.hud.harvestAt === null ? {} : { at: snap.hud.harvestAt }),
              });
            }}
          >
            {s.ui.pop} +{snap.hud.harvestTiles} · {snap.hud.harvestPoints} pts
          </button>
        )}
        {snap.hud.ended && (
          <button
            data-action="new-run"
            style={{ ...button, marginLeft: 'auto' }}
            onClick={() => session.restart(Math.floor(Math.random() * 2 ** 31))}
          >
            {s.ui.newRun}
          </button>
        )}
      </div>
      {snap.hud.guide !== null && (
        <div style={{ ...row, fontSize: 13 }} data-hud="guide">
          {snap.hud.guide}
        </div>
      )}
    </div>
  );
}
