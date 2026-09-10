import type { Strings } from '@text/Strings';
import { Confirming } from '../ui/Confirming';
import { Icon } from '../ui/Icon';
import { Panel, PanelMenu } from '../ui/Panel';

/**
 * MENU — the one door to everything that is not the run (Stage 4, 2026-08-29;
 * made the ONLY one, 2026-09-03; layered 2026-09-08).
 *
 * Titled MORE and reached from a `more.show()` call whose name outlived it:
 * this used to be one of at least three overlapping lists a player could
 * land on looking for the same handful of things — the front door had its
 * own direct HOW TO PLAY / SETTINGS buttons, the board's floating MENU
 * button opened a SEPARATE drawer with its own row set (`Menu.tsx`'s
 * `QuickMenu`, now retired), and the manual's own default tab was a third,
 * smaller copy of this same list. Every one of those is gone; this is the
 * one panel the front door's MENU button, the board's MENU button and the
 * end screen's MENU button all open, by the same name, with the same rows.
 *
 * ## And then it was ten rows in a column (2026-09-08)
 *
 * Marc: *"overall there is too much buttons, need to layerize things
 * properly"*. Every row here arrived for a good reason and each was added
 * where the last one ended, so what a player met was the panel's own history
 * in order — SOUND, THE STORY, HOW TO PLAY, DAILY, MY WORLDS, THE SHOP, HALL
 * OF FAME, SETTINGS, RESTART, THIS DEVICE — and nothing said which of those
 * were the same KIND of thing.
 *
 * Three groups, and they are the three questions somebody opens this panel
 * with:
 *
 *   - **PLAY** — where do I go. The three doors into a game.
 *   - **YOUR RECORD** — what have I done. Both are hidden on a virgin device,
 *     so the heading goes with them: a group heading over nothing is worse
 *     than no heading.
 *   - **THIS DEVICE** — what is this phone set to. SOUND, because it is a
 *     property of the phone rather than a move in the game; SETTINGS, which
 *     now holds THE STORY, the sharpness dial and the door to the device room
 *     it used to sit beside; and RESTART, which is the one destructive thing
 *     left at this level and keeps its own confirmation.
 *
 * **THE STORY and THIS DEVICE moved into SETTINGS.** The argument that put
 * THIS DEVICE last and alone — `More.tsx`, Stage 4: *"a player looking for the
 * manual should never be one mis-tap from erasing three worlds"* — is
 * unchanged and is better served by a door two levels down than by a row at
 * the bottom of the list every player scrolls past.
 */

type MoreProps = {
  readonly s: Strings;
  readonly virgin: boolean;
  readonly sound: boolean;
  readonly onSound: () => void;
  readonly onBack: () => void;
  readonly onHowToPlay: () => void;
  readonly onFame: () => void;
  readonly onSettings: () => void;
  readonly onShop: () => void;
  readonly onWorlds: () => void;
  readonly onDaily: () => void;
  readonly onRestart: () => void;
};

export function More({
  s,
  virgin,
  sound,
  onSound,
  onBack,
  onHowToPlay,
  onFame,
  onSettings,
  onShop,
  onWorlds,
  onDaily,
  onRestart,
}: MoreProps) {
  return (
    <Panel id="more" title={s.ui.menu} back={s.ui.back} closeAll={s.ui.closeAll} onBack={onBack}>
      <section>
        <h2 className="fact-label">{s.ui.menuGroups.play}</h2>
        <PanelMenu>
          <button type="button" data-go="manual" onClick={onHowToPlay}>
            {s.ui.howToPlay}
          </button>
          <button type="button" data-go="daily" onClick={onDaily}>
            {s.ui.daily}
          </button>
          <button type="button" data-go="worlds" onClick={onWorlds}>
            {s.ui.worlds}
          </button>
        </PanelMenu>
      </section>

      {/* Both rows are a record of runs that have happened, so a device with
          none of them gets no empty heading either. */}
      {!virgin && (
        <section>
          <h2 className="fact-label">{s.ui.menuGroups.record}</h2>
          <PanelMenu>
            <button type="button" data-go="shop" onClick={onShop}>
              {s.ui.shop}
            </button>
            <button type="button" data-go="fame" onClick={onFame}>
              {s.ui.fame.title}
            </button>
          </PanelMenu>
        </section>
      )}

      <section>
        <h2 className="fact-label">{s.ui.menuGroups.device}</h2>
        <PanelMenu>
          <button
            type="button"
            data-go="sound"
            aria-pressed={sound}
            aria-label={sound ? s.ui.soundOn : s.ui.soundOff}
            onClick={onSound}
          >
            <Icon name={sound ? 'soundOn' : 'soundOff'} />
            <span>{s.ui.sound}</span>
          </button>
          <button type="button" data-go="settings" onClick={onSettings}>
            {s.ui.settings}
          </button>
          {/* Moved in from the manual's own retired MENU tab — it had no other
              door. Its own confirmation, since it throws a live run away. */}
          <Confirming label={s.ui.restart} armed={s.ui.restartArmed} onConfirm={onRestart} />
        </PanelMenu>
      </section>
    </Panel>
  );
}
